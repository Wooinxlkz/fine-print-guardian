import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, watchesTable, documentsTable } from "@workspace/db";
import { CreateWatchBody, DeleteWatchParams, CheckWatchParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// GET /watches — scoped to the user's documents
router.get("/watches", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;

  const rows = await db
    .select({
      id: watchesTable.id,
      documentId: watchesTable.documentId,
      documentTitle: documentsTable.title,
      active: watchesTable.active,
      forwardingAddress: watchesTable.forwardingAddress,
      createdAt: watchesTable.createdAt,
      lastCheckedAt: watchesTable.lastCheckedAt,
      changesDetected: watchesTable.changesDetected,
      changeSummary: watchesTable.changeSummary,
    })
    .from(watchesTable)
    .leftJoin(documentsTable, eq(watchesTable.documentId, documentsTable.id))
    .where(eq(documentsTable.userId, userId))
    .orderBy(watchesTable.createdAt);

  res.json(
    rows.map((r) => ({
      ...r,
      documentTitle: r.documentTitle ?? "Untitled",
    }))
  );
});

// POST /watches
router.post("/watches", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateWatchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = (req as any).userId as string;

  // Verify document exists and belongs to this user
  const [doc] = await db
    .select()
    .from(documentsTable)
    .where(and(eq(documentsTable.id, parsed.data.documentId), eq(documentsTable.userId, userId)));

  if (!doc) {
    res.status(400).json({ error: "Document not found" });
    return;
  }

  // Initialize with current clause state as baseline snapshot
  const isAnalyzed = doc.status === "complete";
  const [watch] = await db
    .insert(watchesTable)
    .values({
      documentId: parsed.data.documentId,
      lastKnownRedFlag: isAnalyzed ? doc.redFlagCount : null,
      lastKnownCaution: isAnalyzed ? doc.cautionCount : null,
      lastKnownSafe: isAnalyzed ? doc.safeCount : null,
      lastKnownClauseCount: isAnalyzed ? doc.clauseCount : null,
      lastCheckedAt: isAnalyzed ? new Date() : null,
      changesDetected: false,
      changeSummary: isAnalyzed
        ? "Baseline established. Future checks will compare against this snapshot."
        : null,
    })
    .returning();

  res.status(201).json({
    ...watch,
    documentTitle: doc.title,
  });
});

// DELETE /watches/:id
router.delete("/watches/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteWatchParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = (req as any).userId as string;

  // Verify ownership via document join
  const [row] = await db
    .select({ watchId: watchesTable.id })
    .from(watchesTable)
    .leftJoin(documentsTable, eq(watchesTable.documentId, documentsTable.id))
    .where(and(eq(watchesTable.id, params.data.id), eq(documentsTable.userId, userId)));

  if (!row) {
    res.status(404).json({ error: "Watch not found" });
    return;
  }

  await db.delete(watchesTable).where(eq(watchesTable.id, params.data.id));

  res.sendStatus(204);
});

// POST /watches/:id/check — compare current doc state to stored baseline
router.post("/watches/:id/check", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = CheckWatchParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = (req as any).userId as string;

  // Get watch + its document (verify ownership)
  const [row] = await db
    .select({
      watch: watchesTable,
      docId: documentsTable.id,
      docTitle: documentsTable.title,
      docStatus: documentsTable.status,
      docRedFlag: documentsTable.redFlagCount,
      docCaution: documentsTable.cautionCount,
      docSafe: documentsTable.safeCount,
      docClauseCount: documentsTable.clauseCount,
      docUserId: documentsTable.userId,
    })
    .from(watchesTable)
    .leftJoin(documentsTable, eq(watchesTable.documentId, documentsTable.id))
    .where(and(eq(watchesTable.id, params.data.id), eq(documentsTable.userId, userId)));

  if (!row || !row.docId) {
    res.status(404).json({ error: "Watch not found" });
    return;
  }

  if (row.docStatus !== "complete") {
    res.status(400).json({ error: "Document must be fully analyzed before checking for changes." });
    return;
  }

  const currentRed = row.docRedFlag ?? 0;
  const currentCaution = row.docCaution ?? 0;
  const currentSafe = row.docSafe ?? 0;
  const currentTotal = row.docClauseCount ?? 0;

  const lastRed = row.watch.lastKnownRedFlag;
  const lastTotal = row.watch.lastKnownClauseCount;

  let changesDetected = false;
  let changeSummary: string;

  if (lastTotal === null) {
    // First check — establish baseline
    changesDetected = false;
    changeSummary = "Baseline established. Future checks will compare against this snapshot.";
  } else {
    const redDiff = currentRed - (lastRed ?? 0);
    const cautionDiff = currentCaution - (row.watch.lastKnownCaution ?? 0);
    const totalDiff = currentTotal - lastTotal;

    if (redDiff !== 0 || cautionDiff !== 0 || totalDiff !== 0) {
      changesDetected = true;
      const parts: string[] = [];
      if (redDiff > 0) parts.push(`+${redDiff} new red flag${redDiff !== 1 ? "s" : ""}`);
      else if (redDiff < 0) parts.push(`${Math.abs(redDiff)} fewer red flag${Math.abs(redDiff) !== 1 ? "s" : ""}`);
      if (cautionDiff > 0) parts.push(`+${cautionDiff} new caution${cautionDiff !== 1 ? "s" : ""}`);
      else if (cautionDiff < 0) parts.push(`${Math.abs(cautionDiff)} fewer caution${Math.abs(cautionDiff) !== 1 ? "s" : ""}`);
      if (totalDiff > 0) parts.push(`+${totalDiff} clause${totalDiff !== 1 ? "s" : ""} added`);
      else if (totalDiff < 0) parts.push(`${Math.abs(totalDiff)} clause${Math.abs(totalDiff) !== 1 ? "s" : ""} removed`);
      changeSummary = parts.join(", ") + " since last check.";
    } else {
      changeSummary = "No changes detected.";
    }
  }

  const [updated] = await db
    .update(watchesTable)
    .set({
      lastKnownRedFlag: currentRed,
      lastKnownCaution: currentCaution,
      lastKnownSafe: currentSafe,
      lastKnownClauseCount: currentTotal,
      lastCheckedAt: new Date(),
      changesDetected,
      changeSummary,
    })
    .where(eq(watchesTable.id, params.data.id))
    .returning();

  res.json({
    ...updated,
    documentTitle: row.docTitle ?? "Untitled",
  });
});

export default router;
