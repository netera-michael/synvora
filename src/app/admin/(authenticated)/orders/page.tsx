"use client";

import useSWR from "swr";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { Plus, Printer } from "lucide-react";
import { useSession } from "next-auth/react";
import type { OrderDto } from "@/types/orders";
import { OrderTable } from "@/components/orders/order-table";
import { OrderDrawer } from "@/components/orders/order-drawer";
import { CreateOrderDialog } from "@/components/orders/create-order-dialog";

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
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const formatCurrencyValue = (value: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2
  }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(value);

const toDateParam = (value: string) => {
  if (!value) {
    return "";
  }
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) {
    return "";
  }
  return `${day}/${month}/${year}`;
};

const toDateInputValue = (value: string) => {
  if (!value) {
    return "";
  }
  const [day, month, year] = value.split("/");
  if (!day || !month || !year) {
    return "";
  }
  return `${year}-${month}-${day}`;
};

export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tzOffset = new Date().getTimezoneOffset();
  const monthFilter = searchParams.get("month") ?? "all";
  const startDateFilter = searchParams.get("startDate") ?? "";
  const endDateFilter = searchParams.get("endDate") ?? "";
  const startDateInputValue = toDateInputValue(startDateFilter);
  const endDateInputValue = toDateInputValue(endDateFilter);
  const paramsWithTz = new URLSearchParams(searchParams.toString());
  paramsWithTz.set("tzOffset", String(tzOffset));
  const queryString = paramsWithTz.toString();
  const { data, error, mutate, isLoading } = useSWR<OrdersResponse>(`/api/orders${queryString ? `?${queryString}` : ""}`, fetcher);
  const { data: session } = useSession();
  const isAdmin = session?.user.role === "ADMIN";
  const [printMode, setPrintMode] = useState(false);
  const [printOrders, setPrintOrders] = useState<OrderDto[] | null>(null);
  const [printMetrics, setPrintMetrics] = useState<OrdersResponse["metrics"] | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const metrics = printMode && printMetrics ? printMetrics : data?.metrics;
  const ordersList = printMode && printOrders ? printOrders : data?.orders ?? [];
  const pagination = printMode ? undefined : data?.pagination;

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderDto | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [duplicateOrder, setDuplicateOrder] = useState<OrderDto | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get("tzOffset") !== String(tzOffset)) {
      params.set("tzOffset", String(tzOffset));
      const qs = params.toString();
      router.replace(qs ? (`/orders?${qs}` as Route) : ("/orders" as Route));
    }
  }, [searchParams, tzOffset, router]);

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
      params.delete("startDate");
      params.delete("endDate");
    }
    params.set("tzOffset", String(tzOffset));
    params.delete("page");

    const qs = params.toString();
    const target = qs ? `/orders?${qs}` : "/orders";
    router.replace(target as Route);
  };

  const handleDateChange = (key: "startDate" | "endDate", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value) {
      params.delete(key);
    } else {
      const formatted = toDateParam(value);
      if (formatted) {
        params.set(key, formatted);
      } else {
        params.delete(key);
      }
    }

    if (key === "startDate" || key === "endDate") {
      params.delete("month");
    }

    params.set("tzOffset", String(tzOffset));
    params.delete("page");

    const qs = params.toString();
    const target = qs ? `/orders?${qs}` : "/orders";
    router.replace(target as Route);
  };

  const handleClearRange = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("startDate");
    params.delete("endDate");
    params.set("tzOffset", String(tzOffset));
    params.delete("page");
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

  const handlePrint = async () => {
    if (isPrinting) {
      return;
    }

    try {
      setIsPrinting(true);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tzOffset", String(tzOffset));
      params.set("page", "all");
      const query = params.toString();
      const response = await fetch(`/api/orders${query ? `?${query}` : ""}`);
      if (!response.ok) {
        throw new Error("Failed to load orders for printing");
      }
      const payload = (await response.json()) as OrdersResponse;
      setPrintMode(true);
      setPrintOrders(payload.orders);
      setPrintMetrics(payload.metrics);
      await new Promise((resolve) => setTimeout(resolve, 50));
      window.print();
    } catch (printError) {
      console.error(printError);
      setPrintMode(false);
      setPrintOrders(null);
      setPrintMetrics(null);
      setIsPrinting(false);
    }
  };

  const handleOrderCreated = (_order: OrderDto) => {
    mutate();
    setDuplicateOrder(null);
  };

  const handleOrderUpdated = (order: OrderDto) => {
    mutate();
    setSelectedOrder(order);
  };

  const handleOrderDeleted = (_orderId: number) => {
    mutate();
    closeDrawer();
  };

  useEffect(() => {
    const handleAfterPrint = () => {
      setPrintMode(false);
      setPrintOrders(null);
      setPrintMetrics(null);
      setIsPrinting(false);
    };

    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  const handlePageChange = (nextPage: number) => {
    if (!pagination) {
      return;
    }

    const totalPagesValue = pagination.totalPages || 1;
    if (nextPage < 1 || nextPage > totalPagesValue) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("tzOffset", String(tzOffset));

    if (nextPage === 1) {
      params.delete("page");
    } else {
      params.set("page", String(nextPage));
    }

    const qs = params.toString();
    const target = qs ? `/orders?${qs}` : "/orders";
    router.replace(target as Route);
  };

  const handleDuplicate = (order: OrderDto) => {
    if (!isAdmin) {
      return;
    }
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
          <p className="mt-2 text-sm text-slate-500 print:hidden">
            {isAdmin
              ? "Monitor and manage your Synvora and Shopify orders in a single command center."
              : "Review the latest activity across the venues you have access to."}
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
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              From
              <input
                type="date"
                value={startDateInputValue}
                onChange={(event) => handleDateChange("startDate", event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
              />
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              To
              <input
                type="date"
                value={endDateInputValue}
                onChange={(event) => handleDateChange("endDate", event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
              />
            </label>
            {(startDateFilter || endDateFilter) && (
              <button
                type="button"
                onClick={handleClearRange}
                className="text-xs font-semibold text-slate-500 hover:text-synvora-primary"
              >
                Clear range
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handlePrint}
            disabled={isPrinting}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-synvora-primary hover:text-synvora-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            {isPrinting ? "Preparing…" : "Print"}
          </button>
          {isAdmin ? (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-synvora-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-synvora-primary/90"
            >
              <Plus className="h-4 w-4" />
              Create order
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Orders</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">
            {metrics?.ordersCount ?? (isLoading ? "…" : 0)}
          </p>
          <p className="mt-1 text-sm text-slate-500">Across selected timeframe</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Revenue</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">
            {metrics ? formatCurrencyValue(metrics.totalRevenue) : isLoading ? "…" : "$0.00"}
          </p>
          <p className="mt-1 text-sm text-slate-500">Total order value</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total payout</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">
            {metrics ? formatCurrencyValue(metrics.totalPayout) : isLoading ? "…" : "$0.00"}
          </p>
          <p className="mt-1 text-sm text-slate-500">Expected net amount</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tickets value (EGP)</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">
            {metrics ? `EGP ${formatNumber(metrics.totalTicketsValue)}` : isLoading ? "…" : "EGP 0.00"}
          </p>
          <p className="mt-1 text-sm text-slate-500">Sum of original amounts</p>
        </div>
      </div>

      <div>
        <OrderTable
          orders={ordersList}
          onSelect={openDrawer}
          onDuplicate={isAdmin ? handleDuplicate : undefined}
          canManage={isAdmin}
        />
      </div>

      <OrderDrawer
        open={drawerOpen}
        order={selectedOrder}
        onClose={closeDrawer}
        onOrderUpdated={handleOrderUpdated}
        onOrderDeleted={handleOrderDeleted}
        canManage={isAdmin}
      />

      {isAdmin ? (
        <CreateOrderDialog
          open={isCreateOpen}
          initialOrder={duplicateOrder}
          onClose={() => {
            setIsCreateOpen(false);
            setDuplicateOrder(null);
          }}
          onOrderCreated={handleOrderCreated}
        />
      ) : null}

      <PaginationControls
        pagination={pagination}
        isLoading={isLoading}
        onPageChange={handlePageChange}
      />

    </div>
  );
}

type PaginationProps = {
  pagination?: OrdersResponse["pagination"];
  isLoading: boolean;
  onPageChange: (page: number) => void;
};

function PaginationControls({ pagination, isLoading, onPageChange }: PaginationProps) {
  if (!pagination || pagination.totalCount === 0) {
    return null;
  }

  const { page, pageSize, totalCount, totalPages } = pagination;
  const safeTotalPages = totalPages || 1;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(start + pageSize - 1, totalCount);

  return (
    <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm md:flex-row">
      <span>
        Showing <span className="font-semibold text-slate-900">{start}</span>–
        <span className="font-semibold text-slate-900">{end}</span> of
        <span className="font-semibold text-slate-900"> {totalCount}</span> orders
      </span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={isLoading || page <= 1}
          className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:border-synvora-primary hover:text-synvora-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Page {page} of {safeTotalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={isLoading || page >= safeTotalPages}
          className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:border-synvora-primary hover:text-synvora-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
