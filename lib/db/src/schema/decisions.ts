import { pgTable, serial, text, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vendorsTable } from "./vendors";
import { invoicesTable } from "./invoices";

export const decisionsTable = pgTable("decisions", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoicesTable.id),
  vendorId: integer("vendor_id").notNull().references(() => vendorsTable.id),
  action: text("action").notNull(),
  reasoning: text("reasoning").notNull(),
  madeBy: text("made_by").notNull().default("agent"),
  confidence: numeric("confidence", { precision: 5, scale: 2 }),
  agentVersion: text("agent_version"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDecisionSchema = createInsertSchema(decisionsTable).omit({ id: true, createdAt: true });
export type InsertDecision = z.infer<typeof insertDecisionSchema>;
export type Decision = typeof decisionsTable.$inferSelect;
