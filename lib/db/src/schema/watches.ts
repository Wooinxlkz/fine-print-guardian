import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { documentsTable } from "./documents";

export const watchesTable = pgTable("watches", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id")
    .notNull()
    .references(() => documentsTable.id, { onDelete: "cascade" }),
  active: boolean("active").notNull().default(true),
  forwardingAddress: text("forwarding_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  // Watch diffing — snapshot of clause state at last check
  lastKnownRedFlag: integer("last_known_red_flag"),
  lastKnownCaution: integer("last_known_caution"),
  lastKnownSafe: integer("last_known_safe"),
  lastKnownClauseCount: integer("last_known_clause_count"),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  changesDetected: boolean("changes_detected"),
  changeSummary: text("change_summary"),
});

export const insertWatchSchema = createInsertSchema(watchesTable).omit({
  id: true,
  active: true,
  createdAt: true,
  lastKnownRedFlag: true,
  lastKnownCaution: true,
  lastKnownSafe: true,
  lastKnownClauseCount: true,
  lastCheckedAt: true,
  changesDetected: true,
  changeSummary: true,
});
export type InsertWatch = z.infer<typeof insertWatchSchema>;
export type Watch = typeof watchesTable.$inferSelect;
