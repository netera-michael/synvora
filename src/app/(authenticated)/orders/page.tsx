"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { Plus, Printer, RefreshCw } from "lucide-react";
import type { OrderDto } from "@/types/orders";
import { OrderTable } from "@/components/orders/order-table";
import { OrderDrawer } from "@/components/orders/order-drawer";
import { CreateOrderDialog } from "@/components/orders/create-order-dialog";
import { SyncShopifyDialog } from "@/components/orders/sync-shopify-dialog";

type OrdersResponse = {
  orders: OrderDto[];
  metrics: {
    ordersCount: number;
    totalRevenue: number;
    averageOrderValue: number;
    totalPayout: number;
    totalTicketsValue: number;
    pendingFulfillment: number;
  };
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const calculatePayout = (order: OrderDto) => {
  if (order.originalAmount !== null && typeof order.originalAmount === "number" && order.exchangeRate && order.exchangeRate > 0) {
    const base = order.originalAmount / order.exchangeRate;
    return base * 0.9825;
  }
  return order.totalAmount * 0.9825;
};

export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const monthFilter = searchParams.get("month") ?? "all";
  const queryString = monthFilter === "all" ? "" : `?month=${monthFilter}`;
  const { data, error, mutate, isLoading } = useSWR<OrdersResponse>(`/api/orders${queryString}`, fetcher);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderDto | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [duplicateOrder, setDuplicateOrder] = useState<OrderDto | null>(null);

  const months = useMemo(() => {
    const now = new Date();
    const options = Array.from({ length: 6 }).map((_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
      const value = date.toISOString().slice(0, 7);
      const label = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      return { value, label };
    });
    return [{ value: "all", label: "All orders" }, ...options];
  }, []);

  const handleMonthChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("month");
    } else {
      params.set("month", value);
    }

    const qs = params.toString();
    const target = qs ? `/orders?${qs}` : "/orders";
    router.replace(target as Route);
  };

  const openDrawer = (order: OrderDto) => {
    setSelectedOrder(order);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedOrder(null);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleOrderCreated = (order: OrderDto) => {
    mutate(
      (current) =>
        current
          ? {
              ...current,
              orders: [order, ...current.orders],
              metrics: {
                ...current.metrics,
                ordersCount: current.metrics.ordersCount + 1,
                totalRevenue: current.metrics.totalRevenue + order.totalAmount,
                averageOrderValue:
                  (current.metrics.totalRevenue + order.totalAmount) / (current.metrics.ordersCount + 1),
                totalPayout: current.metrics.totalPayout + calculatePayout(order)
              }
            }
          : current,
      false
    );
    mutate();
    setDuplicateOrder(null);
  };

  const handleOrderUpdated = (order: OrderDto) => {
    mutate(
      (current) =>
        current
          ? {
              ...current,
              orders: current.orders.map((existing) => (existing.id === order.id ? order : existing))
            }
          : current,
      false
    );
    mutate();
    setSelectedOrder(order);
  };

  const handleOrderDeleted = (orderId: number) => {
    mutate(
      (current) =>
        current
          ? {
              ...current,
              orders: current.orders.filter((item) => item.id !== orderId),
              metrics: (() => {
                const removed = current.orders.find((item) => item.id === orderId);
                const nextOrdersCount = Math.max(0, current.metrics.ordersCount - 1);
                const nextTotalRevenue = removed
                  ? current.metrics.totalRevenue - removed.totalAmount
                  : current.metrics.totalRevenue;
                const nextTotalPayout = removed
                  ? current.metrics.totalPayout - calculatePayout(removed)
                  : current.metrics.totalPayout;
                const nextAverage = nextOrdersCount
                  ? nextTotalRevenue / nextOrdersCount
                  : 0;
                return {
                  ...current.metrics,
                  ordersCount: nextOrdersCount,
                  totalRevenue: nextTotalRevenue,
                  totalPayout: nextTotalPayout,
                  averageOrderValue: nextAverage
                };
              })()
            }
          : current,
      false
    );
    mutate();
    closeDrawer();
  };

  const handleDuplicate = (order: OrderDto) => {
    setDuplicateOrder(order);
    setIsCreateOpen(true);
  };

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-rose-50 px-6 py-10 text-center text-rose-600">
        <p className="text-lg font-semibold">We ran into an issue fetching orders.</p>
        <p className="mt-2 text-sm">
          Refresh the page or try again later. If the problem persists, check your API credentials.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Orders</h1>
          <p className="mt-2 text-sm text-slate-500">
            Monitor and manage your Synvora and Shopify orders in a single command center.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={monthFilter}
            onChange={(event) => handleMonthChange(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
          >
            {months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setIsSyncOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-synvora-primary hover:text-synvora-primary"
          >
            <RefreshCw className="h-4 w-4" />
            Sync Shopify
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-synvora-primary hover:text-synvora-primary"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-synvora-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-synvora-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create order
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Orders</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">
            {data?.metrics.ordersCount ?? (isLoading ? "…" : 0)}
          </p>
          <p className="mt-1 text-sm text-slate-500">Across selected timeframe</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Revenue</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">
            {data ? `$${data.metrics.totalRevenue.toFixed(2)}` : isLoading ? "…" : "$0.00"}
          </p>
          <p className="mt-1 text-sm text-slate-500">Total order value</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total payout</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">
            {data ? `${data.metrics.totalPayout.toFixed(2)}` : isLoading ? "…" : "$0.00"}
          </p>
          <p className="mt-1 text-sm text-slate-500">Expected net amount</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tickets value (EGP)</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">
            {data ? `EGP ${data.metrics.totalTicketsValue.toFixed(2)}` : isLoading ? "…" : "EGP 0.00"}
          </p>
          <p className="mt-1 text-sm text-slate-500">Sum of original amounts</p>
        </div>
      </div>

      <div>
        <OrderTable orders={data?.orders ?? []} onSelect={openDrawer} onDuplicate={handleDuplicate} />
      </div>

      <OrderDrawer
        open={drawerOpen}
        order={selectedOrder}
        onClose={closeDrawer}
        onOrderUpdated={handleOrderUpdated}
        onOrderDeleted={handleOrderDeleted}
      />

      <CreateOrderDialog
        open={isCreateOpen}
        initialOrder={duplicateOrder}
        onClose={() => {
          setIsCreateOpen(false);
          setDuplicateOrder(null);
        }}
        onOrderCreated={handleOrderCreated}
      />

      <SyncShopifyDialog
        open={isSyncOpen}
        onClose={() => setIsSyncOpen(false)}
        onSyncComplete={() => {
          mutate();
          setIsSyncOpen(false);
        }}
      />
    </div>
  );
}
