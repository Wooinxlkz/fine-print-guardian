import { Router, type IRouter } from "express";
import { eq, count, sql, and } from "drizzle-orm";
import { db, documentsTable, watchesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// GET /dashboard — scoped to the authenticated user
router.get("/dashboard", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).userId as string;

  const [totalResult] = await db
    .select({ count: count() })
    .from(documentsTable)
    .where(eq(documentsTable.userId, userId));

  const [analyzedResult] = await db
    .select({ count: count() })
    .from(documentsTable)
    .where(and(eq(documentsTable.userId, userId), eq(documentsTable.status, "complete")));

  const [watchResult] = await db
    .select({ count: count() })
    .from(watchesTable)
    .leftJoin(documentsTable, eq(watchesTable.documentId, documentsTable.id))
    .where(and(eq(watchesTable.active, true), eq(documentsTable.userId, userId)));

  const [safeResult] = await db
    .select({ count: count() })
    .from(documentsTable)
    .where(and(eq(documentsTable.userId, userId), eq(documentsTable.overallScore, "safe")));

  const [cautionResult] = await db
    .select({ count: count() })
    .from(documentsTable)
    .where(and(eq(documentsTable.userId, userId), eq(documentsTable.overallScore, "caution")));

  const [redFlagResult] = await db
    .select({ count: count() })
    .from(documentsTable)
    .where(and(eq(documentsTable.userId, userId), eq(documentsTable.overallScore, "red_flag")));

  const [subResult] = await db
    .select({ count: count() })
    .from(documentsTable)
    .where(and(eq(documentsTable.userId, userId), eq(documentsTable.category, "subscription")));

  const [leaseResult] = await db
    .select({ count: count() })
    .from(documentsTable)
    .where(and(eq(documentsTable.userId, userId), eq(documentsTable.category, "lease")));

  const [tosResult] = await db
    .select({ count: count() })
    .from(documentsTable)
    .where(and(eq(documentsTable.userId, userId), eq(documentsTable.category, "tos")));

  const recentDocuments = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.userId, userId))
    .orderBy(sql`${documentsTable.uploadedAt} DESC`)
    .limit(5);

  res.json({
    totalDocuments: Number(totalResult?.count ?? 0),
    analyzedDocuments: Number(analyzedResult?.count ?? 0),
    activeWatches: Number(watchResult?.count ?? 0),
    riskDistribution: {
      safe: Number(safeResult?.count ?? 0),
      caution: Number(cautionResult?.count ?? 0),
      red_flag: Number(redFlagResult?.count ?? 0),
    },
    recentDocuments,
    categoryBreakdown: {
      subscription: Number(subResult?.count ?? 0),
      lease: Number(leaseResult?.count ?? 0),
      tos: Number(tosResult?.count ?? 0),
    },
  });
});

export default router;
