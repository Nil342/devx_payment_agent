import type { ElementType } from "react";
import { useLocation } from "wouter";
import { getGetDashboardStatsQueryKey, useGetDashboardStats } from "@workspace/api-client-react";
import { Shell } from "@/components/layout/Shell";
import { formatCurrency, riskBg, statusBg } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Brain,
  Building2,
  CheckCircle,
  Clock,
  FileText,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  onClick,
}: {
  label: string;
  value: string | number;
  icon: ElementType;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="glass-panel group rounded-xl p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
        Open view <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </button>
  );
}

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading } = useGetDashboardStats({
    query: { queryKey: getGetDashboardStatsQueryKey(), refetchInterval: 3_000 }
  });

  const riskData = stats ? [
    { name: "Low", value: stats.riskDistribution.low, color: "#10b981" },
    { name: "Medium", value: stats.riskDistribution.medium, color: "#f59e0b" },
    { name: "High", value: stats.riskDistribution.high, color: "#ef4444" },
  ] : [];

  const statusData = stats ? [
    { name: "Pending", value: stats.pendingInvoices, color: "#2563eb" },
    { name: "Approved", value: stats.approvedInvoices, color: "#10b981" },
    { name: "Flagged", value: stats.flaggedInvoices, color: "#f59e0b" },
  ] : [];

  const highRiskCount = stats?.riskDistribution.high ?? 0;
  const automationRate = stats?.totalInvoices
    ? Math.round((stats.approvedInvoices / stats.totalInvoices) * 100)
    : 0;
  const exceptionData = stats?.exceptionTrends ?? [];

  return (
    <Shell
      title="Dashboard"
      subtitle="Live accounts payable operations, agent decisions, and vendor risk"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setLocation("/memory")} className="gap-2 bg-white/70">
            <Brain className="h-4 w-4" /> Memory
          </Button>
          <Button size="sm" onClick={() => setLocation("/invoices")} className="gap-2">
            <FileText className="h-4 w-4" /> Invoices
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total Invoices" value={stats?.totalInvoices ?? 0} icon={FileText} color="bg-blue-50 text-blue-600" onClick={() => setLocation("/invoices")} />
          <StatCard label="Pending Review" value={stats?.pendingInvoices ?? 0} icon={Clock} color="bg-amber-50 text-amber-600" onClick={() => setLocation("/invoices?status=pending")} />
          <StatCard label="Approved" value={stats?.approvedInvoices ?? 0} icon={CheckCircle} color="bg-emerald-50 text-emerald-600" onClick={() => setLocation("/invoices?status=approved")} />
          <StatCard label="Flagged" value={stats?.flaggedInvoices ?? 0} icon={AlertTriangle} color="bg-red-50 text-red-600" onClick={() => setLocation("/exceptions")} />
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="glass-panel rounded-xl p-5 xl:col-span-1">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Invoice Value</h2>
          </div>
          {isLoading ? <Skeleton className="h-10 w-40" /> : (
            <>
              <p className="text-3xl font-bold text-primary" data-testid="text-total-amount">
                {formatCurrency(stats?.totalAmount ?? 0)}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-white/50 p-3">
                  <p className="text-xs text-muted-foreground">Automation</p>
                  <p className="text-xl font-bold text-foreground">{automationRate}%</p>
                </div>
                <div className="rounded-lg bg-white/50 p-3">
                  <p className="text-xs text-muted-foreground">High Risk</p>
                  <p className="text-xl font-bold text-red-600">{highRiskCount}</p>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="glass-panel rounded-xl p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Operational Mix</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/decisions")} className="gap-1">
              Audit <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          {isLoading ? <Skeleton className="h-52" /> : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={4}>
                      {statusData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [v, "Invoices"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 self-center">
                {statusData.map(({ name, value, color }) => (
                  <button
                    type="button"
                    key={name}
                    onClick={() => setLocation(`/invoices?status=${name.toLowerCase()}`)}
                    className="flex w-full items-center gap-3 rounded-lg bg-white/50 px-3 py-2 text-left transition-colors hover:bg-white/80"
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-sm text-muted-foreground">{name}</span>
                    <span className="ml-auto text-sm font-semibold text-foreground">{value}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="glass-panel rounded-xl p-5">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-foreground">Risk Distribution</h2>
          </div>
          {isLoading ? <Skeleton className="h-44" /> : (
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskData} barSize={42}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip formatter={(v) => [v, "Invoices"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {riskData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="glass-panel rounded-xl p-5">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Exception Trend</h2>
          </div>
          {isLoading ? <Skeleton className="h-44" /> : exceptionData.length > 0 ? (
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={exceptionData}>
                  <defs>
                    <linearGradient id="exceptions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.55} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip formatter={(v) => [v, "Exceptions"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Area type="monotone" dataKey="count" stroke="#f59e0b" fill="url(#exceptions)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">No exception trend data yet</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="glass-panel rounded-xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/invoices")}>View all</Button>
          </div>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <div className="space-y-2">
              {(stats?.recentActivity ?? []).slice(0, 6).map((inv) => (
                <button
                  type="button"
                  key={inv.id}
                  data-testid={`card-invoice-${inv.id}`}
                  onClick={() => setLocation(`/invoices/${inv.id}`)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{inv.invoiceNumber}</p>
                    <p className="truncate text-xs text-muted-foreground">{inv.vendorName ?? `Vendor #${inv.vendorId}`}</p>
                  </div>
                  <div className="ml-2 flex shrink-0 items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{formatCurrency(inv.amount)}</span>
                    <Badge className={`border px-1.5 py-0 text-[10px] ${statusBg(inv.status)}`}>{inv.status}</Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="glass-panel rounded-xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Top Vendors</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/vendors")}>View all</Button>
          </div>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : (
            <div className="space-y-2">
              {(stats?.topVendors ?? []).slice(0, 5).map((vendor) => (
                <button
                  type="button"
                  key={vendor.id}
                  data-testid={`card-vendor-${vendor.id}`}
                  onClick={() => setLocation(`/vendors/${vendor.id}`)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{vendor.name}</p>
                    <p className="text-xs text-muted-foreground">{vendor.totalInvoices} invoices · {vendor.category}</p>
                  </div>
                  <div className="ml-2 flex shrink-0 items-center gap-2">
                    <ShieldCheck className={vendor.trustScore >= 80 ? "h-4 w-4 text-emerald-500" : vendor.trustScore >= 50 ? "h-4 w-4 text-amber-500" : "h-4 w-4 text-red-500"} />
                    <span className="text-xs font-bold text-foreground">{vendor.trustScore}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
