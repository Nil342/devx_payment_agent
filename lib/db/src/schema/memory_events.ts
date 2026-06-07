import { pgTable, serial, text, timestamp, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vendorsTable } from "./vendors";
import { invoicesTable } from "./invoices";

export const memoryEventsTable = pgTable("memory_events", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull().references(() => vendorsTable.id),
  invoiceId: integer("invoice_id").references(() => invoicesTable.id),
  eventType: text("event_type").notNull(),
  content: text("content").notNull(),
  importance: numeric("importance", { precision: 3, scale: 1 }),
  tags: text("tags"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMemoryEventSchema = createInsertSchema(memoryEventsTable).omit({ id: true, createdAt: true });
export type InsertMemoryEvent = z.infer<typeof insertMemoryEventSchema>;
export type MemoryEvent = typeof memoryEventsTable.$inferSelect;
