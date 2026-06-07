import { useState } from "react";
import { useLocation } from "wouter";
import {
  useGetInvoice, useAnalyzeInvoice, useGetVendorIntelligence,
  useUpdateInvoice, useListExceptions, useListMemoryEvents,
  getGetInvoiceQueryKey, getGetVendorIntelligenceQueryKey,
  getListInvoicesQueryKey, getGetDashboardStatsQueryKey,
  getListExceptionsQueryKey, getListMemoryEventsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Shell } from "@/components/layout/Shell";
import { formatCurrency, formatDate, riskBg, statusBg, actionBg } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Cpu, AlertTriangle, CheckCircle, Brain, Target, Flag, XCircle } from "lucide-react";

interface Props { id: number }

interface AnalysisResult {
  riskScore: number;
  riskLevel: string;
  confidence: number;
  reasoning: string;
  recommendation: string;
  agentDecision: string;
  riskFactors: string[];
  memoryContext?: string[];
  vendorIntelligence?: string | null;
}

export default function InvoiceDetailPage({ id }: Props) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const { data: invoice, isLoading } = useGetInvoice(id, {
    query: { queryKey: getGetInvoiceQueryKey(id) }
  });

  const { data: intelligence } = useGetVendorIntelligence(invoice?.vendorId ?? 0, {
    query: {
      enabled: !!invoice?.vendorId,
      queryKey: getGetVendorIntelligenceQueryKey(invoice?.vendorId ?? 0)
    }
  });

  const { data: exceptions = [] } = useListExceptions(
    invoice?.vendorId ? { vendorId: invoice.vendorId } : {},
    {
      query: {
        enabled: !!invoice?.vendorId,
        queryKey: getListExceptionsQueryKey(invoice?.vendorId ? { vendorId: invoice.vendorId } : {})
      }
    }
  );

  const { data: memoryEvents = [] } = useListMemoryEvents(
    invoice?.vendorId ? { vendorId: invoice.vendorId } : {},
    {
      query: {
        enabled: !!invoice?.vendorId,
        queryKey: getListMemoryEventsQueryKey(invoice?.vendorId ? { vendorId: invoice.vendorId } : {})
      }
    }
  );

  const analyze = useAnalyzeInvoice({
    mutation: {
      onSuccess: (result) => {
        setAnalysisResult(result);
        qc.invalidateQueries({ queryKey: getGetInvoiceQueryKey(id) });
        toast({ title: "Analysis complete", description: "AI agent has assessed this invoice." });
      },
      onError: () => toast({ title: "Analysis failed", description: "Could not run AI analysis.", variant: "destructive" }),
    }
  });

  const updateInvoice = useUpdateInvoice({
    mutation: {
      onSuccess: (updated) => {
        qc.invalidateQueries({ queryKey: getGetInvoiceQueryKey(id) });
        qc.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        toast({
          title: "Invoice updated",
          description: `${updated.invoiceNumber} is now ${updated.status.replace(/_/g, " ")}.`,
        });
      },
      onError: () => toast({ title: "Update failed", description: "Could not update invoice status.", variant: "destructive" }),
    },
  });

  const handleAnalyze = () => {
    analyze.mutate({ id });
  };

  const handleStatusChange = (status: string) => {
    const assignedReviewer =
      status === "cfo_review" ? "CFO" :
      status === "manager_review" ? "AP Manager" :
      null;

    updateInvoice.mutate({
      id,
      data: {
        status,
        ...(assignedReviewer ? { assignedReviewer } : {}),
      },
    });
  };

  if (isLoading) {
    return (
      <Shell title="Invoice Detail" actions={
        <Button variant="ghost" size="sm" onClick={() => setLocation("/invoices")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      }>
        <Skeleton className="h-64 rounded-xl" />
      </Shell>
    );
  }

  if (!invoice) {
    return (
      <Shell title="Invoice Not Found">
        <p className="text-muted-foreground">Invoice #{id} not found.</p>
      </Shell>
    );
  }

  return (
    <Shell
      title={invoice.invoiceNumber}
      subtitle={invoice.vendorName ?? `Vendor #${invoice.vendorId}`}
      actions={
        <Button variant="ghost" size="sm" onClick={() => setLocation("/invoices")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      }
    >
      <div className="grid grid-cols-3 gap-6">
        {/* Main invoice info */}
        <div className="col-span-2 space-y-5">
          <div className="bg-white/80 backdrop-blur-sm border border-border/60 rounded-xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{invoice.invoiceNumber}</h2>
                <p className="text-sm text-muted-foreground">{invoice.description}</p>
              </div>
              <div className="flex gap-2">
                <Badge className={`text-xs px-2.5 py-1 border font-medium ${statusBg(invoice.status)}`}>{invoice.status}</Badge>
                <Badge className={`text-xs px-2.5 py-1 border font-medium ${riskBg(invoice.riskLevel)}`}>{invoice.riskLevel} risk</Badge>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-5">
              <Button
                data-testid="button-approve-invoice"
                size="sm"
                variant={invoice.status === "approved" ? "secondary" : "outline"}
                onClick={() => handleStatusChange("approved")}
                disabled={updateInvoice.isPending || invoice.status === "approved"}
                className="gap-2 bg-white/70"
              >
                <CheckCircle className="w-4 h-4" /> Approve
              </Button>
              <Button
                data-testid="button-manager-review-invoice"
                size="sm"
                variant={invoice.status === "manager_review" ? "secondary" : "outline"}
                onClick={() => handleStatusChange("manager_review")}
                disabled={updateInvoice.isPending || invoice.status === "manager_review"}
                className="gap-2 bg-white/70"
              >
                <Flag className="w-4 h-4" /> Manager
              </Button>
              <Button
                data-testid="button-cfo-review-invoice"
                size="sm"
                variant={invoice.status === "cfo_review" ? "secondary" : "outline"}
                onClick={() => handleStatusChange("cfo_review")}
                disabled={updateInvoice.isPending || invoice.status === "cfo_review"}
                className="gap-2 bg-white/70"
              >
                <AlertTriangle className="w-4 h-4" /> CFO
              </Button>
              <Button
                data-testid="button-reject-invoice"
                size="sm"
                variant={invoice.status === "rejected" ? "secondary" : "outline"}
                onClick={() => handleStatusChange("rejected")}
                disabled={updateInvoice.isPending || invoice.status === "rejected"}
                className="gap-2 bg-white/70"
              >
                <XCircle className="w-4 h-4" /> Reject
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Amount</p>
                <p className="text-xl font-bold text-foreground mt-0.5" data-testid="text-amount">{formatCurrency(invoice.amount)}</p>
              </div>
              {invoice.taxAmount != null && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Tax</p>
                  <p className="font-semibold text-foreground mt-0.5">{formatCurrency(invoice.taxAmount)}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Invoice Date</p>
                <p className="font-medium text-foreground mt-0.5">{formatDate(invoice.invoiceDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Due Date</p>
                <p className="font-medium text-foreground mt-0.5">{formatDate(invoice.dueDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Payment Terms</p>
                <p className="font-medium text-foreground mt-0.5">{invoice.paymentTerms ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Reviewer</p>
                <p className="font-medium text-foreground mt-0.5">{invoice.assignedReviewer ?? "Unassigned"}</p>
              </div>
              {invoice.riskScore != null && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Risk Score</p>
                  <p className={`text-xl font-bold mt-0.5 ${
                    invoice.riskScore >= 70 ? "text-red-600" :
                    invoice.riskScore >= 40 ? "text-amber-600" : "text-emerald-600"
                  }`}>{invoice.riskScore}/100</p>
                </div>
              )}
            </div>
          </div>

          {/* AI Analysis */}
          <div className="bg-white/80 backdrop-blur-sm border border-border/60 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">AI Analysis</h3>
              </div>
              <Button
                data-testid="button-analyze"
                size="sm"
                onClick={handleAnalyze}
                disabled={analyze.isPending}
              >
                {analyze.isPending ? "Analyzing..." : "Run Analysis"}
              </Button>
            </div>

            {analysisResult ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Risk Score</p>
                    <p className={`text-2xl font-bold mt-1 ${
                      analysisResult.riskScore >= 70 ? "text-red-600" :
                      analysisResult.riskScore >= 40 ? "text-amber-600" : "text-emerald-600"
                    }`}>{analysisResult.riskScore}/100</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Risk Level</p>
                    <Badge className={`mt-2 text-xs border ${riskBg(analysisResult.riskLevel)}`}>{analysisResult.riskLevel}</Badge>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Confidence</p>
                    <p className="text-2xl font-bold mt-1 text-foreground">{analysisResult.confidence}%</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Agent Decision</p>
                  <Badge className={`text-xs px-2.5 py-1 border ${actionBg(analysisResult.agentDecision)}`}>
                    {analysisResult.agentDecision.replace(/_/g, " ").toUpperCase()}
                  </Badge>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Reasoning</p>
                  <p className="text-sm text-foreground bg-muted/30 rounded-lg p-3">{analysisResult.reasoning}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Recommendation</p>
                  <p className="text-sm text-foreground bg-muted/30 rounded-lg p-3">{analysisResult.recommendation}</p>
                </div>

                {analysisResult.riskFactors.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Risk Factors</p>
                    <div className="space-y-1.5">
                      {analysisResult.riskFactors.map((f, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-foreground">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(analysisResult.memoryContext ?? []).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Memory Context</p>
                    <div className="space-y-1.5">
                      {(analysisResult.memoryContext ?? []).map((m, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-foreground bg-blue-50/60 rounded-lg p-2.5">
                          <Brain className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                          {m}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                <Target className="w-8 h-8 mb-3 opacity-40" />
                <p className="text-sm">Click "Run Analysis" to get AI risk assessment</p>
                <p className="text-xs mt-1">Groq agents will assess risk, check memory, and recommend action</p>
              </div>
            )}
          </div>
        </div>

        {/* Vendor sidebar */}
        <div className="space-y-5">
          <div className="bg-white/80 backdrop-blur-sm border border-border/60 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Vendor Intelligence</h3>
            </div>
            {intelligence ? (
              <div className="space-y-3">
                <p className="text-xs text-foreground leading-relaxed">{intelligence.summary}</p>
                {intelligence.riskFactors.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Risk Factors</p>
                    {intelligence.riskFactors.map((r, i) => (
                      <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5 mb-1">
                        <span className="text-amber-500 mt-0.5">•</span> {r}
                      </p>
                    ))}
                  </div>
                )}
                {intelligence.recommendations.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Recommendations</p>
                    {intelligence.recommendations.map((r, i) => (
                      <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5 mb-1">
                        <span className="text-emerald-500 mt-0.5">•</span> {r}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Loading vendor intelligence...</p>
            )}
          </div>

          {exceptions.length > 0 && (
            <div className="bg-white/80 backdrop-blur-sm border border-border/60 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-foreground">Recent Exceptions</h3>
              </div>
              <div className="space-y-3">
                {exceptions.slice(0, 3).map((ex) => (
                  <div key={ex.id} className="text-xs">
                    <p className="font-semibold text-foreground flex items-center gap-1.5 mb-0.5">
                      <Badge className={`text-[9px] px-1.5 py-0 border ${ex.resolved ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {ex.resolved ? 'Resolved' : 'Open'}
                      </Badge>
                      {ex.type.replace(/_/g, " ")}
                    </p>
                    <p className="text-muted-foreground">{ex.description}</p>
                    {ex.notes && <p className="text-muted-foreground italic mt-0.5">Notes: {ex.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {memoryEvents.length > 0 && (
            <div className="bg-white/80 backdrop-blur-sm border border-border/60 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-semibold text-foreground">Vendor Memory</h3>
              </div>
              <div className="space-y-3">
                {memoryEvents.slice(0, 3).map((m) => (
                  <div key={m.id} className="text-xs">
                    <p className="font-semibold text-foreground capitalize mb-0.5">{m.eventType.replace(/_/g, " ")}</p>
                    <p className="text-muted-foreground">{m.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
