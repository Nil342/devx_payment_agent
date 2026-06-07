import { useState } from "react";
import { useListExceptions, getListExceptionsQueryKey } from "@workspace/api-client-react";
import { Shell } from "@/components/layout/Shell";
import { formatDate, severityBg } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, CheckCircle, Clock } from "lucide-react";
import { ResolveExceptionDialog } from "./exceptions/resolve-exception-dialog";

export default function ExceptionsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: exceptions = [], isLoading } = useListExceptions(
    typeFilter !== "all" ? { type: typeFilter } : {},
    { query: { queryKey: getListExceptionsQueryKey(typeFilter !== "all" ? { type: typeFilter } : {}) } }
  );

  const filtered = exceptions.filter((ex) =>
    !search ||
    ex.description.toLowerCase().includes(search.toLowerCase()) ||
    (ex.vendorName ?? "").toLowerCase().includes(search.toLowerCase()) ||
    ex.type.toLowerCase().includes(search.toLowerCase())
  );

  const exceptionTypes = [
    "tax_mismatch", "duplicate", "dispute", "amount_discrepancy",
    "late_delivery", "service_dispute", "overcharge", "surcharge_dispute"
  ];

  return (
    <Shell
      title="Exception Log"
      subtitle={`${filtered.length} exception${filtered.length !== 1 ? "s" : ""}`}
    >
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-search-exceptions"
            placeholder="Search exceptions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/80"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger data-testid="select-exception-type" className="w-44 bg-white/80">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {exceptionTypes.map((t) => (
              <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          : filtered.map((ex) => (
            <div
              key={ex.id}
              data-testid={`card-exception-${ex.id}`}
              className="bg-white/80 backdrop-blur-sm border border-border/60 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <Badge className={`text-[11px] px-2 py-0.5 border font-medium ${severityBg(ex.severity)}`}>
                      {ex.severity}
                    </Badge>
                    <span className="text-xs font-semibold text-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                      {ex.type.replace(/_/g, " ")}
                    </span>
                    {ex.resolved ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600">
                        <CheckCircle className="w-3 h-3" /> Resolved {formatDate(ex.resolvedAt)}
                      </span>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-xs text-amber-600">
                          <Clock className="w-3 h-3" /> Open
                        </span>
                        <ResolveExceptionDialog exceptionId={ex.id} />
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{ex.description}</p>
                  {ex.notes && <p className="text-xs text-muted-foreground mt-1">{ex.notes}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold text-foreground">{ex.vendorName ?? `#${ex.vendorId}`}</p>
                  {ex.invoiceNumber && (
                    <p className="text-xs text-primary mt-0.5">{ex.invoiceNumber}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{formatDate(ex.createdAt)}</p>
                </div>
              </div>
            </div>
          ))
        }
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground text-sm">No exceptions found</div>
        )}
      </div>
    </Shell>
  );
}
