import { pgTable, serial, text, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vendorsTable } from "./vendors";

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull().references(() => vendorsTable.id),
  invoiceNumber: text("invoice_number").notNull(),
  invoiceDate: text("invoice_date"),
  dueDate: text("due_date"),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  taxAmount: numeric("tax_amount", { precision: 15, scale: 2 }),
  paymentTerms: text("payment_terms"),
  description: text("description"),
  status: text("status").notNull().default("pending"),
  riskLevel: text("risk_level").notNull().default("low"),
  riskScore: numeric("risk_score", { precision: 5, scale: 2 }),
  assignedReviewer: text("assigned_reviewer"),
  fileUrl: text("file_url"),
  extractedData: text("extracted_data"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;
