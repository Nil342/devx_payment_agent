import { Router, type IRouter } from "express";
import { db, invoicesTable, vendorsTable, decisionsTable, exceptionsTable, settingsTable, memoryEventsTable } from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { orchestrateInvoiceAnalysis } from "../agents/orchestrator";
import { runOcrAgent } from "../agents/ocr-agent";

const router: IRouter = Router();

router.get("/invoices", async (req, res): Promise<void> => {
  const { status, vendorId, riskLevel } = req.query;

  const rows = await db
    .select({
      id: invoicesTable.id,
      vendorId: invoicesTable.vendorId,
      vendorName: vendorsTable.name,
      invoiceNumber: invoicesTable.invoiceNumber,
      invoiceDate: invoicesTable.invoiceDate,
      dueDate: invoicesTable.dueDate,
      amount: invoicesTable.amount,
      taxAmount: invoicesTable.taxAmount,
      paymentTerms: invoicesTable.paymentTerms,
      description: invoicesTable.description,
      status: invoicesTable.status,
      riskLevel: invoicesTable.riskLevel,
      riskScore: invoicesTable.riskScore,
      assignedReviewer: invoicesTable.assignedReviewer,
      fileUrl: invoicesTable.fileUrl,
      extractedData: invoicesTable.extractedData,
      createdAt: invoicesTable.createdAt,
      updatedAt: invoicesTable.updatedAt,
    })
    .from(invoicesTable)
    .leftJoin(vendorsTable, eq(invoicesTable.vendorId, vendorsTable.id))
    .orderBy(desc(invoicesTable.createdAt));

  let filtered = rows;
  if (status) filtered = filtered.filter((r) => r.status === status);
  if (vendorId) filtered = filtered.filter((r) => r.vendorId === Number(vendorId));
  if (riskLevel) filtered = filtered.filter((r) => r.riskLevel === riskLevel);

  res.json(filtered.map(serializeInvoice));
});

router.post("/invoices", async (req, res): Promise<void> => {
  const { vendorId, invoiceNumber, invoiceDate, dueDate, amount, taxAmount, paymentTerms, description } = req.body;
  if (!vendorId || !invoiceNumber || amount == null) {
    res.status(400).json({ error: "vendorId, invoiceNumber, and amount are required" });
    return;
  }

  const [invoice] = await db.insert(invoicesTable).values({
    vendorId: Number(vendorId),
    invoiceNumber,
    invoiceDate: invoiceDate ?? null,
    dueDate: dueDate ?? null,
    amount: String(amount),
    taxAmount: taxAmount != null ? String(taxAmount) : null,
    paymentTerms: paymentTerms ?? null,
    description: description ?? null,
  }).returning();

  const full = await db
    .select({ id: invoicesTable.id, vendorId: invoicesTable.vendorId, vendorName: vendorsTable.name, invoiceNumber: invoicesTable.invoiceNumber, invoiceDate: invoicesTable.invoiceDate, dueDate: invoicesTable.dueDate, amount: invoicesTable.amount, taxAmount: invoicesTable.taxAmount, paymentTerms: invoicesTable.paymentTerms, description: invoicesTable.description, status: invoicesTable.status, riskLevel: invoicesTable.riskLevel, riskScore: invoicesTable.riskScore, assignedReviewer: invoicesTable.assignedReviewer, fileUrl: invoicesTable.fileUrl, extractedData: invoicesTable.extractedData, createdAt: invoicesTable.createdAt, updatedAt: invoicesTable.updatedAt })
    .from(invoicesTable)
    .leftJoin(vendorsTable, eq(invoicesTable.vendorId, vendorsTable.id))
    .where(eq(invoicesTable.id, invoice.id));

  res.status(201).json(serializeInvoice(full[0]));
});

router.get("/invoices/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db
    .select({ id: invoicesTable.id, vendorId: invoicesTable.vendorId, vendorName: vendorsTable.name, invoiceNumber: invoicesTable.invoiceNumber, invoiceDate: invoicesTable.invoiceDate, dueDate: invoicesTable.dueDate, amount: invoicesTable.amount, taxAmount: invoicesTable.taxAmount, paymentTerms: invoicesTable.paymentTerms, description: invoicesTable.description, status: invoicesTable.status, riskLevel: invoicesTable.riskLevel, riskScore: invoicesTable.riskScore, assignedReviewer: invoicesTable.assignedReviewer, fileUrl: invoicesTable.fileUrl, extractedData: invoicesTable.extractedData, createdAt: invoicesTable.createdAt, updatedAt: invoicesTable.updatedAt })
    .from(invoicesTable)
    .leftJoin(vendorsTable, eq(invoicesTable.vendorId, vendorsTable.id))
    .where(eq(invoicesTable.id, id));

  if (!row) { res.status(404).json({ error: "Invoice not found" }); return; }
  res.json(serializeInvoice(row));
});

router.patch("/invoices/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const allowed = ["status", "riskLevel", "riskScore", "assignedReviewer", "description"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const [invoice] = await db.update(invoicesTable).set(updates).where(eq(invoicesTable.id, id)).returning();
  if (!invoice) { res.status(404).json({ error: "Invoice not found" }); return; }

  const [full] = await db
    .select({ id: invoicesTable.id, vendorId: invoicesTable.vendorId, vendorName: vendorsTable.name, invoiceNumber: invoicesTable.invoiceNumber, invoiceDate: invoicesTable.invoiceDate, dueDate: invoicesTable.dueDate, amount: invoicesTable.amount, taxAmount: invoicesTable.taxAmount, paymentTerms: invoicesTable.paymentTerms, description: invoicesTable.description, status: invoicesTable.status, riskLevel: invoicesTable.riskLevel, riskScore: invoicesTable.riskScore, assignedReviewer: invoicesTable.assignedReviewer, fileUrl: invoicesTable.fileUrl, extractedData: invoicesTable.extractedData, createdAt: invoicesTable.createdAt, updatedAt: invoicesTable.updatedAt })
    .from(invoicesTable)
    .leftJoin(vendorsTable, eq(invoicesTable.vendorId, vendorsTable.id))
    .where(eq(invoicesTable.id, id));

  res.json(serializeInvoice(full));
});

router.post("/invoices/:id/analyze", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const analysis = await orchestrateInvoiceAnalysis(id);
  res.json(analysis);
});

router.post("/invoices/upload", async (req, res): Promise<void> => {
  const { text } = req.body;
  if (!text) { res.status(400).json({ error: "text is required" }); return; }
  const result = await runOcrAgent(text);
  res.json(result);
});

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const invoices = await db
    .select({ id: invoicesTable.id, status: invoicesTable.status, riskLevel: invoicesTable.riskLevel, amount: invoicesTable.amount, vendorId: invoicesTable.vendorId, vendorName: vendorsTable.name, invoiceNumber: invoicesTable.invoiceNumber, invoiceDate: invoicesTable.invoiceDate, dueDate: invoicesTable.dueDate, taxAmount: invoicesTable.taxAmount, paymentTerms: invoicesTable.paymentTerms, description: invoicesTable.description, riskScore: invoicesTable.riskScore, assignedReviewer: invoicesTable.assignedReviewer, fileUrl: invoicesTable.fileUrl, extractedData: invoicesTable.extractedData, createdAt: invoicesTable.createdAt, updatedAt: invoicesTable.updatedAt })
    .from(invoicesTable)
    .leftJoin(vendorsTable, eq(invoicesTable.vendorId, vendorsTable.id))
    .orderBy(desc(invoicesTable.createdAt));

  const vendors = await db.select().from(vendorsTable).orderBy(desc(vendorsTable.totalInvoices)).limit(5);

  const exceptions = await db.select().from(exceptionsTable).orderBy(desc(exceptionsTable.createdAt));

  const monthCounts: Record<string, number> = {};
  for (const e of exceptions) {
    const month = e.createdAt.toISOString().slice(0, 7);
    monthCounts[month] = (monthCounts[month] ?? 0) + 1;
  }
  const exceptionTrends = Object.entries(monthCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, count]) => ({ month, count }));

  res.json({
    totalInvoices: invoices.length,
    pendingInvoices: invoices.filter((i) => i.status === "pending").length,
    approvedInvoices: invoices.filter((i) => i.status === "approved").length,
    flaggedInvoices: invoices.filter((i) => ["flagged", "cfo_review", "manager_review"].includes(i.status)).length,
    totalAmount: invoices.reduce((s, i) => s + Number(i.amount), 0),
    riskDistribution: {
      low: invoices.filter((i) => i.riskLevel === "low").length,
      medium: invoices.filter((i) => i.riskLevel === "medium").length,
      high: invoices.filter((i) => i.riskLevel === "high").length,
    },
    recentActivity: invoices.slice(0, 8).map(serializeInvoice),
    topVendors: vendors.map((v) => ({
      ...v,
      trustScore: Number(v.trustScore),
      disputeRate: Number(v.disputeRate),
      totalAmount: Number(v.totalAmount),
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    })),
    exceptionTrends,
  });
});

function parseId(param: string | string[]): number {
  const raw = Array.isArray(param) ? param[0] : param;
  return parseInt(raw, 10);
}

function serializeInvoice(r: { id: number; vendorId: number; vendorName: string | null; invoiceNumber: string; invoiceDate: string | null; dueDate: string | null; amount: string; taxAmount: string | null; paymentTerms: string | null; description: string | null; status: string; riskLevel: string; riskScore: string | null; assignedReviewer: string | null; fileUrl: string | null; extractedData: string | null; createdAt: Date; updatedAt: Date }) {
  return {
    ...r,
    amount: Number(r.amount),
    taxAmount: r.taxAmount != null ? Number(r.taxAmount) : null,
    riskScore: r.riskScore != null ? Number(r.riskScore) : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export default router;
