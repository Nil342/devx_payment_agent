import { callGroqJson } from "./groq-client";
import type { VendorMemory, RiskAssessment } from "./types";
import { logger } from "../lib/logger";

const SYSTEM_PROMPT = `You are a financial risk assessment AI for an Accounts Payable system.
Analyze invoice and vendor data to calculate risk scores.
Consider: vendor dispute history, invoice amount vs thresholds, tax mismatches, duplicate patterns.
IMPORTANT: You have an institutional memory of past exceptions. If an exception was resolved (e.g., vendor agreed to adjust tax), learn from the resolution notes and lower the risk if the current invoice matches the resolved pattern.
Be precise and data-driven. Return only valid JSON.`;

export async function runRiskAgent(
  invoice: {
    invoiceNumber: string;
    amount: number;
    taxAmount: number | null;
    paymentTerms: string | null;
  },
  vendorMemory: VendorMemory,
): Promise<RiskAssessment> {
  logger.info({ invoiceNumber: invoice.invoiceNumber }, "Running risk agent");

  const userPrompt = `Assess risk for this invoice:

Invoice:
- Number: ${invoice.invoiceNumber}
- Amount: ₹${invoice.amount.toLocaleString()}
- Tax Amount: ${invoice.taxAmount ? `₹${invoice.taxAmount}` : "Not specified"}
- Payment Terms: ${invoice.paymentTerms ?? "Not specified"}

Vendor: ${vendorMemory.vendorName}
- Trust Score: ${vendorMemory.trustScore}/100
- Dispute Rate: ${vendorMemory.disputeRate}%
- Total Past Invoices: ${vendorMemory.totalInvoices}
- Recent Exceptions (${vendorMemory.recentExceptions.length}):
${vendorMemory.recentExceptions.map((e) => `  * [${e.severity}] ${e.type}: ${e.description} ${e.resolved ? `(RESOLVED: ${e.resolvedNotes})` : "(OPEN)"}`).join("\n") || "  None"}
- Recent Decisions:
${vendorMemory.recentDecisions.slice(0, 5).map((d) => `  * ${d.action}: ${d.reasoning}`).join("\n") || "  None"}

Return JSON:
{
  "riskScore": 0-100,
  "riskLevel": "low" | "medium" | "high",
  "confidence": 0-100,
  "riskFactors": ["factor1", "factor2"],
  "reasoning": "detailed explanation"
}`;

  const result = await callGroqJson<RiskAssessment>(SYSTEM_PROMPT, userPrompt);
  logger.info({ riskLevel: result.riskLevel, riskScore: result.riskScore }, "Risk assessment complete");
  return result;
}

export function calculateBasicRisk(
  amount: number,
  vendorMemory: VendorMemory,
): RiskAssessment {
  const riskFactors: string[] = [];
  let riskScore = 0;

  if (amount > 200000) { riskScore += 30; riskFactors.push("Amount exceeds CFO review threshold (₹2L)"); }
  else if (amount > 100000) { riskScore += 15; riskFactors.push("Amount requires manager review (₹1L)"); }

  if (vendorMemory.trustScore < 50) { riskScore += 30; riskFactors.push("Low vendor trust score"); }
  else if (vendorMemory.trustScore < 75) { riskScore += 15; riskFactors.push("Below-average vendor trust score"); }

  if (vendorMemory.disputeRate > 30) { riskScore += 25; riskFactors.push(`High dispute rate: ${vendorMemory.disputeRate}%`); }
  else if (vendorMemory.disputeRate > 10) { riskScore += 10; riskFactors.push(`Elevated dispute rate: ${vendorMemory.disputeRate}%`); }

  const recentHighExceptions = vendorMemory.recentExceptions.filter((e) => e.severity === "high" && !e.resolved).length;
  if (recentHighExceptions > 0) { riskScore += recentHighExceptions * 10; riskFactors.push(`${recentHighExceptions} unresolved high-severity exceptions`); }

  riskScore = Math.min(100, riskScore);
  const riskLevel = riskScore >= 70 ? "high" : riskScore >= 40 ? "medium" : "low";

  return {
    riskScore,
    riskLevel,
    confidence: 75,
    riskFactors: riskFactors.length ? riskFactors : ["No significant risk factors identified"],
    reasoning: `Basic risk calculation: ${riskFactors.join("; ") || "Clean vendor record and normal amount"}`,
  };
}
