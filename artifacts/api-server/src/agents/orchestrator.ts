import { db, invoicesTable, decisionsTable, exceptionsTable, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { retrieveVendorMemory, writeMemoryEvent, updateVendorStats } from "./memory-agent";
import { runRiskAgent, calculateBasicRisk } from "./risk-agent";
import { runRoutingAgent } from "./routing-agent";
import { generateExplanation, getFallbackExplanation } from "./explanation-agent";
import type { AgentAnalysis } from "./types";
import { logger } from "../lib/logger";

export async function orchestrateInvoiceAnalysis(invoiceId: number): Promise<AgentAnalysis> {
  logger.info({ invoiceId }, "Starting invoice analysis orchestration");

  const [invoice] = await db
    .select({
      id: invoicesTable.id,
      vendorId: invoicesTable.vendorId,
      invoiceNumber: invoicesTable.invoiceNumber,
      amount: invoicesTable.amount,
      taxAmount: invoicesTable.taxAmount,
      paymentTerms: invoicesTable.paymentTerms,
    })
    .from(invoicesTable)
    .where(eq(invoicesTable.id, invoiceId));

  if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);

  const [settingsRow] = await db.select().from(settingsTable).limit(1);
  const settings = settingsRow ?? {
    approvalMode: "hybrid",
    autoApproveThreshold: "50000",
    cfoReviewThreshold: "200000",
    managerReviewThreshold: "100000",
    highRiskThreshold: "70",
  };

  const vendorMemory = await retrieveVendorMemory(invoice.vendorId);
  if (!vendorMemory) throw new Error(`Vendor ${invoice.vendorId} not found`);

  const invoiceData = {
    invoiceNumber: invoice.invoiceNumber,
    amount: Number(invoice.amount),
    taxAmount: invoice.taxAmount ? Number(invoice.taxAmount) : null,
    paymentTerms: invoice.paymentTerms,
  };

  let risk;
  try {
    risk = await runRiskAgent(invoiceData, vendorMemory);
  } catch (err) {
    logger.warn({ err }, "Groq risk agent failed, using basic risk calculation");
    risk = calculateBasicRisk(Number(invoice.amount), vendorMemory);
  }
  risk = applyConfiguredRiskBands(risk, Number(settings.highRiskThreshold));

  const routing = await runRoutingAgent(risk, Number(invoice.amount), settings.approvalMode, {
    autoApproveThreshold: Number(settings.autoApproveThreshold),
    cfoReviewThreshold: Number(settings.cfoReviewThreshold),
    managerReviewThreshold: Number(settings.managerReviewThreshold),
  });

  let explanation: string;
  try {
    explanation = await generateExplanation(invoiceData, vendorMemory, risk, routing);
  } catch (err) {
    logger.warn({ err }, "Groq explanation failed, using fallback");
    explanation = getFallbackExplanation(vendorMemory.vendorName, invoice.invoiceNumber, Number(invoice.amount), risk, routing);
  }

  await db
    .update(invoicesTable)
    .set({
      riskLevel: risk.riskLevel,
      riskScore: String(risk.riskScore),
      status: statusForRoutingAction(routing.action),
      assignedReviewer: routing.action === "cfo_review" ? "CFO" : routing.action === "manager_review" ? "Manager" : null,
    })
    .where(eq(invoicesTable.id, invoiceId));

  await db.insert(decisionsTable).values({
    invoiceId,
    vendorId: invoice.vendorId,
    action: routing.action,
    reasoning: explanation,
    madeBy: "agent",
    confidence: String(routing.confidence),
    agentVersion: "1.0.0",
  });

  if (risk.riskLevel === "high") {
    await db.insert(exceptionsTable).values({
      vendorId: invoice.vendorId,
      invoiceId,
      type: risk.riskFactors[0]?.toLowerCase().includes("tax") ? "tax_mismatch" : "high_risk",
      description: risk.riskFactors[0] ?? "High risk invoice detected by agent",
      severity: "high",
      resolved: false,
    });
  }

  await writeMemoryEvent({
    vendorId: invoice.vendorId,
    invoiceId,
    eventType: "invoice_analysis",
    content: `Invoice ${invoice.invoiceNumber} analyzed. Risk: ${risk.riskLevel} (${risk.riskScore}/100). Decision: ${routing.action}. ${explanation}`,
    importance: risk.riskScore / 10,
    tags: `${risk.riskLevel},${routing.action}`,
  });

  await updateVendorStats(invoice.vendorId);

  const memoryContext = vendorMemory.recentExceptions
    .slice(0, 3)
    .map((e) => `[${e.severity}] ${e.type}: ${e.description}`);

  logger.info({ invoiceId, riskLevel: risk.riskLevel, action: routing.action }, "Analysis complete");

  return {
    invoiceId,
    riskScore: risk.riskScore,
    riskLevel: risk.riskLevel,
    confidence: risk.confidence,
    reasoning: explanation,
    recommendation: routing.reasoning,
    agentDecision: routing.action,
    riskFactors: risk.riskFactors,
    memoryContext,
    vendorIntelligence: `Trust Score: ${vendorMemory.trustScore}/100, Dispute Rate: ${vendorMemory.disputeRate}%`,
  };
}

function statusForRoutingAction(action: string): string {
  if (action === "approve") return "approved";
  if (action === "reject") return "rejected";
  if (action === "manager_review") return "manager_review";
  if (action === "cfo_review") return "cfo_review";
  return "flagged";
}

function applyConfiguredRiskBands<T extends { riskScore: number; riskLevel: "low" | "medium" | "high"; riskFactors: string[] }>(
  risk: T,
  highRiskThreshold: number,
): T {
  const high = Number.isFinite(highRiskThreshold) ? Math.max(1, Math.min(100, highRiskThreshold)) : 70;
  const medium = Math.max(25, Math.round(high * 0.6));
  const riskLevel = risk.riskScore >= high ? "high" : risk.riskScore >= medium ? "medium" : "low";

  if (riskLevel === risk.riskLevel) return risk;

  return {
    ...risk,
    riskLevel,
    riskFactors: [
      ...risk.riskFactors,
      `Risk level adjusted by configured high-risk threshold (${high}/100)`,
    ],
  };
}
