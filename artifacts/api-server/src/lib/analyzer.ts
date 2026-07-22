/**
 * AI clause analysis pipeline.
 * Uses Groq (Llama 3.3 70B) when GROQ_API_KEY is set; falls back to
 * rule-based heuristics otherwise.
 */

import Groq from "groq-sdk";
import { logger } from "./logger";

export interface AnalyzedClause {
  text: string;
  categoryTag: string;
  riskLevel: "safe" | "caution" | "red_flag";
  explanation: string;
  negotiationPrompt: string | null;
  positionStart: number;
  positionEnd: number;
}

// ── CUAD-derived category taxonomy ────────────────────────────────────────────

const CUAD_CATEGORIES = [
  "Automatic Renewal",
  "Price Change",
  "Cancellation Policy",
  "Limitation of Liability",
  "Governing Law / Jurisdiction",
  "Arbitration / Dispute Resolution",
  "Data Collection / Privacy",
  "Intellectual Property",
  "Indemnification",
  "Termination",
  "Payment Terms",
  "Late Fees / Penalties",
  "Security Deposit",
  "Maintenance & Repairs",
  "Subletting",
  "Force Majeure",
  "Warranty Disclaimer",
  "Non-Compete / Exclusivity",
  "Assignment",
  "General Terms",
];

// ── Rule-based fallback ───────────────────────────────────────────────────────

const RED_FLAG_PATTERNS = [
  /auto.?renew/i, /automatically renew/i, /price.{0,20}increase/i,
  /rate.{0,20}change/i, /sole discretion/i, /without notice/i,
  /waive.{0,20}right/i, /arbitration/i, /class action/i, /indemnif/i,
  /unlimited liability/i, /non.?refundable/i, /no refund/i,
  /irrevocable/i, /perpetual license/i, /unilateral/i,
  /modify.{0,30}any time/i, /change.{0,30}any time/i,
];

const CAUTION_PATTERNS = [
  /termination/i, /cancel/i, /limitation of liability/i, /as.is/i,
  /no warrant/i, /disclaimer/i, /governing law/i, /jurisdiction/i,
  /attorney.{0,10}fee/i, /late fee/i, /penalty/i, /damage/i,
  /security deposit/i, /subletting/i, /assignment/i,
  /intellectual property/i, /data.{0,20}collect/i, /personal.{0,20}information/i,
];

function detectCategory(text: string): string {
  const lower = text.toLowerCase();
  if (/auto.?renew|automatically renew/.test(lower)) return "Automatic Renewal";
  if (/price|rate|fee|cost|charge/.test(lower) && /increase|change|adjust/.test(lower)) return "Price Change";
  if (/cancel|termination/.test(lower)) return "Cancellation Policy";
  if (/liability|damages/.test(lower)) return "Limitation of Liability";
  if (/govern|jurisdiction|applicable law/.test(lower)) return "Governing Law / Jurisdiction";
  if (/arbitration|dispute/.test(lower)) return "Arbitration / Dispute Resolution";
  if (/data|privacy|personal information|collect/.test(lower)) return "Data Collection / Privacy";
  if (/intellectual property|copyright|patent|trademark/.test(lower)) return "Intellectual Property";
  if (/indemnif/.test(lower)) return "Indemnification";
  if (/terminat/.test(lower)) return "Termination";
  if (/payment|pay|invoice|billing/.test(lower)) return "Payment Terms";
  if (/late fee|penalty|interest/.test(lower)) return "Late Fees / Penalties";
  if (/security deposit/.test(lower)) return "Security Deposit";
  if (/repair|maintain|maintenance/.test(lower)) return "Maintenance & Repairs";
  if (/sublet|sublease|subletting/.test(lower)) return "Subletting";
  return "General Terms";
}

function detectRisk(text: string): "safe" | "caution" | "red_flag" {
  for (const p of RED_FLAG_PATTERNS) if (p.test(text)) return "red_flag";
  for (const p of CAUTION_PATTERNS) if (p.test(text)) return "caution";
  return "safe";
}

function ruleExplanation(text: string, riskLevel: "safe" | "caution" | "red_flag", categoryTag: string): string {
  const lower = text.toLowerCase();
  if (riskLevel === "red_flag") {
    if (/auto.?renew/.test(lower)) return "This clause automatically renews your contract without explicit consent. Mark your calendar or it will roll over.";
    if (/price.{0,20}increase|rate.{0,20}change/.test(lower)) return "The other party can raise prices at their discretion. Watch for notices and check cancellation windows.";
    if (/sole discretion/.test(lower)) return "One party has unilateral power to make decisions without needing your agreement. Potentially open-ended exposure.";
    if (/waive.{0,20}right/.test(lower)) return "You may be giving up a legal right permanently. Read this very carefully before signing.";
    if (/arbitration|class action/.test(lower)) return "Disputes go to private arbitration — you cannot sue in court or join a class action lawsuit.";
    if (/indemnif/.test(lower)) return "You agree to cover legal costs or damages on behalf of the other party. Potentially open-ended liability.";
    if (/non.?refundable|no refund/.test(lower)) return "Payments are non-refundable even if the product or service fails to deliver on its promises.";
    if (/without notice/.test(lower)) return "Material changes can be made to your agreement without advance notification to you.";
    return `This clause contains language that significantly favors the other party in the area of ${categoryTag}.`;
  }
  if (riskLevel === "caution") {
    if (/terminat/.test(lower)) return "Review termination conditions carefully — there may be fees, notice periods, or restrictive conditions.";
    if (/limitation of liability/.test(lower)) return "The other party caps how much they owe you if something goes wrong. Check the cap amount.";
    if (/no warrant|as.is/.test(lower)) return "No guarantees are made about quality or fitness for purpose. You accept the product as-is.";
    if (/governing law|jurisdiction/.test(lower)) return "Disputes must be resolved under a specific jurisdiction that may be inconvenient or unfavorable for you.";
    if (/security deposit/.test(lower)) return "Understand the exact conditions and timeline for getting your deposit back before signing.";
    if (/data|privacy/.test(lower)) return "Your personal data is being collected or shared with third parties. Review exactly what and with whom.";
    return `This clause deserves careful review before you sign. It relates to ${categoryTag}.`;
  }
  return `Standard clause for ${categoryTag}. No unusual terms detected.`;
}

function ruleNegotiationPrompt(text: string, riskLevel: "safe" | "caution" | "red_flag", categoryTag: string): string | null {
  if (riskLevel === "safe") return null;
  const lower = text.toLowerCase();
  if (/auto.?renew/.test(lower)) return "Ask: \"Can the renewal be changed to opt-in rather than automatic? Or at minimum, can I get a 60-day advance notice before it renews?\"";
  if (/price.{0,20}increase|rate.{0,20}change/.test(lower)) return "Ask: \"Can we cap price increases to a fixed percentage (e.g. CPI + 2%) per year?\"";
  if (/sole discretion/.test(lower)) return "Ask: \"Can this be changed to 'mutual written agreement' rather than unilateral discretion?\"";
  if (/arbitration|class action/.test(lower)) return "Ask: \"Can the arbitration clause be removed, or at least allow small-claims court as an alternative?\"";
  if (/indemnif/.test(lower)) return "Ask: \"Can indemnification be mutual and capped at the total contract value?\"";
  if (/non.?refundable|no refund/.test(lower)) return "Ask: \"Can a pro-rata refund be offered for unused time if you cancel?\"";
  if (/without notice/.test(lower)) return "Ask: \"Can a minimum notice period (e.g. 30 days) be added before any material changes take effect?\"";
  if (/waive.{0,20}right/.test(lower)) return "Ask: \"Can this waiver be removed or narrowed to only specific, named rights?\"";
  if (/terminat/.test(lower)) return "Ask: \"What are the exact termination fees? Can an early-termination cap be added?\"";
  if (/limitation of liability/.test(lower)) return "Ask: \"Can the cap be at least equal to total fees paid in the last 12 months?\"";
  if (/security deposit/.test(lower)) return "Ask: \"Can an itemized move-out inspection be required before any deductions, with a specific return timeline?\"";
  if (/governing law|jurisdiction/.test(lower)) return "Ask: \"Can the governing jurisdiction be changed to your state/country?\"";
  if (/data|privacy/.test(lower)) return "Ask: \"Can data sharing be opt-in only, with a right to deletion on account closure?\"";
  return `Ask: "Can this ${categoryTag} clause be revised to be more balanced?"`;
}

// ── Document segmenter ────────────────────────────────────────────────────────

function segmentClauses(rawText: string): Array<{ text: string; start: number; end: number }> {
  const segments: Array<{ text: string; start: number; end: number }> = [];
  let position = 0;
  const paragraphs = rawText.split(/\n{2,}|(?=\n[0-9]+\.|(?=\n[a-z]\.))/);

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (trimmed.length < 30) { position += para.length + 2; continue; }
    const start = rawText.indexOf(trimmed, position);
    const end = start + trimmed.length;
    segments.push({ text: trimmed, start, end });
    position = end;
  }
  return segments;
}

// ── Groq AI analysis ──────────────────────────────────────────────────────────

interface GroqClauseResult {
  categoryTag: string;
  riskLevel: "safe" | "caution" | "red_flag";
  explanation: string;
  negotiationPrompt: string | null;
}

const VALID_RISK_LEVELS = new Set(["safe", "caution", "red_flag"]);

async function analyzeWithGroq(
  clauses: Array<{ text: string; start: number; end: number }>,
  documentCategory: string,
): Promise<AnalyzedClause[]> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const BATCH = 12;
  const results: AnalyzedClause[] = [];

  for (let i = 0; i < clauses.length; i += BATCH) {
    const batch = clauses.slice(i, i + BATCH);

    const prompt = `You are a contract lawyer specialising in risk analysis. Analyse each clause from a "${documentCategory}" contract.

For EACH clause return a JSON object with:
- "categoryTag": one of [${CUAD_CATEGORIES.join(", ")}]
- "riskLevel": "safe" | "caution" | "red_flag"
- "explanation": 1-2 sentences in plain English explaining what this clause means and why it matters
- "negotiationPrompt": if caution or red_flag, a concrete question the signer should ask (string). If safe, null.

Definitions:
- red_flag: Strongly favours the other party; could cause significant harm or waive key rights
- caution: Deserves careful reading; may have fees, restrictions, or one-sided terms
- safe: Standard, balanced clause with no unusual risk

Return a JSON object: { "clauses": [ ...one object per clause in order... ] }

Clauses to analyse:
${batch.map((c, idx) => `[${idx}] ${c.text}`).join("\n\n")}`;

    try {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 4096,
        response_format: { type: "json_object" },
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw) as { clauses?: GroqClauseResult[] };
      const groqResults = parsed.clauses ?? [];

      for (let j = 0; j < batch.length; j++) {
        const seg = batch[j];
        const gr = groqResults[j];
        const categoryTag = gr?.categoryTag ?? detectCategory(seg.text);
        const rawRisk = gr?.riskLevel;
        const riskLevel: "safe" | "caution" | "red_flag" = VALID_RISK_LEVELS.has(rawRisk as string)
          ? (rawRisk as "safe" | "caution" | "red_flag")
          : detectRisk(seg.text);

        results.push({
          text: seg.text,
          categoryTag,
          riskLevel,
          explanation: gr?.explanation ?? ruleExplanation(seg.text, riskLevel, categoryTag),
          negotiationPrompt: gr?.negotiationPrompt ?? ruleNegotiationPrompt(seg.text, riskLevel, categoryTag),
          positionStart: seg.start,
          positionEnd: seg.end,
        });
      }
    } catch (err) {
      logger.warn({ err, batch: i }, "Groq batch failed — using rule-based fallback for this batch");
      for (const seg of batch) {
        const categoryTag = detectCategory(seg.text);
        const riskLevel = detectRisk(seg.text);
        results.push({
          text: seg.text,
          categoryTag,
          riskLevel,
          explanation: ruleExplanation(seg.text, riskLevel, categoryTag),
          negotiationPrompt: ruleNegotiationPrompt(seg.text, riskLevel, categoryTag),
          positionStart: seg.start,
          positionEnd: seg.end,
        });
      }
    }
  }

  return results;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function analyzeDocument(
  rawText: string,
  documentCategory = "general",
): Promise<AnalyzedClause[]> {
  const segments = segmentClauses(rawText);

  if (process.env.GROQ_API_KEY) {
    return analyzeWithGroq(segments, documentCategory);
  }

  // Rule-based fallback (no API key configured)
  return segments.map((seg) => {
    const categoryTag = detectCategory(seg.text);
    const riskLevel = detectRisk(seg.text);
    return {
      text: seg.text,
      categoryTag,
      riskLevel,
      explanation: ruleExplanation(seg.text, riskLevel, categoryTag),
      negotiationPrompt: ruleNegotiationPrompt(seg.text, riskLevel, categoryTag),
      positionStart: seg.start,
      positionEnd: seg.end,
    };
  });
}

export function computeOverallScore(clauses: AnalyzedClause[]): "safe" | "caution" | "red_flag" {
  const redFlags = clauses.filter((c) => c.riskLevel === "red_flag").length;
  const cautions = clauses.filter((c) => c.riskLevel === "caution").length;
  if (redFlags > 0) return "red_flag";
  if (cautions > clauses.length * 0.3) return "caution";
  return "safe";
}
