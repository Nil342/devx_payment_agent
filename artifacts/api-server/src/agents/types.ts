export interface OcrResult {
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string | null;
  dueDate: string | null;
  amount: number;
  taxAmount: number | null;
  paymentTerms: string | null;
  rawText: string | null;
}

export interface VendorMemory {
  vendorId: number;
  vendorName: string;
  trustScore: number;
  disputeRate: number;
  totalInvoices: number;
  recentExceptions: Array<{
    type: string;
    description: string;
    severity: string;
    createdAt: string;
  }>;
  recentDecisions: Array<{
    action: string;
    reasoning: string;
    createdAt: string;
  }>;
  memoryEvents: Array<{
    eventType: string;
    content: string;
    importance: string | null;
    createdAt: string;
  }>;
}

export interface RiskAssessment {
  riskScore: number;
  riskLevel: "low" | "medium" | "high";
  confidence: number;
  riskFactors: string[];
  reasoning: string;
}

export interface RoutingDecision {
  action: "approve" | "reject" | "flag" | "manager_review" | "cfo_review";
  reasoning: string;
  confidence: number;
}

export interface AgentAnalysis {
  invoiceId: number;
  riskScore: number;
  riskLevel: string;
  confidence: number;
  reasoning: string;
  recommendation: string;
  agentDecision: string;
  riskFactors: string[];
  memoryContext: string[];
  vendorIntelligence: string | null;
}
