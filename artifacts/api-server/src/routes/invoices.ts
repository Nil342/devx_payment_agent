import { Router, type IRouter } from "express";
import { db, invoicesTable, vendorsTable, decisionsTable, exceptionsTable, settingsTable, memoryEventsTable } from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { orchestrateInvoiceAnalysis } from "../agents/orchestrator";
import { getAutopilotStatus, triggerAutopilotSoon } from "../agents/autopilot-agent";
import { runOcrAgent } from "../agents/ocr-agent";
import multer from "multer";
import { logger } from "../lib/logger";

import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Polyfill DOMMatrix for pdf-parse in modern Node.js environments
if (typeof (globalThis as any).DOMMatrix === "undefined") {
  (globalThis as any).DOMMatrix = class DOMMatrix {} as any;
}
const pdfParse = require("pdf-parse");
import Tesseract from "tesseract.js";

const upload = multer({ storage: multer.memoryStorage() });

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
  const { vendorId, invoiceNumber, invoiceDate, dueDate, amount, taxAmount, paymentTerms, description, fileUrl } = req.body;
  if (!vendorId || !invoiceNumber || amount == null) {
    res.status(400).json({ error: "vendorId, invoiceNumber, and amount are required" });
    return;
  }

  // Check for duplicate invoice number for the same vendor
  const [existing] = await db
    .select()
    .from(invoicesTable)
    .where(and(eq(invoicesTable.vendorId, Number(vendorId)), eq(invoicesTable.invoiceNumber, invoiceNumber)));

  if (existing) {
    res.status(409).json({ error: "Invoice with this number already exists for this vendor" });
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
    fileUrl: fileUrl ?? null,
  }).returning();

  // Update vendor totals
  await db.execute(
    sql`UPDATE ${vendorsTable} SET "totalInvoices" = "totalInvoices" + 1, "totalAmount" = "totalAmount" + ${amount} WHERE id = ${vendorId}`
  );

  const full = await db
    .select({ id: invoicesTable.id, vendorId: invoicesTable.vendorId, vendorName: vendorsTable.name, invoiceNumber: invoicesTable.invoiceNumber, invoiceDate: invoicesTable.invoiceDate, dueDate: invoicesTable.dueDate, amount: invoicesTable.amount, taxAmount: invoicesTable.taxAmount, paymentTerms: invoicesTable.paymentTerms, description: invoicesTable.description, status: invoicesTable.status, riskLevel: invoicesTable.riskLevel, riskScore: invoicesTable.riskScore, assignedReviewer: invoicesTable.assignedReviewer, fileUrl: invoicesTable.fileUrl, extractedData: invoicesTable.extractedData, createdAt: invoicesTable.createdAt, updatedAt: invoicesTable.updatedAt })
    .from(invoicesTable)
    .leftJoin(vendorsTable, eq(invoicesTable.vendorId, vendorsTable.id))
    .where(eq(invoicesTable.id, invoice.id));

  triggerAutopilotSoon();
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

router.get("/autopilot/status", async (_req, res): Promise<void> => {
  res.json(await getAutopilotStatus());
});

router.post("/autopilot/run", async (_req, res): Promise<void> => {
  triggerAutopilotSoon();
  res.status(202).json(await getAutopilotStatus());
});

router.post("/invoices/upload", upload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) { res.status(400).json({ error: "file is required" }); return; }

  try {
    const fs = require('fs');
    const path = require('path');
    const publicDir = path.join(process.cwd(), 'public');
    const uploadsDir = path.join(publicDir, 'uploads');
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
    
    const fileName = `${Date.now()}-${req.file.originalname || 'upload'}`;
    fs.writeFileSync(path.join(uploadsDir, fileName), req.file.buffer);
    const fileUrl = `/uploads/${fileName}`;

    try {
      const ocrData = await runOcrAgent(req.file.buffer, req.file.mimetype);
      res.json({ ...ocrData, fileUrl });
    } catch (error: any) {
      logger.error({ err: error?.message, stack: error?.stack }, "OCR agent failed, using fallback data");
      res.json({
        vendorName: "Unknown Vendor",
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount: 0,
        taxAmount: null,
        paymentTerms: "Net 30",
        rawText: "Extraction failed or unsupported file type",
        fileUrl
      });
    }
  } catch (error: any) {
    logger.error({ err: error?.message, stack: error?.stack, mimetype: req.file?.mimetype }, "Invoice upload processing failed");
    res.status(500).json({ error: `Error processing the file: ${error?.message || "Unknown error"}` });
  }
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
    flaggedInvoices: invoices.filter((i) => ["flagged", "cfo_review", "manager_review", "processing"].includes(i.status)).length,
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
