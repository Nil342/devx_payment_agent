import { useState } from "react";
import { useLocation } from "wouter";
import { useListVendors, getListVendorsQueryKey } from "@workspace/api-client-react";
import { Shell } from "@/components/layout/Shell";
import { formatCurrency, statusBg } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, TrendingUp, TrendingDown } from "lucide-react";
import { AddVendorDialog } from "./add-vendor-dialog";

export default function VendorsPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");

  const { data: vendors = [], isLoading } = useListVendors({
    query: { queryKey: getListVendorsQueryKey() }
  });

  const filtered = vendors.filter((v) =>
    !search ||
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    (v.category ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Shell
      title="Vendor Intelligence"
      subtitle={`${filtered.length} vendor${filtered.length !== 1 ? "s" : ""}`}
    >
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-search-vendors"
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/80"
          />
        </div>
        <AddVendorDialog />
      </div>

      <div className="bg-white/80 backdrop-blur-sm border border-border/60 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/30">
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vendor</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Trust Score</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dispute Rate</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Invoices</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Value</th>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border/40">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-5 py-3.5"><Skeleton className="h-4 w-20" /></td>
                  ))}
                </tr>
              ))
              : filtered.map((vendor) => (
                <tr
                  key={vendor.id}
                  data-testid={`row-vendor-${vendor.id}`}
                  className="border-b border-border/40 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => setLocation(`/vendors/${vendor.id}`)}
                >
                  <td className="px-5 py-3.5">
                    <div>
                      <p className="font-semibold text-foreground">{vendor.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{vendor.contactEmail}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{vendor.category ?? "—"}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            vendor.trustScore >= 80 ? "bg-emerald-500" :
                            vendor.trustScore >= 50 ? "bg-amber-500" : "bg-red-500"
                          }`}
                          style={{ width: `${vendor.trustScore}%` }}
                        />
                      </div>
                      <span className={`text-sm font-bold ${
                        vendor.trustScore >= 80 ? "text-emerald-600" :
                        vendor.trustScore >= 50 ? "text-amber-600" : "text-red-600"
                      }`}>{vendor.trustScore}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      {vendor.disputeRate > 20
                        ? <TrendingUp className="w-3.5 h-3.5 text-red-500" />
                        : <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
                      }
                      <span className={`text-sm font-medium ${vendor.disputeRate > 20 ? "text-red-600" : "text-emerald-600"}`}>
                        {vendor.disputeRate}%
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-foreground font-medium">{vendor.totalInvoices}</td>
                  <td className="px-5 py-3.5 font-semibold text-foreground">{formatCurrency(vendor.totalAmount ?? 0)}</td>
                  <td className="px-5 py-3.5">
                    <Badge className={`text-[11px] px-2 py-0.5 border font-medium ${statusBg(vendor.status)}`}>
                      {vendor.status}
                    </Badge>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground text-sm">No vendors found</div>
        )}
      </div>
    </Shell>
  );
}
