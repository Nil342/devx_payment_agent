import { Router, type IRouter } from "express";
import { db, vendorsTable, exceptionsTable, decisionsTable, memoryEventsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { retrieveVendorMemory } from "../agents/memory-agent";
import { callGroq } from "../agents/groq-client";

const router: IRouter = Router();

router.get("/vendors", async (req, res): Promise<void> => {
  const vendors = await db.select().from(vendorsTable).orderBy(desc(vendorsTable.createdAt));
  res.json(vendors.map(serializeVendor));
});

router.post("/vendors", async (req, res): Promise<void> => {
  const { name, contactEmail, contactPhone, category, notes } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }

  const [vendor] = await db.insert(vendorsTable).values({ name, contactEmail, contactPhone, category, notes }).returning();
  res.status(201).json(serializeVendor(vendor));
});

router.get("/vendors/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [vendor] = await db.select().from(vendorsTable).where(eq(vendorsTable.id, id));
  if (!vendor) { res.status(404).json({ error: "Vendor not found" }); return; }
  res.json(serializeVendor(vendor));
});

router.patch("/vendors/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const allowed = ["name", "contactEmail", "contactPhone", "category", "status", "trustScore", "notes"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const [vendor] = await db.update(vendorsTable).set(updates).where(eq(vendorsTable.id, id)).returning();
  if (!vendor) { res.status(404).json({ error: "Vendor not found" }); return; }
  res.json(serializeVendor(vendor));
});

router.get("/vendors/:id/intelligence", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const memory = await retrieveVendorMemory(id);
  if (!memory) { res.status(404).json({ error: "Vendor not found" }); return; }

  const exceptions = await db.select().from(exceptionsTable).where(eq(exceptionsTable.vendorId, id)).orderBy(desc(exceptionsTable.createdAt)).limit(10);

  let summary = `${memory.vendorName} has a trust score of ${memory.trustScore}/100 with a dispute rate of ${memory.disputeRate}%.`;
  let recommendations: string[] = [];

  try {
    const prompt = `Vendor ${memory.vendorName}: trust score ${memory.trustScore}/100, dispute rate ${memory.disputeRate}%, ${memory.recentExceptions.length} recent exceptions. Generate a 2-sentence intelligence summary and 3 recommendations as JSON: {"summary": "...", "recommendations": ["...", "...", "..."]}`;
    const raw = await callGroq("You are a financial intelligence analyst. Return only valid JSON.", prompt);
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    summary = parsed.summary ?? summary;
    recommendations = parsed.recommendations ?? recommendations;
  } catch {
    recommendations = memory.trustScore < 60 ? ["Require dual approval for invoices > ₹50,000", "Flag all invoices for tax verification", "Schedule vendor review meeting"] : memory.disputeRate > 15 ? ["Monitor invoice amounts closely", "Request supporting documentation", "Review payment terms"] : ["Continue standard processing", "Annual vendor review recommended", "Maintain current approval workflow"];
  }

  res.json({
    vendorId: id,
    summary,
    riskFactors: memory.recentExceptions.slice(0, 5).map((e) => `[${e.severity}] ${e.type}`),
    paymentBehavior: memory.disputeRate > 20 ? "High dispute frequency" : memory.trustScore > 80 ? "Reliable payment history" : "Moderate reliability",
    disputeHistory: memory.recentExceptions.filter((e) => e.type === "dispute").map((e) => e.description),
    recommendations,
    recentExceptions: exceptions.map(serializeException),
  });
});

function serializeVendor(v: typeof vendorsTable.$inferSelect) {
  return {
    ...v,
    trustScore: Number(v.trustScore),
    disputeRate: Number(v.disputeRate),
    totalAmount: Number(v.totalAmount),
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  };
}

function serializeException(e: typeof exceptionsTable.$inferSelect) {
  return {
    ...e,
    createdAt: e.createdAt.toISOString(),
    resolvedAt: e.resolvedAt?.toISOString() ?? null,
    vendorName: null,
    invoiceNumber: null,
  };
}

export default router;
