import { db, vendorsTable, exceptionsTable, decisionsTable, memoryEventsTable } from "@workspace/db";
import { eq, desc, and, or, ilike } from "drizzle-orm";
import type { VendorMemory } from "./types";
import { logger } from "../lib/logger";

export async function retrieveVendorMemory(vendorId: number): Promise<VendorMemory | null> {
  logger.info({ vendorId }, "Retrieving vendor memory");

  const [vendor] = await db
    .select()
    .from(vendorsTable)
    .where(eq(vendorsTable.id, vendorId));

  if (!vendor) return null;

  const exceptions = await db
    .select()
    .from(exceptionsTable)
    .where(eq(exceptionsTable.vendorId, vendorId))
    .orderBy(desc(exceptionsTable.createdAt))
    .limit(10);

  const decisions = await db
    .select()
    .from(decisionsTable)
    .where(eq(decisionsTable.vendorId, vendorId))
    .orderBy(desc(decisionsTable.createdAt))
    .limit(10);

  const memEvents = await db
    .select()
    .from(memoryEventsTable)
    .where(eq(memoryEventsTable.vendorId, vendorId))
    .orderBy(desc(memoryEventsTable.createdAt))
    .limit(20);

  return {
    vendorId: vendor.id,
    vendorName: vendor.name,
    trustScore: Number(vendor.trustScore),
    disputeRate: Number(vendor.disputeRate),
    totalInvoices: vendor.totalInvoices,
    recentExceptions: exceptions.map((e) => ({
      type: e.type,
      description: e.description,
      severity: e.severity,
      resolved: e.resolved ?? false,
      resolvedNotes: e.notes,
      createdAt: e.createdAt.toISOString(),
    })),
    recentDecisions: decisions.map((d) => ({
      action: d.action,
      reasoning: d.reasoning,
      createdAt: d.createdAt.toISOString(),
    })),
    memoryEvents: memEvents.map((m) => ({
      eventType: m.eventType,
      content: m.content,
      importance: m.importance,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

export async function writeMemoryEvent(data: {
  vendorId: number;
  invoiceId?: number;
  eventType: string;
  content: string;
  importance?: number;
  tags?: string;
}): Promise<void> {
  await db.insert(memoryEventsTable).values({
    vendorId: data.vendorId,
    invoiceId: data.invoiceId ?? null,
    eventType: data.eventType,
    content: data.content,
    importance: data.importance ? String(data.importance) : null,
    tags: data.tags ?? null,
  });
  logger.info({ vendorId: data.vendorId, eventType: data.eventType }, "Memory event written");
}

export async function searchMemoryEvents(query: string, vendorId?: number, limit = 20) {
  const conditions = [ilike(memoryEventsTable.content, `%${query}%`)];
  if (vendorId) conditions.push(eq(memoryEventsTable.vendorId, vendorId));

  return db
    .select({
      id: memoryEventsTable.id,
      vendorId: memoryEventsTable.vendorId,
      vendorName: vendorsTable.name,
      invoiceId: memoryEventsTable.invoiceId,
      eventType: memoryEventsTable.eventType,
      content: memoryEventsTable.content,
      importance: memoryEventsTable.importance,
      tags: memoryEventsTable.tags,
      createdAt: memoryEventsTable.createdAt,
    })
    .from(memoryEventsTable)
    .leftJoin(vendorsTable, eq(memoryEventsTable.vendorId, vendorsTable.id))
    .where(and(...conditions))
    .orderBy(desc(memoryEventsTable.createdAt))
    .limit(limit);
}

export async function updateVendorStats(vendorId: number): Promise<void> {
  const exceptions = await db
    .select()
    .from(exceptionsTable)
    .where(eq(exceptionsTable.vendorId, vendorId));

  const totalInvoices = await db
    .select()
    .from(decisionsTable)
    .where(eq(decisionsTable.vendorId, vendorId));

  const disputeCount = exceptions.filter((e) =>
    ["tax_mismatch", "duplicate", "dispute"].includes(e.type)
  ).length;

  const disputeRate = totalInvoices.length > 0
    ? Math.min(100, (disputeCount / Math.max(totalInvoices.length, 1)) * 100)
    : 0;

  const trustScore = Math.max(0, 100 - disputeRate * 2 - exceptions.filter((e) => e.severity === "high").length * 5);

  await db
    .update(vendorsTable)
    .set({
      disputeRate: String(disputeRate.toFixed(2)),
      trustScore: String(trustScore.toFixed(2)),
    })
    .where(eq(vendorsTable.id, vendorId));
}
