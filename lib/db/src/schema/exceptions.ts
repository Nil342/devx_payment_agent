import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vendorsTable } from "./vendors";
import { invoicesTable } from "./invoices";

export const exceptionsTable = pgTable("exceptions", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull().references(() => vendorsTable.id),
  invoiceId: integer("invoice_id").notNull().references(() => invoicesTable.id),
  type: text("type").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull().default("medium"),
  resolved: boolean("resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertExceptionSchema = createInsertSchema(exceptionsTable).omit({ id: true, createdAt: true });
export type InsertException = z.infer<typeof insertExceptionSchema>;
export type Exception = typeof exceptionsTable.$inferSelect;
