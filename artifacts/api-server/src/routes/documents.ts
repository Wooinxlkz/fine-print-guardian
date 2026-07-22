import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, documentsTable, clausesTable } from "@workspace/db";
import {
  CreateDocumentBody,
  GetDocumentParams,
  DeleteDocumentParams,
  ScanDocumentParams,
  GetDocumentScanStatusParams,
  ListDocumentClausesParams,
} from "@workspace/api-zod";
import { analyzeDocument, computeOverallScore } from "../lib/analyzer";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// File size guard: 200KB of raw text (about 50k tokens — enough for any real contract)
const MAX_RAW_TEXT_BYTES = 200_000;

/**
 * DB-backed async scan job. Progress is stored in the documents table,
 * so it survives server restarts. Includes auto-retry up to 3 attempts.
 */
async function runScanJob(docId: number): Promise<void> {
  try {
    const [doc] = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.id, docId));

    if (!doc) return;

    await db
      .update(documentsTable)
      .set({ scanProgress: 20, scanMessage: "Segmenting document into clauses…" })
      .where(eq(documentsTable.id, docId));

    const analyzedClauses = await analyzeDocument(doc.rawText, doc.category);

    await db
      .update(documentsTable)
      .set({ scanProgress: 60, scanMessage: "Classifying clause risk levels…" })
      .where(eq(documentsTable.id, docId));

    // Replace existing clauses
    await db.delete(clausesTable).where(eq(clausesTable.documentId, docId));

    if (analyzedClauses.length > 0) {
      await db.insert(clausesTable).values(
        analyzedClauses.map((c) => ({
          documentId: docId,
          text: c.text,
          categoryTag: c.categoryTag,
          riskLevel: c.riskLevel,
          explanation: c.explanation,
          negotiationPrompt: c.negotiationPrompt,
          positionStart: c.positionStart,
          positionEnd: c.positionEnd,
        }))
      );
    }

    const overallScore = computeOverallScore(analyzedClauses);
    const redFlagCount = analyzedClauses.filter((c) => c.riskLevel === "red_flag").length;
    const cautionCount = analyzedClauses.filter((c) => c.riskLevel === "caution").length;
    const safeCount = analyzedClauses.filter((c) => c.riskLevel === "safe").length;

    await db
      .update(documentsTable)
      .set({
        status: "complete",
        overallScore,
        clauseCount: analyzedClauses.length,
        redFlagCount,
        cautionCount,
        safeCount,
        scanProgress: 100,
        scanMessage: "Analysis complete.",
        errorMessage: null,
      })
      .where(eq(documentsTable.id, docId));

  } catch (err) {
    // Fetch current retry count
    const [current] = await db
      .select({ scanRetries: documentsTable.scanRetries })
      .from(documentsTable)
      .where(eq(documentsTable.id, docId));

    const retries = (current?.scanRetries ?? 0) + 1;

    if (retries < 3) {
      // Reset and retry after an exponential back-off
      await db
        .update(documentsTable)
        .set({
          status: "pending",
          scanRetries: retries,
          scanProgress: 0,
          scanMessage: `Analysis failed. Retrying (attempt ${retries + 1} of 3)…`,
        })
        .where(eq(documentsTable.id, docId));

      setTimeout(async () => {
        await db
          .update(documentsTable)
          .set({ status: "analyzing" })
          .where(eq(documentsTable.id, docId));
        setImmediate(() => runScanJob(docId));
      }, 2000 * retries);
    } else {
      // Give up
      await db
        .update(documentsTable)
        .set({
          status: "error",
          scanProgress: 0,
          scanMessage: "Analysis failed after 3 attempts.",
          errorMessage: err instanceof Error ? err.message : "Unknown error occurred.",
        })
        .where(eq(documentsTable.id, docId));
    }
  }
}

// GET /documents
router.get("/documents", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;
  const docs = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.userId, userId))
    .orderBy(documentsTable.uploadedAt);
  res.json(docs.reverse());
});

// POST /documents
router.post("/documents", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Server-side file size guard
  if (parsed.data.rawText.length > MAX_RAW_TEXT_BYTES) {
    res.status(413).json({
      error: `Document text is too large (${Math.round(parsed.data.rawText.length / 1000)}KB). Please keep contracts under 200KB.`,
    });
    return;
  }

  const userId = (req as any).userId as string;

  const [doc] = await db
    .insert(documentsTable)
    .values({
      userId,
      title: parsed.data.title,
      category: parsed.data.category,
      rawText: parsed.data.rawText,
      status: "pending",
      scanProgress: 0,
      scanMessage: "Waiting to start.",
    })
    .returning();

  res.status(201).json(doc);
});

// GET /documents/:id
router.get("/documents/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetDocumentParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = (req as any).userId as string;

  const [doc] = await db
    .select()
    .from(documentsTable)
    .where(and(eq(documentsTable.id, params.data.id), eq(documentsTable.userId, userId)));

  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  const clauses = await db
    .select()
    .from(clausesTable)
    .where(eq(clausesTable.documentId, params.data.id));

  res.json({ ...doc, clauses });
});

// DELETE /documents/:id
router.delete("/documents/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteDocumentParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = (req as any).userId as string;

  const [doc] = await db
    .delete(documentsTable)
    .where(and(eq(documentsTable.id, params.data.id), eq(documentsTable.userId, userId)))
    .returning();

  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  res.sendStatus(204);
});

// POST /documents/:id/scan
router.post("/documents/:id/scan", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ScanDocumentParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = (req as any).userId as string;

  const [doc] = await db
    .select()
    .from(documentsTable)
    .where(and(eq(documentsTable.id, params.data.id), eq(documentsTable.userId, userId)));

  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  if (doc.status === "analyzing") {
    res.status(409).json({ error: "Document is already being analyzed" });
    return;
  }

  // Reset and kick off scan
  await db
    .update(documentsTable)
    .set({
      status: "analyzing",
      scanProgress: 0,
      scanMessage: "Starting analysis…",
      scanRetries: 0,
      errorMessage: null,
    })
    .where(eq(documentsTable.id, params.data.id));

  setImmediate(() => runScanJob(params.data.id));

  res.status(202).json({
    documentId: params.data.id,
    status: "analyzing",
    progress: 0,
    message: "Analysis started.",
  });
});

// GET /documents/:id/scan-status — reads from DB, not in-memory
router.get("/documents/:id/scan-status", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetDocumentScanStatusParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = (req as any).userId as string;

  const [doc] = await db
    .select()
    .from(documentsTable)
    .where(and(eq(documentsTable.id, params.data.id), eq(documentsTable.userId, userId)));

  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  res.json({
    documentId: doc.id,
    status: doc.status,
    progress: doc.scanProgress ?? 0,
    message: doc.scanMessage ?? "Waiting to start.",
  });
});

// GET /documents/:id/clauses
router.get("/documents/:id/clauses", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ListDocumentClausesParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = (req as any).userId as string;

  const [doc] = await db
    .select()
    .from(documentsTable)
    .where(and(eq(documentsTable.id, params.data.id), eq(documentsTable.userId, userId)));

  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  const clauses = await db
    .select()
    .from(clausesTable)
    .where(eq(clausesTable.documentId, params.data.id));

  res.json(clauses);
});

export default router;
