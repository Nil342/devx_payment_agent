import type { RiskAssessment, RoutingDecision } from "./types";
import { logger } from "../lib/logger";

export async function runRoutingAgent(
  risk: RiskAssessment,
  amount: number,
  approvalMode: string,
  thresholds: {
    autoApproveThreshold: number;
    cfoReviewThreshold: number;
    managerReviewThreshold: number;
  },
): Promise<RoutingDecision> {
  logger.info({ riskLevel: risk.riskLevel, amount, approvalMode }, "Running routing agent");

  if (approvalMode === "manual") {
    if (risk.riskLevel === "high" || amount > thresholds.cfoReviewThreshold) {
      return { action: "cfo_review", reasoning: "Manual mode: routed to CFO for human approval", confidence: risk.confidence };
    }
    return { action: "manager_review", reasoning: "Manual mode: routed to AP manager for human approval", confidence: risk.confidence };
  }

  if (approvalMode === "auto") {
    if (risk.riskLevel === "low" && amount <= thresholds.autoApproveThreshold) {
      return { action: "approve", reasoning: "Auto mode: low risk and within auto-approve threshold", confidence: 90 };
    }
    if (risk.riskLevel === "high" || amount > thresholds.cfoReviewThreshold) {
      return { action: "cfo_review", reasoning: "Auto mode: high risk or above CFO threshold", confidence: 95 };
    }
    if (amount > thresholds.managerReviewThreshold) {
      return { action: "manager_review", reasoning: "Auto mode: amount exceeds manager threshold", confidence: 85 };
    }
    if (risk.riskLevel === "medium") {
      return { action: "flag", reasoning: "Auto mode: medium risk requires review", confidence: 80 };
    }
    return { action: "approve", reasoning: "Auto mode: all checks passed", confidence: 85 };
  }

  if (risk.riskLevel === "high") {
    if (amount > thresholds.cfoReviewThreshold) {
      return { action: "cfo_review", reasoning: `High risk invoice (score: ${risk.riskScore}) above CFO threshold`, confidence: risk.confidence };
    }
    return { action: "flag", reasoning: `High risk: ${risk.riskFactors.join("; ")}`, confidence: risk.confidence };
  }

  if (risk.riskLevel === "medium") {
    if (amount > thresholds.managerReviewThreshold) {
      return { action: "manager_review", reasoning: "Medium risk above manager review threshold", confidence: risk.confidence };
    }
    return { action: "flag", reasoning: "Medium risk requires manual review", confidence: risk.confidence };
  }

  if (amount <= thresholds.autoApproveThreshold) {
    return { action: "approve", reasoning: "Low risk, within auto-approve threshold", confidence: risk.confidence };
  }

  return { action: "manager_review", reasoning: "Low risk but amount exceeds auto-approve threshold", confidence: risk.confidence };
}
