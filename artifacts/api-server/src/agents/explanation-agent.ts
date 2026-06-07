import { callGroq } from "./groq-client";
import type { VendorMemory, RiskAssessment, RoutingDecision } from "./types";
import { logger } from "../lib/logger";

const SYSTEM_PROMPT = `You are a senior finance analyst AI assistant for an Accounts Payable system.
Generate clear, professional, human-readable explanations for invoice analysis decisions.
Be specific about vendor history, risk factors, and recommendations.
Write in third person. Be concise but comprehensive. 2-4 sentences.`;

export async function generateExplanation(
  invoice: { invoiceNumber: string; amount: number },
  vendorMemory: VendorMemory,
  risk: RiskAssessment,
  routing: RoutingDecision,
): Promise<string> {
  logger.info({ invoiceNumber: invoice.invoiceNumber }, "Generating explanation");

  const userPrompt = `Generate a professional explanation for this AP decision:

Invoice ${invoice.invoiceNumber} from ${vendorMemory.vendorName} for ₹${invoice.amount.toLocaleString()}
Risk Level: ${risk.riskLevel} (Score: ${risk.riskScore}/100)
Risk Factors: ${risk.riskFactors.join(", ")}
Decision: ${routing.action.replace("_", " ").toUpperCase()}
Vendor Trust Score: ${vendorMemory.trustScore}/100
Past Exceptions: ${vendorMemory.recentExceptions.length} (${vendorMemory.recentExceptions.filter((e) => e.severity === "high").length} high severity)
Past Dispute Rate: ${vendorMemory.disputeRate}%

Write a 2-4 sentence professional explanation for why this decision was made, referencing specific vendor history.`;

  const explanation = await callGroq(SYSTEM_PROMPT, userPrompt);
  logger.info("Explanation generated");
  return explanation.trim();
}

export function getFallbackExplanation(
  vendorName: string,
  invoiceNumber: string,
  amount: number,
  risk: RiskAssessment,
  routing: RoutingDecision,
): string {
  const action = routing.action.replace("_", " ");
  if (risk.riskLevel === "high") {
    return `Invoice ${invoiceNumber} from ${vendorName} for ₹${amount.toLocaleString()} has been flagged for ${action} due to elevated risk score of ${risk.riskScore}/100. Key factors: ${risk.riskFactors.slice(0, 2).join(" and ")}. Immediate review is recommended before processing.`;
  }
  return `Invoice ${invoiceNumber} from ${vendorName} for ₹${amount.toLocaleString()} has been routed for ${action}. Risk assessment score: ${risk.riskScore}/100 (${risk.riskLevel}). ${risk.riskFactors[0] ?? "Standard processing applies"}.`;
}
