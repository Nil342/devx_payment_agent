import { useLocation } from "wouter";
import {
  useGetVendor, useGetVendorIntelligence, useListInvoices,
  getGetVendorQueryKey, getGetVendorIntelligenceQueryKey, getListInvoicesQueryKey
} from "@workspace/api-client-react";
import { Shell } from "@/components/layout/Shell";
import { formatCurrency, formatDate, riskBg, statusBg } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Brain, AlertTriangle, CheckCircle, Star } from "lucide-react";

interface Props { id: number }

export default function VendorDetailPage({ id }: Props) {
  const [, setLocation] = useLocation();

  const { data: vendor, isLoading: vLoading } = useGetVendor(id, {
    query: { queryKey: getGetVendorQueryKey(id) }
  });
  const { data: intelligence, isLoading: iLoading } = useGetVendorIntelligence(id, {
    query: { queryKey: getGetVendorIntelligenceQueryKey(id) }
  });
  const { data: invoices = [] } = useListInvoices({ vendorId: id }, {
    query: { queryKey: getListInvoicesQueryKey({ vendorId: id }) }
  });

  if (vLoading) {
    return <Shell title="Vendor Detail" actions={<Button variant="ghost" size="sm" onClick={() => setLocation("/vendors")}><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>}>
      <Skeleton className="h-64 rounded-xl" />
    </Shell>;
  }

  if (!vendor) {
    return <Shell title="Vendor Not Found"><p className="text-muted-foreground">Vendor #{id} not found.</p></Shell>;
  }

  return (
    <Shell
      title={vendor.name}
      subtitle={`${vendor.category ?? "—"} · ${vendor.contactEmail ?? ""}`}
      actions={
        <Button variant="ghost" size="sm" onClick={() => setLocation("/vendors")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      }
    >
      <div className="grid grid-cols-3 gap-6">
        {/* Left: vendor info + invoices */}
        <div className="col-span-2 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/80 backdrop-blur-sm border border-border/60 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Trust Score</p>
              <p className={`text-3xl font-bold mt-1 ${
                vendor.trustScore >= 80 ? "text-emerald-600" :
                vendor.trustScore >= 50 ? "text-amber-600" : "text-red-600"
              }`}>{vendor.trustScore}<span className="text-lg">/100</span></p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm border border-border/60 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Dispute Rate</p>
              <p className={`text-3xl font-bold mt-1 ${vendor.disputeRate > 20 ? "text-red-600" : "text-emerald-600"}`}>
                {vendor.disputeRate}<span className="text-lg">%</span>
              </p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm border border-border/60 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Value</p>
              <p className="text-2xl font-bold text-primary mt-1">{formatCurrency(vendor.totalAmount ?? 0)}</p>
            </div>
          </div>

          {/* Invoice history */}
          <div className="bg-white/80 backdrop-blur-sm border border-border/60 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-4">Invoice History</h3>
            <div className="space-y-2">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  data-testid={`row-invoice-vendor-${inv.id}`}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => setLocation(`/invoices/${inv.id}`)}
                >
                  <div>
                    <p className="text-sm font-medium text-primary">{inv.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(inv.invoiceDate)} · {inv.description}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="text-sm font-semibold text-foreground">{formatCurrency(inv.amount)}</span>
                    <Badge className={`text-[11px] px-2 py-0.5 border ${riskBg(inv.riskLevel)}`}>{inv.riskLevel}</Badge>
                    <Badge className={`text-[11px] px-2 py-0.5 border ${statusBg(inv.status)}`}>{inv.status}</Badge>
                  </div>
                </div>
              ))}
              {invoices.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No invoices found for this vendor</p>}
            </div>
          </div>
        </div>

        {/* Right: intelligence */}
        <div className="space-y-5">
          <div className="bg-white/80 backdrop-blur-sm border border-border/60 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Badge className={`text-[11px] px-2 py-0.5 border font-medium ${statusBg(vendor.status)}`}>{vendor.status}</Badge>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium text-foreground mt-0.5">{vendor.contactEmail ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="font-medium text-foreground mt-0.5">{vendor.contactPhone ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Invoices</p>
                <p className="font-medium text-foreground mt-0.5">{vendor.totalInvoices}</p>
              </div>
              {vendor.notes && (
                <div>
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="text-xs text-foreground mt-0.5 leading-relaxed">{vendor.notes}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border border-border/60 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">AI Intelligence</h3>
            </div>
            {iLoading ? <Skeleton className="h-32" /> : intelligence ? (
              <div className="space-y-3">
                <p className="text-xs text-foreground leading-relaxed">{intelligence.summary}</p>
                {intelligence.paymentBehavior && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Payment Behavior</p>
                    <p className="text-xs text-foreground">{intelligence.paymentBehavior}</p>
                  </div>
                )}
                {intelligence.riskFactors.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Risk Factors</p>
                    {intelligence.riskFactors.map((r, i) => (
                      <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" /> {r}
                      </p>
                    ))}
                  </div>
                )}
                {intelligence.recommendations.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Recommendations</p>
                    {intelligence.recommendations.map((r, i) => (
                      <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <CheckCircle className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" /> {r}
                      </p>
                    ))}
                  </div>
                )}
                {intelligence.disputeHistory.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Dispute History</p>
                    {intelligence.disputeHistory.map((d, i) => (
                      <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <Star className="w-3 h-3 text-blue-400 mt-0.5 shrink-0" /> {d}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ) : <p className="text-xs text-muted-foreground">No intelligence data</p>}
          </div>
        </div>
      </div>
    </Shell>
  );
}
