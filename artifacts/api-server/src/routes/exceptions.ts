import { Router, type IRouter } from "express";
import { db, exceptionsTable, vendorsTable, invoicesTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { writeMemoryEvent, updateVendorStats } from "../agents/memory-agent";

const router: IRouter = Router();

router.get("/exceptions", async (req, res): Promise<void> => {
  const { vendorId, type } = req.query;

  const rows = await db
    .select({
      id: exceptionsTable.id,
      vendorId: exceptionsTable.vendorId,
      vendorName: vendorsTable.name,
      invoiceId: exceptionsTable.invoiceId,
      invoiceNumber: invoicesTable.invoiceNumber,
      type: exceptionsTable.type,
      description: exceptionsTable.description,
      severity: exceptionsTable.severity,
      resolved: exceptionsTable.resolved,
      resolvedAt: exceptionsTable.resolvedAt,
      notes: exceptionsTable.notes,
      createdAt: exceptionsTable.createdAt,
    })
    .from(exceptionsTable)
    .leftJoin(vendorsTable, eq(exceptionsTable.vendorId, vendorsTable.id))
    .leftJoin(invoicesTable, eq(exceptionsTable.invoiceId, invoicesTable.id))
    .orderBy(desc(exceptionsTable.createdAt));

  let filtered = rows;
  if (vendorId) filtered = filtered.filter((r) => r.vendorId === Number(vendorId));
  if (type) filtered = filtered.filter((r) => r.type === type);

  res.json(filtered.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    resolvedAt: r.resolvedAt?.toISOString() ?? null,
  })));
});

router.post("/exceptions", async (req, res): Promise<void> => {
  const { vendorId, invoiceId, type, description, severity, notes } = req.body;
  if (!vendorId || !invoiceId || !type || !description || !severity) {
    res.status(400).json({ error: "vendorId, invoiceId, type, description, severity are required" });
    return;
  }

  const [exception] = await db.insert(exceptionsTable).values({
    vendorId: Number(vendorId),
    invoiceId: Number(invoiceId),
    type,
    description,
    severity,
    notes: notes ?? null,
  }).returning();

  res.status(201).json({
    ...exception,
    createdAt: exception.createdAt.toISOString(),
    resolvedAt: exception.resolvedAt?.toISOString() ?? null,
    vendorName: null,
    invoiceNumber: null,
  });
});

router.patch("/exceptions/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { resolved, notes } = req.body;
  const updates: Record<string, unknown> = {};
  if (resolved !== undefined) {
    updates.resolved = resolved;
    updates.resolvedAt = resolved ? new Date() : null;
  }
  if (notes !== undefined) {
    updates.notes = notes;
  }

  const [exception] = await db.update(exceptionsTable).set(updates).where(eq(exceptionsTable.id, id)).returning();
  if (!exception) { res.status(404).json({ error: "Exception not found" }); return; }

  if (resolved) {
    await writeMemoryEvent({
      vendorId: exception.vendorId,
      invoiceId: exception.invoiceId ?? undefined,
      eventType: "exception_resolved",
      content: `Exception '${exception.type}' resolved. Resolution notes: ${notes ?? 'No notes provided.'}`,
      importance: 0.8,
      tags: `resolution,${exception.type}`,
    });
    await updateVendorStats(exception.vendorId);
  }

  const [full] = await db
    .select({
      id: exceptionsTable.id,
      vendorId: exceptionsTable.vendorId,
      vendorName: vendorsTable.name,
      invoiceId: exceptionsTable.invoiceId,
      invoiceNumber: invoicesTable.invoiceNumber,
      type: exceptionsTable.type,
      description: exceptionsTable.description,
      severity: exceptionsTable.severity,
      resolved: exceptionsTable.resolved,
      resolvedAt: exceptionsTable.resolvedAt,
      notes: exceptionsTable.notes,
      createdAt: exceptionsTable.createdAt,
    })
    .from(exceptionsTable)
    .leftJoin(vendorsTable, eq(exceptionsTable.vendorId, vendorsTable.id))
    .leftJoin(invoicesTable, eq(exceptionsTable.invoiceId, invoicesTable.id))
    .where(eq(exceptionsTable.id, id));

  res.json({
    ...full,
    createdAt: full.createdAt.toISOString(),
    resolvedAt: full.resolvedAt?.toISOString() ?? null,
  });
});

export default router;
