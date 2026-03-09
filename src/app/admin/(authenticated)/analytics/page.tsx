"use client";

import useSWR from "swr";
import { useState } from "react";
import { ChevronDown, ChevronUp, ChevronRight } from "lucide-react";
import { DayOrdersPanel } from "@/components/analytics/day-orders-panel";

type DayAnalytics = {
  date: string;
  label: string;
  ordersCount: number;
  totalEGP: number;
  totalUSD: number;
  totalAED: number;
};

type MonthAnalytics = {
  month: string;
  label: string;
  ordersCount: number;
  totalEGP: number;
  totalUSD: number;
  totalAED: number;
  days: DayAnalytics[];
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function fmt(n: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

function fmtUSD(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2
  }).format(n);
}

export default function AnalyticsPage() {
  const { data, isLoading, error } = useSWR<MonthAnalytics[]>("/api/analytics", fetcher);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [selectedDay, setSelectedDay] = useState<{ date: string; label: string } | null>(null);

  const toggleMonth = (month: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(month)) {
        next.delete(month);
      } else {
        next.add(month);
      }
      return next;
    });
  };

  const allTimeEGP = data?.reduce((s, m) => s + m.totalEGP, 0) ?? 0;
  const allTimeUSD = data?.reduce((s, m) => s + m.totalUSD, 0) ?? 0;
  const allTimeOrders = data?.reduce((s, m) => s + m.ordersCount, 0) ?? 0;

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-rose-50 px-6 py-10 text-center text-rose-600">
        <p className="text-lg font-semibold">Failed to load analytics.</p>
        <p className="mt-1 text-sm">Refresh the page or try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-synvora-text">Analytics</h1>
        <p className="mt-1 text-sm text-synvora-text-secondary">
          Monthly and daily revenue breakdown. Click a month to expand, then a day to view its orders.
        </p>
      </div>

      {/* All-time summary cards */}
      {!isLoading && data && data.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-synvora-border bg-white px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-synvora-text-secondary">
              All-time EGP
            </p>
            <p className="mt-1 text-xl font-semibold text-synvora-text tabular-nums">
              {fmt(allTimeEGP)}
            </p>
          </div>
          <div className="rounded-xl border border-synvora-border bg-white px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-synvora-text-secondary">
              All-time USD
            </p>
            <p className="mt-1 text-xl font-semibold text-synvora-text tabular-nums">
              {fmtUSD(allTimeUSD)}
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1 rounded-xl border border-synvora-border bg-white px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-synvora-text-secondary">
              Total Orders
            </p>
            <p className="mt-1 text-xl font-semibold text-synvora-text tabular-nums">
              {allTimeOrders.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Monthly accordion list */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-[68px] animate-pulse rounded-xl border border-synvora-border bg-white"
            />
          ))}
        </div>
      ) : !data?.length ? (
        <div className="rounded-2xl border border-dashed border-synvora-border bg-white/70 p-12 text-center">
          <p className="text-sm text-synvora-text-secondary">No order data available yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((month) => {
            const isExpanded = expandedMonths.has(month.month);

            return (
              <div
                key={month.month}
                className="rounded-xl border border-synvora-border bg-white overflow-hidden"
              >
                {/* Month header row */}
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
                        {fmt(month.totalEGP)} EGP
                      </span>
                      <span className="text-synvora-border hidden sm:inline">·</span>
                      <span className="text-synvora-text-secondary tabular-nums hidden sm:inline">
                        {fmtUSD(month.totalUSD)}
                      </span>
                      <span className="text-synvora-border hidden sm:inline">·</span>
                      <span className="text-synvora-text-secondary tabular-nums hidden sm:inline">
                        {fmt(month.totalAED)} AED
                      </span>
                      {/* Mobile: secondary numbers on same line, smaller */}
                      <span className="text-synvora-text-secondary tabular-nums text-xs sm:hidden">
                        {fmtUSD(month.totalUSD)} · {fmt(month.totalAED)} AED
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-synvora-text-secondary">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </button>

                {/* Expanded day rows */}
                {isExpanded && (
                  <div className="border-t border-synvora-border bg-[#FAFAFA]">
                    {/* Column headers */}
                    <div className="px-5 py-2 flex items-center gap-4 border-b border-synvora-border">
                      <div className="w-16 flex-shrink-0 text-xs font-medium uppercase tracking-wide text-synvora-text-secondary">
                        Day
                      </div>
                      <div className="flex-1 text-xs font-medium uppercase tracking-wide text-synvora-text-secondary">
                        EGP
                      </div>
                      <div className="hidden sm:block w-28 text-right text-xs font-medium uppercase tracking-wide text-synvora-text-secondary">
                        USD
                      </div>
                      <div className="hidden md:block w-28 text-right text-xs font-medium uppercase tracking-wide text-synvora-text-secondary">
                        AED
                      </div>
                      <div className="w-16 text-right text-xs font-medium uppercase tracking-wide text-synvora-text-secondary">
                        Orders
                      </div>
                      <div className="w-4 flex-shrink-0" />
                    </div>

                    {/* Day rows */}
                    <div className="divide-y divide-synvora-border">
                      {month.days.map((day) => (
                        <button
                          key={day.date}
                          onClick={() =>
                            setSelectedDay({
                              date: day.date,
                              label: `${day.label}, ${month.label}`
                            })
                          }
                          className="w-full text-left px-5 py-3 flex items-center gap-4 hover:bg-synvora-surface transition group"
                        >
                          <div className="w-16 flex-shrink-0">
                            <span className="text-sm font-medium text-synvora-text">{day.label}</span>
                          </div>
                          <div className="flex-1 text-sm font-semibold text-synvora-text tabular-nums">
                            {fmt(day.totalEGP)}
                          </div>
                          <div className="hidden sm:block w-28 text-right text-sm text-synvora-text-secondary tabular-nums">
                            {fmtUSD(day.totalUSD)}
                          </div>
                          <div className="hidden md:block w-28 text-right text-sm text-synvora-text-secondary tabular-nums">
                            {fmt(day.totalAED)}
                          </div>
                          <div className="w-16 text-right text-sm text-synvora-text-secondary">
                            {day.ordersCount}
                          </div>
                          <ChevronRight className="h-4 w-4 flex-shrink-0 text-synvora-border opacity-0 group-hover:opacity-100 transition" />
                        </button>
                      ))}
                    </div>

                    {/* Month subtotal row */}
                    <div className="px-5 py-3 flex items-center gap-4 bg-synvora-surface border-t-2 border-synvora-border">
                      <div className="w-16 flex-shrink-0">
                        <span className="text-xs font-semibold uppercase tracking-wide text-synvora-text-secondary">
                          Total
                        </span>
                      </div>
                      <div className="flex-1 text-sm font-bold text-synvora-text tabular-nums">
                        {fmt(month.totalEGP)}
                      </div>
                      <div className="hidden sm:block w-28 text-right text-sm font-bold text-synvora-text tabular-nums">
                        {fmtUSD(month.totalUSD)}
                      </div>
                      <div className="hidden md:block w-28 text-right text-sm font-bold text-synvora-text tabular-nums">
                        {fmt(month.totalAED)}
                      </div>
                      <div className="w-16 text-right text-sm font-bold text-synvora-text">
                        {month.ordersCount}
                      </div>
                      <div className="w-4 flex-shrink-0" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Day orders slide-over panel */}
      <DayOrdersPanel
        open={!!selectedDay}
        date={selectedDay?.date ?? null}
        dateLabel={selectedDay?.label ?? ""}
        onClose={() => setSelectedDay(null)}
      />
    </div>
  );
}
