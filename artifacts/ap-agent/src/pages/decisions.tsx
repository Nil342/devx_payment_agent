import { useState } from "react";
import { useListDecisions, getListDecisionsQueryKey } from "@workspace/api-client-react";
import { Shell } from "@/components/layout/Shell";
import { formatDate, actionBg } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ShieldCheck, Cpu } from "lucide-react";

export default function DecisionsPage() {
  const [search, setSearch] = useState("");

  const { data: decisions = [], isLoading } = useListDecisions({}, {
    query: { queryKey: getListDecisionsQueryKey({}) }
  });

  const filtered = decisions.filter((d) =>
    !search ||
    (d.vendorName ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (d.invoiceNumber ?? "").toLowerCase().includes(search.toLowerCase()) ||
    d.action.toLowerCase().includes(search.toLowerCase()) ||
    d.reasoning.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Shell
      title="Decision Audit"
      subtitle="AI agent decision log with reasoning and confidence"
    >
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-search-decisions"
            placeholder="Search decisions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/80"
          />
        </div>
      </div>

      <div className="space-y-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          : filtered.map((d) => (
            <div
              key={d.id}
              data-testid={`card-decision-${d.id}`}
              className="bg-white/80 backdrop-blur-sm border border-border/60 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  {d.madeBy === "agent"
                    ? <Cpu className="w-4 h-4 text-primary" />
                    : <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <Badge className={`text-[11px] px-2.5 py-0.5 border font-semibold ${actionBg(d.action)}`}>
                      {d.action.replace(/_/g, " ").toUpperCase()}
                    </Badge>
                    <span className="text-xs font-semibold text-foreground">
                      {d.invoiceNumber ?? `Invoice #${d.invoiceId}`}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      {d.vendorName ?? `Vendor #${d.vendorId}`}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground capitalize">{d.madeBy}</span>
                    {d.confidence != null && (
                      <>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className={`text-xs font-semibold ${
                          d.confidence >= 90 ? "text-emerald-600" :
                          d.confidence >= 70 ? "text-amber-600" : "text-red-600"
                        }`}>{d.confidence}% confidence</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{d.reasoning}</p>
                  {d.agentVersion && (
                    <p className="text-xs text-muted-foreground mt-1.5">Agent v{d.agentVersion}</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground shrink-0 mt-0.5">{formatDate(d.createdAt)}</p>
              </div>
            </div>
          ))
        }
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground text-sm">No decisions found</div>
        )}
      </div>
    </Shell>
  );
}
