import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  title: text("title").notNull(),
  category: text("category").notNull(), // 'subscription' | 'lease'
  status: text("status").notNull().default("pending"), // 'pending' | 'analyzing' | 'complete' | 'error'
  overallScore: text("overall_score"), // 'safe' | 'caution' | 'red_flag' | null
  clauseCount: integer("clause_count").notNull().default(0),
  redFlagCount: integer("red_flag_count").notNull().default(0),
  cautionCount: integer("caution_count").notNull().default(0),
  safeCount: integer("safe_count").notNull().default(0),
  rawText: text("raw_text").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  // DB-backed job queue — survives server restarts
  scanProgress: integer("scan_progress").notNull().default(0),
  scanMessage: text("scan_message"),
  scanRetries: integer("scan_retries").notNull().default(0),
  errorMessage: text("error_message"),
});

export const insertDocumentSchema = createInsertSchema(documentsTable).omit({
  id: true,
  uploadedAt: true,
  status: true,
  clauseCount: true,
  redFlagCount: true,
  cautionCount: true,
  safeCount: true,
  overallScore: true,
  scanProgress: true,
  scanMessage: true,
  scanRetries: true,
  errorMessage: true,
});
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documentsTable.$inferSelect;
