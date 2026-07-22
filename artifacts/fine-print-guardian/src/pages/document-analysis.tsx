import { useParams } from "wouter";
import {
  useGetDocument,
  useGetDocumentScanStatus,
  useScanDocument,
  getGetDocumentQueryKey,
  getGetDocumentScanStatusQueryKey,
} from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import {
  ShieldAlert, FileText, AlertTriangle, Info, Printer,
  CheckCircle2, Loader2, MessageSquare, ChevronDown, ChevronUp, Copy, Check, RefreshCw, XCircle,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

// ─── helpers ─────────────────────────────────────────────────────────────────

type RiskLevel = "safe" | "caution" | "red_flag";

function getRiskClasses(level: RiskLevel) {
  switch (level) {
    case "red_flag": return {
      pill:      "text-[#B84C4C] bg-[#B84C4C]/10 border-[#B84C4C]/30",
      highlight: "bg-[#B84C4C]/[0.10] border-b-2 border-[#B84C4C]/50",
      card:      "bg-white border-[#B84C4C]/20 hover:border-[#B84C4C]/40",
      ring:      "ring-2 ring-[#B84C4C]/30",
    };
    case "caution": return {
      pill:      "text-[#C8773A] bg-[#C8773A]/10 border-[#C8773A]/30",
      highlight: "bg-[#C8773A]/[0.08] border-b-2 border-[#C8773A]/40",
      card:      "bg-white border-[#C8773A]/20 hover:border-[#C8773A]/40",
      ring:      "ring-2 ring-[#C8773A]/30",
    };
    default: return {
      pill:      "text-[#3A7A52] bg-[#3A7A52]/10 border-[#3A7A52]/30",
      highlight: "bg-[#3A7A52]/[0.07] border-b border-[#3A7A52]/30",
      card:      "bg-white border-[#3A7A52]/15 hover:border-[#3A7A52]/35",
      ring:      "ring-2 ring-[#3A7A52]/25",
    };
  }
}

function RiskIcon({ level, className = "w-3.5 h-3.5" }: { level: string; className?: string }) {
  if (level === "red_flag") return <AlertTriangle className={className} />;
  if (level === "caution")  return <Info className={className} />;
  return <CheckCircle2 className={className} />;
}

type Clause = {
  id: number; text: string; categoryTag: string;
  riskLevel: string; explanation: string;
  negotiationPrompt?: string | null;
  positionStart: number; positionEnd: number;
};

// ─── fuzzy segment builder ────────────────────────────────────────────────────
// Handles whitespace differences between stored clause text and raw document.

function locateClause(rawText: string, clauseText: string, storedStart: number, storedEnd: number): { start: number; end: number } {
  // 1. Exact match
  const idx = rawText.indexOf(clauseText);
  if (idx !== -1) return { start: idx, end: idx + clauseText.length };

  // 2. Match first N significant words (handles whitespace normalization)
  const words = clauseText.split(/\s+/).filter(Boolean);
  const searchTerms = words.slice(0, Math.min(10, words.length)).join(" ");
  const approxIdx = rawText.indexOf(searchTerms);
  if (approxIdx !== -1) {
    return { start: approxIdx, end: approxIdx + clauseText.length };
  }

  // 3. Regex with flexible whitespace between first few words
  if (words.length >= 3) {
    try {
      const pattern = words
        .slice(0, Math.min(6, words.length))
        .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("\\s+");
      const match = rawText.match(new RegExp(pattern));
      if (match?.index !== undefined) {
        return { start: match.index, end: match.index + clauseText.length };
      }
    } catch {
      // Regex error — fall through to stored positions
    }
  }

  // 4. Fall back to stored positions (clamped)
  return {
    start: Math.min(storedStart, rawText.length),
    end: Math.min(storedEnd, rawText.length),
  };
}

type TextSeg   = { kind: "text";   content: string; key: string };
type ClauseSeg = { kind: "clause"; content: string; clause: Clause; key: string };
type Segment   = TextSeg | ClauseSeg;

function buildSegments(rawText: string, clauses: Clause[]): Segment[] {
  const resolved = clauses
    .map((c) => {
      const { start, end } = locateClause(rawText, c.text, c.positionStart, c.positionEnd);
      return { ...c, positionStart: start, positionEnd: end };
    })
    .sort((a, b) => a.positionStart - b.positionStart);

  const segs: Segment[] = [];
  let cursor = 0;
  for (const c of resolved) {
    if (c.positionStart > cursor) segs.push({ kind: "text", content: rawText.slice(cursor, c.positionStart), key: `t-${cursor}` });
    segs.push({ kind: "clause", content: rawText.slice(c.positionStart, c.positionEnd), clause: c, key: `c-${c.id}` });
    cursor = c.positionEnd;
  }
  if (cursor < rawText.length) segs.push({ kind: "text", content: rawText.slice(cursor), key: `t-${cursor}` });
  return segs;
}

// ─── copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={copy} title="Copy clause text"
      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors shrink-0">
      {copied ? <Check className="w-3 h-3 text-[#3A7A52]" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

// ─── annotation card ─────────────────────────────────────────────────────────

function AnnotationCard({
  clause, isActive, onClick, animate, delay,
}: {
  clause: Clause; isActive: boolean; onClick: () => void; animate: boolean; delay: number;
}) {
  const rc = getRiskClasses(clause.riskLevel as RiskLevel);
  const [showNegotiation, setShowNegotiation] = useState(false);

  const card = (
    <div
      onClick={onClick}
      className={`
        cursor-pointer rounded-lg border p-3 text-sm transition-all duration-200 shadow-sm
        ${rc.card} ${isActive ? rc.ring : ""}
      `}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-tight">
          {clause.categoryTag}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <CopyButton text={clause.text} />
          <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${rc.pill}`}>
            <RiskIcon level={clause.riskLevel} className="w-3 h-3" />
            {clause.riskLevel.replace("_", " ")}
          </span>
        </div>
      </div>

      <p className="font-sans text-xs leading-relaxed text-foreground/85 print:text-black">{clause.explanation}</p>

      {clause.negotiationPrompt && (
        <div className="mt-2 pt-2 border-t border-border/40 print:block">
          <button
            onClick={(e) => { e.stopPropagation(); setShowNegotiation(!showNegotiation); }}
            className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors w-full text-left print:hidden"
          >
            <MessageSquare className="w-3 h-3 shrink-0" />
            What to ask
            {showNegotiation ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
          </button>
          
          {/* Print only visible prompt */}
          <div className="hidden print:block font-sans text-xs leading-relaxed text-black mt-1.5 italic">
            <strong>Negotiation Tip:</strong> {clause.negotiationPrompt}
          </div>

          <AnimatePresence>
            {showNegotiation && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="font-sans text-xs leading-relaxed text-foreground/80 mt-1.5 italic overflow-hidden print:hidden"
              >
                {clause.negotiationPrompt}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );

  if (!animate) return card;
  return (
    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay, duration: 0.3 }}>
      {card}
    </motion.div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

type Filter = "all" | RiskLevel;

export default function DocumentAnalysis() {
  const { id } = useParams();
  const docId = Number(id);
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const scanDocument = useScanDocument();

  const { data: document, isLoading } = useGetDocument(docId, {
    query: { enabled: !!docId, queryKey: getGetDocumentQueryKey(docId) },
  });
  const { data: scanStatus } = useGetDocumentScanStatus(docId, {
    query: {
      enabled: !!docId && (document?.status === "pending" || document?.status === "analyzing"),
      refetchInterval: 2000,
      queryKey: getGetDocumentScanStatusQueryKey(docId),
    },
  });

  useEffect(() => {
    if (scanStatus?.status === "complete" && document?.status !== "complete") {
      queryClient.invalidateQueries({ queryKey: getGetDocumentQueryKey(docId) });
    }
  }, [scanStatus?.status, document?.status, docId, queryClient]);

  const toggleClause = useCallback((id: number) => setActiveId(prev => prev === id ? null : id), []);

  const handleRetry = () => {
    scanDocument.mutate({ id: docId }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetDocumentQueryKey(docId) }),
    });
  };

  const handleRescan = () => {
    scanDocument.mutate({ id: docId }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetDocumentQueryKey(docId) }),
    });
  };

  const displayCategory = (cat: string) => {
    if (cat === "tos") return "Terms of Service";
    if (cat === "subscription") return "Subscription Agreement";
    if (cat === "lease") return "Lease Agreement";
    return cat;
  };

  if (isLoading || !document) {
    return (
      <div className="max-w-6xl mx-auto h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 opacity-40">
          <FileText className="w-12 h-12 animate-pulse" />
          <h2 className="text-2xl font-serif">Retrieving document…</h2>
        </div>
      </div>
    );
  }

  const isAnalyzing = document.status === "pending" || document.status === "analyzing";
  const clauses: Clause[] = (document.clauses ?? []) as Clause[];
  const visibleClauses = filter === "all" ? clauses : clauses.filter(c => c.riskLevel === filter);
  const segments = clauses.length > 0 ? buildSegments(document.rawText, clauses) : null;

  const filteredSegs = segments?.map(seg => {
    if (seg.kind === "clause" && filter !== "all" && seg.clause.riskLevel !== filter) {
      return { kind: "text" as const, content: seg.content, key: `tf-${seg.key}` };
    }
    return seg;
  });

  const scoreBadge = () => {
    if (document.overallScore === "safe")
      return <Badge variant="safe" className="px-2.5 py-1 text-xs sm:text-sm"><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Generally Safe</Badge>;
    if (document.overallScore === "caution")
      return <Badge variant="caution" className="px-2.5 py-1 text-xs sm:text-sm"><Info className="w-3.5 h-3.5 mr-1.5" />Proceed with Caution</Badge>;
    if (document.overallScore === "red_flag")
      return <Badge variant="red_flag" className="px-2.5 py-1 text-xs sm:text-sm"><AlertTriangle className="w-3.5 h-3.5 mr-1.5" />Action Required</Badge>;
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-5">
      {/* ── Print-only Header ── */}
      <div className="hidden print:block mb-8 border-b border-gray-300 pb-4">
        <h1 className="text-3xl font-serif text-black mb-2">{document.title}</h1>
        <p className="text-gray-600 mb-4">{displayCategory(document.category)}</p>
        <div className="flex gap-6 text-sm">
          <div><strong>Status:</strong> {document.overallScore?.replace("_", " ")}</div>
          <div><strong>Scan Date:</strong> {new Date(document.uploadedAt).toLocaleDateString()}</div>
        </div>
      </div>

      {/* ── Header ── */}
      <header className="flex flex-col sm:flex-row sm:items-start justify-between pb-4 border-b border-border/50 gap-3 print:hidden">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-serif tracking-tight text-primary mb-1 leading-tight">{document.title}</h1>
          <p className="text-muted-foreground text-sm">{displayCategory(document.category)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          {document.status === "complete" && (
            <>
              <div className="flex items-center gap-3 bg-card px-3 py-2 sm:px-4 sm:py-3 rounded-lg border border-border/50 shadow-sm">
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">Overall:</span>
                {scoreBadge()}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRescan}
                disabled={scanDocument.isPending}
                className="text-xs gap-1.5"
                title="Re-analyze this document"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Rescan</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="text-xs gap-1.5"
                title="Download PDF report"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download PDF</span>
              </Button>
            </>
          )}
        </div>
      </header>

      {/* ── Filter bar ── */}
      {!isAnalyzing && clauses.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {(["all", "red_flag", "caution", "safe"] as const).map(f => {
            const labels: Record<Filter, string> = { all: `All (${clauses.length})`, red_flag: `Red flags (${document.redFlagCount})`, caution: `Caution (${document.cautionCount})`, safe: `Safe (${document.safeCount})` };
            const colors: Record<Filter, string> = {
              all: filter === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
              red_flag: filter === "red_flag" ? "bg-[#B84C4C] text-white border-[#B84C4C]" : "border-[#B84C4C]/30 text-[#B84C4C] hover:bg-[#B84C4C]/10",
              caution: filter === "caution" ? "bg-[#C8773A] text-white border-[#C8773A]" : "border-[#C8773A]/30 text-[#C8773A] hover:bg-[#C8773A]/10",
              safe: filter === "safe" ? "bg-[#3A7A52] text-white border-[#3A7A52]" : "border-[#3A7A52]/30 text-[#3A7A52] hover:bg-[#3A7A52]/10",
            };
            return (
              <button key={f} onClick={() => setFilter(f)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${colors[f]}`}>
                {f !== "all" && <RiskIcon level={f} className="w-3 h-3" />}
                {labels[f]}
              </button>
            );
          })}
          <span className="text-xs text-muted-foreground ml-auto hidden sm:block">Click any highlighted clause to focus its note</span>
        </div>
      )}

      {/* ── Legend ── */}
      {!isAnalyzing && clauses.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground font-sans print:hidden">
          <span className="font-medium hidden sm:inline">Key:</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-[#B84C4C]/12 border-b-2 border-[#B84C4C]/60" />Red flag</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-[#C8773A]/10 border-b-2 border-[#C8773A]/50" />Caution</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-[#3A7A52]/8 border-b border-[#3A7A52]/40" />Safe</span>
        </div>
      )}

      {/* ── Body ── */}
      {isAnalyzing ? (
        <div className="flex flex-col items-center justify-center py-20 sm:py-28 gap-5 text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin opacity-50" />
          <div>
            <h3 className="font-serif text-xl sm:text-2xl">Reading the fine print…</h3>
            <p className="text-muted-foreground text-sm mt-1">Working through every clause.</p>
          </div>
          <div className="w-48 sm:w-56 h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div className="h-full bg-primary rounded-full"
              initial={{ width: "8%" }}
              animate={{ width: `${scanStatus?.progress ?? 10}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <p className="text-xs text-muted-foreground animate-pulse">{scanStatus?.message ?? "Parsing clauses…"}</p>
        </div>

      ) : document.status === "error" ? (
        /* ── Error state with retry ── */
        <div className="text-center py-20 space-y-4">
          <XCircle className="w-10 h-10 text-destructive mx-auto opacity-70" />
          <div>
            <p className="text-destructive font-medium text-lg">Analysis failed</p>
            {(document as any).errorMessage && (
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto font-mono">
                {(document as any).errorMessage}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              This can happen with unusual document formats or very long contracts.
            </p>
          </div>
          <Button
            onClick={handleRetry}
            disabled={scanDocument.isPending}
            className="gap-2"
          >
            {scanDocument.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Retrying…</>
            ) : (
              <><RefreshCw className="w-4 h-4" />Retry Analysis</>
            )}
          </Button>
        </div>

      ) : filteredSegs ? (
        /* ── Margin-note layout ── */
        <div className="font-serif text-[1rem] sm:text-[1.0625rem] leading-relaxed text-foreground/90 pb-20">
          {filteredSegs.map((seg, i) => {
            if (seg.kind === "text") {
              return (
                <p key={seg.key} className="whitespace-pre-wrap py-0.5 text-foreground/78">
                  {seg.content}
                </p>
              );
            }

            const { clause } = seg;
            const rc = getRiskClasses(clause.riskLevel as RiskLevel);
            const isActive = activeId === clause.id;

            return (
              <div key={seg.key} className="my-1 grid grid-cols-1 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_320px] gap-2 lg:gap-5 items-start print:block print-stack print-mb-4 print-break-inside-avoid">
                <span
                  onClick={() => toggleClause(clause.id)}
                  className={`cursor-pointer rounded px-1 py-0.5 transition-all duration-200 inline ${rc.highlight} ${isActive ? rc.ring : ""}`}
                >
                  {seg.content}
                </span>
                <AnnotationCard
                  clause={clause}
                  isActive={isActive}
                  onClick={() => toggleClause(clause.id)}
                  animate={true}
                  delay={i * 0.03}
                />
              </div>
            );
          })}

          {visibleClauses.length === 0 && (
            <div className="flex flex-col items-center py-16 gap-3 opacity-50">
              <CheckCircle2 className="w-8 h-8 text-[#3A7A52]" />
              <p className="font-sans text-sm">No clauses match this filter.</p>
            </div>
          )}
        </div>

      ) : (
        <p className="whitespace-pre-wrap font-serif text-foreground/80 leading-relaxed pb-20">{document.rawText}</p>
      )}

      {/* ── Sticky footer summary ── */}
      {!isAnalyzing && document.status === "complete" && clauses.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 md:left-64 border-t border-border bg-background/95 backdrop-blur-sm py-2.5 px-4 sm:px-6 flex flex-wrap items-center gap-3 sm:gap-5 text-xs font-sans z-20 print:hidden">
          <ShieldAlert className="w-4 h-4 text-primary shrink-0 hidden sm:block" />
          <span className="text-muted-foreground font-medium">{clauses.length} clauses</span>
          <span className="flex items-center gap-1.5 text-[#B84C4C]"><AlertTriangle className="w-3.5 h-3.5" />{document.redFlagCount} red</span>
          <span className="flex items-center gap-1.5 text-[#C8773A]"><Info className="w-3.5 h-3.5" />{document.cautionCount} caution</span>
          <span className="flex items-center gap-1.5 text-[#3A7A52]"><CheckCircle2 className="w-3.5 h-3.5" />{document.safeCount} safe</span>
          <span className="ml-auto text-[10px] text-muted-foreground hidden sm:block">Click a highlighted clause · expand "What to ask" for negotiation tips</span>
        </div>
      )}
    </div>
  );
}
