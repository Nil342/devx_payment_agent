import { pgTable, serial, text, timestamp, numeric, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  approvalMode: text("approval_mode").notNull().default("hybrid"),
  autoApproveThreshold: numeric("auto_approve_threshold", { precision: 15, scale: 2 }).notNull().default("50000"),
  cfoReviewThreshold: numeric("cfo_review_threshold", { precision: 15, scale: 2 }).notNull().default("200000"),
  managerReviewThreshold: numeric("manager_review_threshold", { precision: 15, scale: 2 }).notNull().default("100000"),
  highRiskThreshold: numeric("high_risk_threshold", { precision: 5, scale: 2 }).notNull().default("70"),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true, updatedAt: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
