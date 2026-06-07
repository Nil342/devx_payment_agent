import { Router, type IRouter } from "express";
import { db, decisionsTable, vendorsTable, invoicesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/decisions", async (req, res): Promise<void> => {
  const { invoiceId, vendorId } = req.query;

  const rows = await db
    .select({
      id: decisionsTable.id,
      invoiceId: decisionsTable.invoiceId,
      invoiceNumber: invoicesTable.invoiceNumber,
      vendorId: decisionsTable.vendorId,
      vendorName: vendorsTable.name,
      action: decisionsTable.action,
      reasoning: decisionsTable.reasoning,
      madeBy: decisionsTable.madeBy,
      confidence: decisionsTable.confidence,
      agentVersion: decisionsTable.agentVersion,
      createdAt: decisionsTable.createdAt,
    })
    .from(decisionsTable)
    .leftJoin(vendorsTable, eq(decisionsTable.vendorId, vendorsTable.id))
    .leftJoin(invoicesTable, eq(decisionsTable.invoiceId, invoicesTable.id))
    .orderBy(desc(decisionsTable.createdAt));

  let filtered = rows;
  if (invoiceId) filtered = filtered.filter((r) => r.invoiceId === Number(invoiceId));
  if (vendorId) filtered = filtered.filter((r) => r.vendorId === Number(vendorId));

  res.json(filtered.map((r) => ({
    ...r,
    confidence: r.confidence != null ? Number(r.confidence) : null,
    createdAt: r.createdAt.toISOString(),
  })));
});

router.post("/decisions", async (req, res): Promise<void> => {
  const { invoiceId, vendorId, action, reasoning, madeBy, confidence, agentVersion } = req.body;
  if (!invoiceId || !vendorId || !action || !reasoning || !madeBy) {
    res.status(400).json({ error: "invoiceId, vendorId, action, reasoning, madeBy are required" });
    return;
  }

  const [decision] = await db.insert(decisionsTable).values({
    invoiceId: Number(invoiceId),
    vendorId: Number(vendorId),
    action,
    reasoning,
    madeBy,
    confidence: confidence != null ? String(confidence) : null,
    agentVersion: agentVersion ?? null,
  }).returning();

  res.status(201).json({
    ...decision,
    confidence: decision.confidence != null ? Number(decision.confidence) : null,
    createdAt: decision.createdAt.toISOString(),
    invoiceNumber: null,
    vendorName: null,
  });
});

export default router;
