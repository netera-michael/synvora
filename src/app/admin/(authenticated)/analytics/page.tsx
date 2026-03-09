"use client";

import useSWR from "swr";
import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  TrendingUp, TrendingDown, ShoppingCart, DollarSign, BarChart2,
  Wallet, ChevronDown, ChevronUp, ChevronRight
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DayOrdersPanel } from "@/components/analytics/day-orders-panel";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const fmt = (n: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(n);

const fmtNum = (n: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const fmtPct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;

type DayData = {
  date: string;
  label: string;
  ordersCount: number;
  egpTotal: number;
  aedTotal: number;
  revenue: number;
  payout: number;
};

type MonthData = {
  month: string;
  label: string;
  ordersCount: number;
  egpTotal: number;
  aedTotal: number;
  revenue: number;
  payout: number;
  days: DayData[];
};

type AnalyticsData = {
  months: { month: string; label: string; orders: number; egpTotal: number; aedTotal: number; revenue: number; payout: number }[];
  totals: { totalOrders: number; totalRevenue: number; totalPayout: number; avgOrderValue: number; allTimeEGP: number; allTimeAED: number };
  breakdown: Record<string, number>;
  momPayoutChange: number | null;
  momOrdersChange: number | null;
  allMonths: MonthData[];
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

  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [selectedDay, setSelectedDay] = useState<{ date: string; label: string } | null>(null);

  const months = data?.months ?? [];
  const totals = data?.totals;
  const breakdown = data?.breakdown ?? {};
  const allMonths = data?.allMonths ?? [];
  const maxPayout = Math.max(...months.map((m) => m.payout), 1);
  const totalBreakdown = Object.values(breakdown).reduce((s, n) => s + n, 0);

  const toggleMonth = (month: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month); else next.add(month);
      return next;
    });
  };

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
                <Skeleton key={i} className="flex-1 rounded-t" style={{ height: `${(i + 1) * 7}%` }} />
              ))}
            </div>
          ) : (
            <div className="mt-6 flex items-end gap-1.5 h-40">
              {months.map((m) => {
                const heightPct = maxPayout > 0 ? (m.payout / maxPayout) * 100 : 0;
                const isCurrentMonth = m.month === new Date().toISOString().slice(0, 7);
                return (
                  <div key={m.month} className="group relative flex flex-1 flex-col items-center gap-1">
                    <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-10">
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
                        <span className="text-xs font-medium text-synvora-text">
                          {count} <span className="text-synvora-text-secondary">({pct}%)</span>
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-synvora-surface">
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

      {/* All-time accordion: Month → Day → Orders panel */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-synvora-text">All-time breakdown</h2>
          <p className="text-xs text-synvora-text-secondary">Click a month to expand, then a day to view orders</p>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl border border-synvora-border bg-white" />
            ))}
          </div>
        ) : allMonths.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-synvora-border bg-white/70 p-10 text-center">
            <p className="text-sm text-synvora-text-secondary">No order data yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {allMonths.map((month) => {
              const isExpanded = expandedMonths.has(month.month);
              return (
                <div key={month.month} className="rounded-xl border border-synvora-border bg-white overflow-hidden">
                  {/* Month row */}
                  <button
                    onClick={() => toggleMonth(month.month)}
                    className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-synvora-surface transition"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-synvora-text">{month.label}</span>
                        <span className="text-xs text-synvora-text-secondary bg-synvora-surface px-2 py-0.5 rounded-full border border-synvora-border">
                          {month.ordersCount} orders
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0 text-sm">
                        <span className="font-medium text-synvora-text tabular-nums">
                          {fmtNum(month.egpTotal)} EGP
                        </span>
                        <span className="text-synvora-border hidden sm:inline">·</span>
                        <span className="text-synvora-text-secondary tabular-nums hidden sm:inline">
                          {fmtNum(month.aedTotal)} AED
                        </span>
                        <span className="text-synvora-border hidden sm:inline">·</span>
                        <span className="text-synvora-text-secondary tabular-nums hidden sm:inline">
                          {fmt(month.revenue)}
                        </span>
                        <span className="text-synvora-border hidden sm:inline">·</span>
                        <span className="text-synvora-text-secondary tabular-nums hidden sm:inline">
                          {fmt(month.payout)} payout
                        </span>
                        <span className="text-synvora-text-secondary tabular-nums text-xs sm:hidden">
                          {fmtNum(month.aedTotal)} AED · {fmt(month.revenue)} · {fmt(month.payout)} payout
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-synvora-text-secondary">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </button>

                  {/* Day rows */}
                  {isExpanded && (
                    <div className="border-t border-synvora-border bg-[#FAFAFA]">
                      {/* Column headers */}
                      <div className="px-5 py-2 flex items-center gap-3 border-b border-synvora-border">
                        <div className="w-16 flex-shrink-0 text-xs font-medium uppercase tracking-wide text-synvora-text-secondary">Day</div>
                        <div className="flex-1 text-xs font-medium uppercase tracking-wide text-synvora-text-secondary">EGP</div>
                        <div className="hidden sm:block w-24 text-right text-xs font-medium uppercase tracking-wide text-synvora-text-secondary">AED</div>
                        <div className="hidden md:block w-28 text-right text-xs font-medium uppercase tracking-wide text-synvora-text-secondary">Revenue</div>
                        <div className="hidden lg:block w-28 text-right text-xs font-medium uppercase tracking-wide text-synvora-text-secondary">Payout</div>
                        <div className="w-14 text-right text-xs font-medium uppercase tracking-wide text-synvora-text-secondary">Orders</div>
                        <div className="w-4 flex-shrink-0" />
                      </div>

                      <div className="divide-y divide-synvora-border">
                        {month.days.map((day) => (
                          <button
                            key={day.date}
                            onClick={() => setSelectedDay({ date: day.date, label: `${day.label}, ${month.label}` })}
                            className="w-full text-left px-5 py-3 flex items-center gap-3 hover:bg-synvora-surface transition group"
                          >
                            <div className="w-16 flex-shrink-0">
                              <span className="text-sm font-medium text-synvora-text">{day.label}</span>
                            </div>
                            <div className="flex-1 text-sm font-semibold text-synvora-text tabular-nums">
                              {fmtNum(day.egpTotal)}
                            </div>
                            <div className="hidden sm:block w-24 text-right text-sm text-synvora-text-secondary tabular-nums">
                              {day.aedTotal > 0 ? fmtNum(day.aedTotal) : "—"}
                            </div>
                            <div className="hidden md:block w-28 text-right text-sm text-synvora-text-secondary tabular-nums">
                              {fmt(day.revenue)}
                            </div>
                            <div className="hidden lg:block w-28 text-right text-sm text-synvora-text-secondary tabular-nums">
                              {fmt(day.payout)}
                            </div>
                            <div className="w-14 text-right text-sm text-synvora-text-secondary">
                              {day.ordersCount}
                            </div>
                            <ChevronRight className="h-4 w-4 flex-shrink-0 text-synvora-border opacity-0 group-hover:opacity-100 transition" />
                          </button>
                        ))}
                      </div>

                      {/* Month subtotal */}
                      <div className="px-5 py-3 flex items-center gap-3 bg-synvora-surface border-t-2 border-synvora-border">
                        <div className="w-16 flex-shrink-0 text-xs font-semibold uppercase tracking-wide text-synvora-text-secondary">Total</div>
                        <div className="flex-1 text-sm font-bold text-synvora-text tabular-nums">{fmtNum(month.egpTotal)}</div>
                        <div className="hidden sm:block w-24 text-right text-sm font-bold text-synvora-text tabular-nums">
                          {month.aedTotal > 0 ? fmtNum(month.aedTotal) : "—"}
                        </div>
                        <div className="hidden md:block w-28 text-right text-sm font-bold text-synvora-text tabular-nums">{fmt(month.revenue)}</div>
                        <div className="hidden lg:block w-28 text-right text-sm font-bold text-synvora-text tabular-nums">{fmt(month.payout)}</div>
                        <div className="w-14 text-right text-sm font-bold text-synvora-text">{month.ordersCount}</div>
                        <div className="w-4 flex-shrink-0" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Day orders slide-over */}
      <DayOrdersPanel
        open={!!selectedDay}
        date={selectedDay?.date ?? null}
        dateLabel={selectedDay?.label ?? ""}
        onClose={() => setSelectedDay(null)}
      />
    </div>
  );
}

function StatCard({
  label, icon: Icon, value, change, highlight = false, isLoading
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
