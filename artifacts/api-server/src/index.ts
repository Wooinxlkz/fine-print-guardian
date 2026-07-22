import app from "./app";
import { logger } from "./lib/logger";
import { db, documentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

(async () => {
  // On startup, reset any documents stuck in "analyzing" state.
  // This handles server restarts mid-scan — they'll need to be retried manually.
  try {
    const result = await db
      .update(documentsTable)
      .set({
        status: "pending",
        scanProgress: 0,
        scanMessage: "Server restarted. Retry to re-analyze.",
      })
      .where(eq(documentsTable.status, "analyzing"))
      .returning({ id: documentsTable.id });

    if (result.length > 0) {
      logger.warn({ count: result.length }, "Reset stale analyzing documents to pending on startup");
    }
  } catch (err) {
    logger.warn({ err }, "Could not reset stale analyzing documents on startup");
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });
})();
