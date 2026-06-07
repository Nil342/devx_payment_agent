import { useGetDashboardStats } from "@workspace/api-client-react";
import { Shell } from "@/components/layout/Shell";
import { formatCurrency, formatDate, riskBg, statusBg } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  FileText, CheckCircle, Clock, AlertTriangle,
  TrendingUp, Building2, Activity
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from "recharts";

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white/80 backdrop-blur-sm border border-border/60 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useGetDashboardStats();

  const riskData = stats ? [
    { name: "Low", value: stats.riskDistribution.low, color: "#10b981" },
    { name: "Medium", value: stats.riskDistribution.medium, color: "#f59e0b" },
    { name: "High", value: stats.riskDistribution.high, color: "#ef4444" },
  ] : [];

  const exceptionData = stats?.exceptionTrends ?? [];

  return (
    <Shell
      title="Dashboard"
      subtitle="Real-time overview of AP operations and AI decisions"
    >
      {isLoading ? (
        <div className="grid grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Invoices" value={stats?.totalInvoices ?? 0} icon={FileText} color="bg-blue-50 text-blue-600" />
          <StatCard label="Pending Review" value={stats?.pendingInvoices ?? 0} icon={Clock} color="bg-amber-50 text-amber-600" />
          <StatCard label="Approved" value={stats?.approvedInvoices ?? 0} icon={CheckCircle} color="bg-emerald-50 text-emerald-600" />
          <StatCard label="Flagged" value={stats?.flaggedInvoices ?? 0} icon={AlertTriangle} color="bg-red-50 text-red-600" />
        </div>
      )}

      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Total Amount */}
        <div className="bg-white/80 backdrop-blur-sm border border-border/60 rounded-xl p-5 shadow-sm col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Total Invoice Value</h2>
          </div>
          {isLoading ? <Skeleton className="h-8 w-32" /> : (
            <p className="text-3xl font-bold text-primary" data-testid="text-total-amount">
              {formatCurrency(stats?.totalAmount ?? 0)}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">across all vendors</p>
        </div>

        {/* Risk Distribution */}
        <div className="bg-white/80 backdrop-blur-sm border border-border/60 rounded-xl p-5 shadow-sm col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-foreground">Risk Distribution</h2>
          </div>
          {isLoading ? <Skeleton className="h-20" /> : (
            <div className="flex items-end gap-6">
              <div className="flex-1 h-20">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={riskData} barSize={32}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip formatter={(v) => [v, "Invoices"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {riskData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 min-w-[100px]">
                {riskData.map(({ name, value, color }) => (
                  <div key={name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-xs text-muted-foreground">{name}</span>
                    <span className="text-xs font-semibold text-foreground ml-auto">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white/80 backdrop-blur-sm border border-border/60 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {(stats?.recentActivity ?? []).slice(0, 6).map((inv) => (
                <div key={inv.id} data-testid={`card-invoice-${inv.id}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/40 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{inv.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground truncate">{inv.vendorName ?? `Vendor #${inv.vendorId}`}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-xs font-semibold text-foreground">{formatCurrency(inv.amount)}</span>
                    <Badge className={`text-[10px] px-1.5 py-0 border ${statusBg(inv.status)}`}>{inv.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Vendors */}
        <div className="bg-white/80 backdrop-blur-sm border border-border/60 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Top Vendors</h2>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {(stats?.topVendors ?? []).slice(0, 5).map((vendor) => (
                <div key={vendor.id} data-testid={`card-vendor-${vendor.id}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/40 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{vendor.name}</p>
                    <p className="text-xs text-muted-foreground">{vendor.totalInvoices} invoices · {vendor.category}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <div className="text-right">
                      <p className="text-xs font-semibold text-foreground">{formatCurrency(vendor.totalAmount ?? 0)}</p>
                      <div className="flex items-center gap-1 justify-end mt-0.5">
                        <span className="text-[10px] text-muted-foreground">Trust:</span>
                        <span className={`text-[10px] font-bold ${
                          vendor.trustScore >= 80 ? "text-emerald-600" :
                          vendor.trustScore >= 50 ? "text-amber-600" : "text-red-600"
                        }`}>{vendor.trustScore}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {exceptionData.length > 0 && (
        <div className="mt-6 bg-white/80 backdrop-blur-sm border border-border/60 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-foreground">Exception Trends</h2>
          </div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={exceptionData} barSize={24}>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip formatter={(v) => [v, "Exceptions"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </Shell>
  );
}
