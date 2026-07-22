# Fine-Print Guardian — Roadmap

---

## 🔴 Must-have before this is real (not a demo)

### 1. Real AI analysis
The biggest gap. The analyzer currently pattern-matches keywords — it does not actually read the contract.

- Wire `OPENAI_API_KEY` secret → replace `analyzeDocument()` body in `artifacts/api-server/src/lib/analyzer.ts` with a GPT-4o call
- Prompt: send full contract text, ask for clause extraction, category, risk level, explanation, and negotiation tip in structured JSON (`response_format: { type: "json_object" }`)
- Add a token-limit guard: contracts > ~30k tokens need chunking or summarization before sending
- Cost estimate: ~$0.01–0.05 per document at GPT-4o pricing

### 2. Production job queue
`setImmediate` drops jobs on server restart and has no retry logic.

- Add BullMQ + Redis (Upstash Redis has a free tier)
- Scan becomes a queue worker; frontend polls `/scan-status` as it already does
- Adds: retries on failure, visibility into stuck jobs, no lost work on deploy

### 3. Auth
Anyone with the URL can see every document. Needed before sharing with real users.

- Clerk is the fastest path (Replit-managed, ~2 hours to wire)
- Add `userId` column to `documents` table; scope all queries to the logged-in user

---

## 🟡 Strongly recommended (quality & trust)

### 4. Watch List is currently decorative
"No changes detected" is hardcoded — it never actually checks anything.

- Add a scheduled job (cron or BullMQ repeatable) that re-scans watched documents
- Diff new clause list against stored one; flag added / removed / changed clauses
- Send email or in-app notification when a change is detected
- This is the product's core differentiator — without it, Watch List is just UI

### 5. Clause position matching is fragile
`buildSegments()` uses `rawText.indexOf(clause.text)`. Fails silently if the AI returns a clause with slightly different whitespace or punctuation — those clauses render as plain text with no annotation.

- Fix: have the AI return character offsets, or use fuzzy matching (fuse.js)

### 6. No error state on upload
If the scan fails (API down, AI error), the frontend polls forever with no feedback.

- Add `failed` status to the scan endpoint
- Surface the error clearly in the analysis page so the user can retry

### 7. File size limits
No guard on how large a pasted or uploaded contract can be. A 500-page PDF will hang or crash the API.

- Client-side: check file size before extraction begins
- Server-side: count tokens before sending to OpenAI; reject or chunk if over limit

---

## 🟢 Good ideas if you want to grow this

### 8. Comparison mode
User uploads two versions of the same contract (e.g. landlord's first draft vs. revised). Show what changed clause-by-clause. High value for negotiation.

### 9. Export report
One-click PDF summary: document title, overall score, each flagged clause + explanation + negotiation prompt. People want to share this with a lawyer or partner.

### 10. Clause library / pattern recognition
After analyzing 50+ contracts, surface: "We've seen this clause in X other contracts — here's how it usually plays out." Unique data moat over time.

### 11. Browser extension (longer term)
Highlight risky clauses directly on a SaaS sign-up page before the user clicks "I agree." This is the V3 vision and the reason this product is genuinely interesting.

---

## Priority order for one sprint

| # | Item | Why first |
|---|------|-----------|
| 1 | Real AI analysis | Without it nothing else matters |
| 2 | Error handling on scan failure | Silent failures kill trust |
| 3 | File size guards | Prevents crashes in the wild |
| 4 | Auth | Required before sharing with anyone |
| 5 | Real Watch List diffing | Activates the core differentiator |
| 6 | Production job queue | Needed for reliability at scale |

---

## Current status snapshot (as of July 2026)

| Feature | Status |
|---------|--------|
| Upload + paste + file extraction | ✅ Done |
| Clause risk scoring | ✅ Done (rule-based stub) |
| Inline margin annotations | ✅ Done |
| Negotiation prompts ("What to ask") | ✅ Done |
| Filter bar (All / Red / Caution / Safe) | ✅ Done |
| Document library + delete | ✅ Done |
| Watch List UI | ✅ Done |
| Dashboard | ✅ Done |
| Mobile responsive (all pages) | ✅ Done |
| Real AI (OpenAI GPT-4o) | ❌ Not started |
| Production job queue | ❌ Not started |
| Auth (Clerk) | ❌ Not started |
| Watch List diffing (actual change detection) | ❌ Not started |
| Error states on scan failure | ❌ Not started |
| File size guards | ❌ Not started |
| pdfjs worker in production build | ⚠️ Works in dev, unverified in deploy |
