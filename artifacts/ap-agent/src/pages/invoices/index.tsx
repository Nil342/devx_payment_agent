import { useState } from "react";
import { useLocation } from "wouter";
import { useListInvoices, getListInvoicesQueryKey } from "@workspace/api-client-react";
import { Shell } from "@/components/layout/Shell";
import { formatCurrency, formatDate, riskBg, statusBg } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutDashboard, RefreshCw, Search } from "lucide-react";
import { AddInvoiceDialog } from "./add-invoice-dialog";

function getInitialFilter(name: string, fallback = "all"): string {
  if (typeof window === "undefined") return fallback;
  return new URLSearchParams(window.location.search).get(name) ?? fallback;
}

export default function InvoicesPage() {
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState(() => getInitialFilter("status"));
  const [riskFilter, setRiskFilter] = useState(() => getInitialFilter("riskLevel"));
  const [search, setSearch] = useState("");

  const { data: invoices = [], isLoading, isFetching, refetch } = useListInvoices(
    {
      ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      ...(riskFilter !== "all" ? { riskLevel: riskFilter } : {}),
    },
    {
      query: {
        queryKey: getListInvoicesQueryKey({ status: statusFilter !== "all" ? statusFilter : undefined, riskLevel: riskFilter !== "all" ? riskFilter : undefined }),
        refetchInterval: 2_500,
      },
    }
  );

  const filtered = invoices.filter((inv) =>
    !search ||
    inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
    (inv.vendorName ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (inv.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Shell
      title="Invoice Inbox"
      subtitle={`${filtered.length} invoice${filtered.length !== 1 ? "s" : ""}`}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => setLocation("/")} className="gap-2 bg-white/70">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2 bg-white/70"
            data-testid="button-refresh-invoices"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </>
      }
    >
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-search"
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/80"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger data-testid="select-status" className="w-36 bg-white/80">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="flagged">Flagged</SelectItem>
            <SelectItem value="manager_review">Manager Review</SelectItem>
            <SelectItem value="cfo_review">CFO Review</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger data-testid="select-risk" className="w-36 bg-white/80">
            <SelectValue placeholder="Risk" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risk</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
        <AddInvoiceDialog />
      </div>

      <div className="bg-white/80 backdrop-blur-sm border border-border/60 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/30">
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Invoice #</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vendor</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Due</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Risk</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-border/40">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-5 py-3.5"><Skeleton className="h-4 w-20" /></td>
                  ))}
                </tr>
              ))
              : filtered.map((inv) => (
                <tr
                  key={inv.id}
                  data-testid={`row-invoice-${inv.id}`}
                  className="border-b border-border/40 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => setLocation(`/invoices/${inv.id}`)}
                >
                  <td className="px-5 py-3.5 font-medium text-primary">{inv.invoiceNumber}</td>
                  <td className="px-5 py-3.5 text-foreground">{inv.vendorName ?? `#${inv.vendorId}`}</td>
                  <td className="px-5 py-3.5 font-semibold text-foreground">{formatCurrency(inv.amount)}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{formatDate(inv.invoiceDate)}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{formatDate(inv.dueDate)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[11px] px-2 py-0.5 border font-medium ${riskBg(inv.riskLevel)}`}>
                        {inv.riskLevel}
                      </Badge>
                      {inv.riskScore != null && (
                        <span className="text-xs text-muted-foreground">{inv.riskScore}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge className={`text-[11px] px-2 py-0.5 border font-medium ${statusBg(inv.status)}`}>
                      {inv.status}
                    </Badge>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground text-sm">No invoices found</div>
        )}
      </div>
    </Shell>
  );
}
