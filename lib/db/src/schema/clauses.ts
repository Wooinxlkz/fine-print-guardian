import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { documentsTable } from "./documents";

export const clausesTable = pgTable("clauses", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id")
    .notNull()
    .references(() => documentsTable.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  categoryTag: text("category_tag").notNull(),
  riskLevel: text("risk_level").notNull(), // 'safe' | 'caution' | 'red_flag'
  explanation: text("explanation").notNull(),
  negotiationPrompt: text("negotiation_prompt"),
  positionStart: integer("position_start").notNull().default(0),
  positionEnd: integer("position_end").notNull().default(0),
});

export const insertClauseSchema = createInsertSchema(clausesTable).omit({ id: true });
export type InsertClause = z.infer<typeof insertClauseSchema>;
export type Clause = typeof clausesTable.$inferSelect;
