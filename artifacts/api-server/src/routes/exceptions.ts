import { Router, type IRouter } from "express";
import { db, exceptionsTable, vendorsTable, invoicesTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";

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

export default router;
