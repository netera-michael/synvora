"use client";

import useSWR from "swr";
import { useSession } from "next-auth/react";
import { TrendingUp, TrendingDown, ShoppingCart, DollarSign, BarChart2, Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const fmt = (n: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(n);

const fmtPct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;

type AnalyticsData = {
  months: { month: string; label: string; orders: number; revenue: number; payout: number; aedTotal: number }[];
  totals: { totalOrders: number; totalRevenue: number; totalPayout: number; avgOrderValue: number };
  breakdown: Record<string, number>;
  momPayoutChange: number | null;
  momOrdersChange: number | null;
};

const BADGE_COLORS: Record<string, string> = {
  Paid: "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
  Refunded: "bg-rose-100 text-rose-700",
};

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user.role === "ADMIN";
  const { data, isLoading } = useSWR<AnalyticsData>("/api/analytics", fetcher);

  const months = data?.months ?? [];
  const totals = data?.totals;
  const breakdown = data?.breakdown ?? {};
  const maxPayout = Math.max(...months.map((m) => m.payout), 1);
  const totalBreakdown = Object.values(breakdown).reduce((s, n) => s + n, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-synvora-text">Analytics</h1>
        <p className="mt-1 text-sm text-synvora-text-secondary">
          {isAdmin ? "Platform-wide performance overview" : "Your earnings and order performance"}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total orders"
          icon={ShoppingCart}
          value={isLoading ? null : String(totals?.totalOrders ?? 0)}
          change={data?.momOrdersChange ?? null}
          isLoading={isLoading}
        />
        <StatCard
          label={isAdmin ? "Total revenue (USD)" : "Gross sales (USD)"}
          icon={DollarSign}
          value={isLoading ? null : fmt(totals?.totalRevenue ?? 0)}
          isLoading={isLoading}
        />
        <StatCard
          label={isAdmin ? "Total client payout" : "Your earnings (USD)"}
          icon={Wallet}
          value={isLoading ? null : fmt(totals?.totalPayout ?? 0)}
          change={data?.momPayoutChange ?? null}
          highlight
          isLoading={isLoading}
        />
        <StatCard
          label="Avg order value"
          icon={BarChart2}
          value={isLoading ? null : fmt(totals?.avgOrderValue ?? 0)}
          isLoading={isLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Monthly payout bar chart */}
        <div className="lg:col-span-2 rounded-2xl border border-synvora-border bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-synvora-text">
            {isAdmin ? "Monthly payout (USD)" : "Monthly earnings (USD)"}
          </h2>
          <p className="mt-0.5 text-xs text-synvora-text-secondary">Last 12 months</p>

          {isLoading ? (
            <div className="mt-6 flex items-end gap-2 h-40">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="flex-1 rounded-t" style={{ height: `${Math.random() * 100 + 20}%` }} />
              ))}
            </div>
          ) : (
            <div className="mt-6 flex items-end gap-1.5 h-40">
              {months.map((m) => {
                const heightPct = maxPayout > 0 ? (m.payout / maxPayout) * 100 : 0;
                const isCurrentMonth = m.month === new Date().toISOString().slice(0, 7);
                return (
                  <div key={m.month} className="group relative flex flex-1 flex-col items-center gap-1">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center">
                      <div className="rounded-lg border border-synvora-border bg-white px-3 py-2 text-xs shadow-lg whitespace-nowrap">
                        <p className="font-semibold text-synvora-text">{fmt(m.payout)}</p>
                        <p className="text-synvora-text-secondary">{m.orders} order{m.orders !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="h-1.5 w-px bg-synvora-border" />
                    </div>
                    <div
                      className={cn(
                        "w-full rounded-t transition-all",
                        isCurrentMonth ? "bg-synvora-primary" : "bg-synvora-primary/20 group-hover:bg-synvora-primary/40"
                      )}
                      style={{ height: `${Math.max(heightPct, 2)}%` }}
                    />
                    <span className={cn("text-[10px]", isCurrentMonth ? "font-semibold text-synvora-primary" : "text-synvora-text-secondary")}>
                      {m.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payment status breakdown */}
        <div className="rounded-2xl border border-synvora-border bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-synvora-text">Payment status</h2>
          <p className="mt-0.5 text-xs text-synvora-text-secondary">All-time breakdown</p>

          {isLoading ? (
            <div className="mt-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full rounded-lg" />)}
            </div>
          ) : totalBreakdown === 0 ? (
            <p className="mt-6 text-sm text-synvora-text-secondary">No data yet.</p>
          ) : (
            <div className="mt-6 space-y-3">
              {Object.entries(breakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([status, count]) => {
                  const pct = Math.round((count / totalBreakdown) * 100);
                  return (
                    <div key={status}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                          BADGE_COLORS[status] ?? "bg-slate-100 text-synvora-text-secondary"
                        )}>
                          {status}
                        </span>
                        <span className="text-xs font-medium text-synvora-text">{count} <span className="text-synvora-text-secondary">({pct}%)</span></span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-synvora-surface-active">
                        <div
                          className={cn("h-full rounded-full transition-all",
                            status === "Paid" ? "bg-emerald-500" :
                            status === "Pending" ? "bg-amber-400" :
                            status === "Refunded" ? "bg-rose-500" : "bg-slate-400"
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Monthly summary */}
          {!isLoading && months.length > 0 && (
            <div className="mt-6 border-t border-synvora-border pt-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-synvora-text-secondary">This month</p>
              <div className="flex justify-between text-sm">
                <span className="text-synvora-text-secondary">Orders</span>
                <span className="font-semibold text-synvora-text">{months[11]?.orders ?? 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-synvora-text-secondary">{isAdmin ? "Payout" : "Earnings"}</span>
                <span className="font-semibold text-synvora-text">{fmt(months[11]?.payout ?? 0)}</span>
              </div>
              {data?.momPayoutChange != null && (
                <div className="flex items-center gap-1.5 text-xs">
                  {data.momPayoutChange >= 0
                    ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                    : <TrendingDown className="h-3.5 w-3.5 text-rose-500" />}
                  <span className={data.momPayoutChange >= 0 ? "text-emerald-600" : "text-rose-600"}>
                    {fmtPct(data.momPayoutChange)} vs last month
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Monthly table */}
      <div className="rounded-2xl border border-synvora-border bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-synvora-border">
          <h2 className="text-sm font-semibold text-synvora-text">Monthly breakdown</h2>
        </div>
        <table className="min-w-full divide-y divide-synvora-border text-sm">
          <thead className="bg-synvora-surface-active text-left text-xs font-semibold uppercase tracking-wide text-synvora-text-secondary">
            <tr>
              <th className="px-6 py-3">Month</th>
              <th className="px-6 py-3 text-right">Orders</th>
              <th className="px-6 py-3 text-right">Gross (USD)</th>
              {isAdmin && <th className="px-6 py-3 text-right">Total (AED)</th>}
              <th className="px-6 py-3 text-right">{isAdmin ? "Payout" : "Earnings"} (USD)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: isAdmin ? 5 : 4 }).map((_, j) => (
                      <td key={j} className="px-6 py-3"><Skeleton className="h-4 w-20" /></td>
                    ))}
                  </tr>
                ))
              : [...months].reverse().map((m) => {
                  const isCurrentMonth = m.month === new Date().toISOString().slice(0, 7);
                  return (
                    <tr key={m.month} className={isCurrentMonth ? "bg-synvora-primary/5" : "hover:bg-synvora-surface-active/50"}>
                      <td className="px-6 py-3 font-medium text-synvora-text">
                        {m.label}
                        {isCurrentMonth && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-synvora-primary/10 px-2 py-0.5 text-xs font-medium text-synvora-primary">
                            Current
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right text-synvora-text-secondary">{m.orders}</td>
                      <td className="px-6 py-3 text-right text-synvora-text">{fmt(m.revenue)}</td>
                      {isAdmin && (
                        <td className="px-6 py-3 text-right text-synvora-text-secondary">
                          {m.aedTotal > 0
                            ? new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(m.aedTotal)
                            : "—"}
                        </td>
                      )}
                      <td className="px-6 py-3 text-right font-semibold text-synvora-text">{fmt(m.payout)}</td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({
  label,
  icon: Icon,
  value,
  change,
  highlight = false,
  isLoading
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string | null;
  change?: number | null;
  highlight?: boolean;
  isLoading?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-2xl border p-5 shadow-sm",
      highlight ? "border-synvora-primary/20 bg-synvora-primary/5" : "border-synvora-border bg-white"
    )}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-synvora-text-secondary">{label}</p>
        <Icon className={cn("h-4 w-4", highlight ? "text-synvora-primary/60" : "text-synvora-text-secondary/40")} />
      </div>
      {isLoading ? (
        <Skeleton className="mt-3 h-7 w-32" />
      ) : (
        <p className={cn("mt-2 text-2xl font-bold", highlight ? "text-synvora-primary" : "text-synvora-text")}>
          {value}
        </p>
      )}
      {change != null && !isLoading && (
        <div className="mt-1.5 flex items-center gap-1 text-xs">
          {change >= 0
            ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            : <TrendingDown className="h-3.5 w-3.5 text-rose-500" />}
          <span className={change >= 0 ? "text-emerald-600" : "text-rose-600"}>
            {fmtPct(change)} vs last month
          </span>
        </div>
      )}
    </div>
  );
}
