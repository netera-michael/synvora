"use client";

import useSWR from "swr";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { Plus, Printer, CloudDownload, Edit, X, Trash2, Copy, Download, MoreVertical } from "lucide-react";
import { Menu, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { useSession } from "next-auth/react";
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
  // HTML5 date input format: YYYY-MM-DD
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) {
    return "";
  }
  // Validate date components are numbers
  const yearNum = Number(year);
  const monthNum = Number(month);
  const dayNum = Number(day);
  if (Number.isNaN(yearNum) || Number.isNaN(monthNum) || Number.isNaN(dayNum)) {
    return "";
  }
  // Validate date is valid
  const date = new Date(yearNum, monthNum - 1, dayNum);
  if (date.getFullYear() !== yearNum || date.getMonth() !== monthNum - 1 || date.getDate() !== dayNum) {
    return "";
  }
  // Return in DD/MM/YYYY format for URL params
  return `${String(dayNum).padStart(2, '0')}/${String(monthNum).padStart(2, '0')}/${yearNum}`;
};

const toDateInputValue = (value: string) => {
  if (!value) {
    return "";
  }
  // URL param format: DD/MM/YYYY
  const [day, month, year] = value.split("/");
  if (!day || !month || !year) {
    return "";
  }
  // Validate date components are numbers
  const yearNum = Number(year);
  const monthNum = Number(month);
  const dayNum = Number(day);
  if (Number.isNaN(yearNum) || Number.isNaN(monthNum) || Number.isNaN(dayNum)) {
    return "";
  }
  // Validate date is valid
  const date = new Date(yearNum, monthNum - 1, dayNum);
  if (date.getFullYear() !== yearNum || date.getMonth() !== monthNum - 1 || date.getDate() !== dayNum) {
    return "";
  }
  // Return in YYYY-MM-DD format for HTML5 date input
  return `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
};

export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tzOffset = new Date().getTimezoneOffset();
  const monthFilter = searchParams.get("month") ?? "all";
  const startDateFilter = searchParams.get("startDate") ?? "";
  const endDateFilter = searchParams.get("endDate") ?? "";

  // Memoize date input values to prevent unnecessary re-renders and flickering
  const startDateInputValue = useMemo(() => toDateInputValue(startDateFilter), [startDateFilter]);
  const endDateInputValue = useMemo(() => toDateInputValue(endDateFilter), [endDateFilter]);
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
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderDto | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"view" | "edit">("view");
  const [duplicateOrder, setDuplicateOrder] = useState<OrderDto | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());

  // Update timezone offset in URL if it changed, but avoid infinite loops
  useEffect(() => {
    const currentTzOffset = searchParams.get("tzOffset");
    if (currentTzOffset !== String(tzOffset)) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tzOffset", String(tzOffset));
      const qs = params.toString();
      router.replace(qs ? (`/orders?${qs}` as Route) : ("/orders" as Route));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tzOffset]); // Only depend on tzOffset to avoid re-triggering on every searchParams change

  const months = useMemo(() => {
    const now = new Date();
    const options: Array<{ value: string; label: string; date: Date }> = [];

    // Add 4 months in the past (index 4, 3, 2, 1)
    for (let i = 4; i >= 1; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const value = `${year}-${month}`;
      const label = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      options.push({ value, label, date });
    }

    // Add current month (index 0)
    const currentDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentYear = currentDate.getFullYear();
    const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
    options.push({
      value: `${currentYear}-${currentMonth}`,
      label: currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      date: currentDate
    });

    // Add 2 months in the future (index 1, 2)
    for (let i = 1; i <= 2; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const value = `${year}-${month}`;
      const label = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      options.push({ value, label, date });
    }

    // Sort by date descending (newest first) for display
    options.sort((a, b) => b.date.getTime() - a.date.getTime());

    return [{ value: "all", label: "All orders" }, ...options.map(({ value, label }) => ({ value, label }))];
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
    setDrawerMode("view");
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

  const handleEdit = (order: OrderDto) => {
    setSelectedOrder(order);
    setDrawerMode("edit");
    setDrawerOpen(true);
  };

  const handleDelete = async (order: OrderDto) => {
    if (!confirm(`Are you sure you want to delete order ${order.orderNumber}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/orders/${order.id}`, { method: "DELETE" });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to delete order" }));
        throw new Error(errorData.message || "Failed to delete order");
      }
      // Parse response (now returns 200 with success message)
      await response.json();
      mutate();
      if (selectedOrder?.id === order.id) {
        closeDrawer();
      }
    } catch (error) {
      console.error("Failed to delete order:", error);
      alert(error instanceof Error ? error.message : "Failed to delete order. Please try again.");
    }
  };

  const toggleEditMode = () => {
    setEditMode(!editMode);
    if (editMode) {
      setSelectedOrders(new Set());
    }
  };

  const toggleSelectOrder = (orderId: number) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedOrders.size === ordersList.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(ordersList.map(order => order.id)));
    }
  };

  const handleMassDelete = async () => {
    if (selectedOrders.size === 0 || !confirm(`Are you sure you want to delete ${selectedOrders.size} order(s)?`)) {
      return;
    }

    try {
      const deletePromises = Array.from(selectedOrders).map(orderId =>
        fetch(`/api/orders/${orderId}`, { method: "DELETE" })
      );

      await Promise.all(deletePromises);
      setSelectedOrders(new Set());
      setEditMode(false);
      mutate();
    } catch (error) {
      console.error("Failed to delete orders:", error);
      alert("Failed to delete some orders. Please try again.");
    }
  };

  const handleMassDuplicate = () => {
    if (selectedOrders.size === 0) {
      return;
    }

    const ordersToDuplicate = ordersList.filter(order => selectedOrders.has(order.id));
    if (ordersToDuplicate.length > 0) {
      setDuplicateOrder(ordersToDuplicate[0]);
      setIsCreateOpen(true);
      // Note: For true mass duplicate, you'd want to duplicate all selected orders
      // For now, we'll duplicate the first one and let user duplicate others manually
      setSelectedOrders(new Set());
      setEditMode(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tzOffset", String(tzOffset));

      const response = await fetch(`/api/orders/export?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to export orders");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `orders-export-${new Date().toISOString().split("T")[0]}.csv`;

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export orders. Please try again.");
    }
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
          <h1 className="text-2xl font-semibold text-synvora-text">Orders</h1>
          <p className="mt-2 text-sm text-synvora-text-secondary print:hidden">
            {isAdmin
              ? "Monitor and manage your Synvora and Shopify orders in a single command center."
              : "Review the latest activity across the venues you have access to."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={monthFilter}
            onChange={(event) => handleMonthChange(event.target.value)}
            className="rounded-lg border border-synvora-border bg-white px-3 py-2 text-sm font-medium text-synvora-text shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
          >
            {months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-synvora-text-secondary">
              From
              <input
                type="date"
                value={startDateInputValue}
                onChange={(event) => handleDateChange("startDate", event.target.value)}
                className="rounded-lg border border-synvora-border bg-white px-3 py-2 text-sm font-medium text-synvora-text shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
              />
            </label>
            <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-synvora-text-secondary">
              To
              <input
                type="date"
                value={endDateInputValue}
                onChange={(event) => handleDateChange("endDate", event.target.value)}
                className="rounded-lg border border-synvora-border bg-white px-3 py-2 text-sm font-medium text-synvora-text shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
              />
            </label>
            {(startDateFilter || endDateFilter) && (
              <button
                type="button"
                onClick={handleClearRange}
                className="text-xs font-medium text-synvora-text-secondary hover:text-synvora-primary transition"
              >
                Clear range
              </button>
            )}
          </div>
          {editMode ? (
            <>
              <button
                type="button"
                onClick={handleMassDuplicate}
                disabled={selectedOrders.size === 0}
                className="inline-flex items-center gap-2 rounded-lg border border-synvora-border bg-white px-4 py-2 text-sm font-medium text-synvora-text-secondary shadow-sm transition hover:bg-synvora-surface-hover hover:text-synvora-text disabled:cursor-not-allowed disabled:bg-synvora-surface-disabled disabled:text-synvora-text-secondary"
              >
                <Copy className="h-4 w-4" />
                Duplicate ({selectedOrders.size})
              </button>
              <button
                type="button"
                onClick={handleMassDelete}
                disabled={selectedOrders.size === 0}
                className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-600 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete ({selectedOrders.size})
              </button>
              <button
                type="button"
                onClick={toggleEditMode}
                className="inline-flex items-center gap-2 rounded-lg border border-synvora-border bg-white px-4 py-2 text-sm font-medium text-synvora-text-secondary shadow-sm transition hover:bg-synvora-surface-hover hover:text-synvora-text"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </>
          ) : (
            <Menu as="div" className="relative inline-block text-left">
              <div>
                <Menu.Button className="inline-flex items-center gap-2 rounded-lg border border-synvora-border bg-white px-4 py-2 text-sm font-medium text-synvora-text-secondary shadow-sm transition hover:border-synvora-primary hover:text-synvora-primary">
                  <MoreVertical className="h-4 w-4" />
                  Actions
                </Menu.Button>
              </div>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-lg border border-synvora-border bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="py-1">
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          type="button"
                          onClick={handlePrint}
                          disabled={isPrinting}
                          className={`${active ? "bg-synvora-surface-active text-synvora-text" : "text-synvora-text-secondary"
                            } flex w-full items-center gap-2 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          <Printer className="h-4 w-4" />
                          {isPrinting ? "Preparing…" : "Print"}
                        </button>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          type="button"
                          onClick={handleExportCSV}
                          className={`${active ? "bg-synvora-surface-active text-synvora-text" : "text-synvora-text-secondary"
                            } flex w-full items-center gap-2 px-4 py-2 text-sm font-medium`}
                        >
                          <Download className="h-4 w-4" />
                          Export CSV
                        </button>
                      )}
                    </Menu.Item>
                    {isAdmin && (
                      <>
                        <div className="my-1 border-t border-synvora-border" />
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              type="button"
                              onClick={toggleEditMode}
                              className={`${active ? "bg-synvora-surface-active text-synvora-text" : "text-synvora-text-secondary"
                                } flex w-full items-center gap-2 px-4 py-2 text-sm font-medium`}
                            >
                              <Edit className="h-4 w-4" />
                              Edit
                            </button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              type="button"
                              onClick={() => setIsSyncOpen(true)}
                              className={`${active ? "bg-synvora-surface-active text-synvora-text" : "text-synvora-text-secondary"
                                } flex w-full items-center gap-2 px-4 py-2 text-sm font-medium`}
                            >
                              <CloudDownload className="h-4 w-4" />
                              Sync Shopify
                            </button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              type="button"
                              onClick={() => setIsCreateOpen(true)}
                              className={`${active ? "bg-synvora-primary/10 text-synvora-primary" : "text-synvora-primary hover:bg-synvora-primary/5"
                                } flex w-full items-center gap-2 px-4 py-2 text-sm font-medium`}
                            >
                              <Plus className="h-4 w-4" />
                              Create order
                            </button>
                          )}
                        </Menu.Item>
                      </>
                    )}
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-synvora-border bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-synvora-text-secondary">Orders</p>
          <p className="mt-3 text-2xl font-semibold text-synvora-text">
            {metrics?.ordersCount ?? (isLoading ? "…" : 0)}
          </p>
          <p className="mt-1 text-sm text-synvora-text-secondary">Across selected timeframe</p>
        </div>
        <div className="rounded-xl border border-synvora-border bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-synvora-text-secondary">Revenue</p>
          <p className="mt-3 text-2xl font-semibold text-synvora-text">
            {metrics ? formatCurrencyValue(metrics.totalRevenue) : isLoading ? "…" : "$0.00"}
          </p>
          <p className="mt-1 text-sm text-synvora-text-secondary">Total order value</p>
        </div>
        <div className="rounded-xl border border-synvora-border bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-synvora-text-secondary">Total payout</p>
          <p className="mt-3 text-2xl font-semibold text-synvora-text">
            {metrics ? formatCurrencyValue(metrics.totalPayout) : isLoading ? "…" : "$0.00"}
          </p>
          <p className="mt-1 text-sm text-synvora-text-secondary">Expected net amount</p>
        </div>
        <div className="rounded-xl border border-synvora-border bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-synvora-text-secondary">Tickets value (EGP)</p>
          <p className="mt-3 text-2xl font-semibold text-synvora-text">
            {metrics ? `EGP ${formatNumber(metrics.totalTicketsValue)}` : isLoading ? "…" : "EGP 0.00"}
          </p>
          <p className="mt-1 text-sm text-synvora-text-secondary">Sum of original amounts</p>
        </div>
      </div>

      <div>
        <OrderTable
          orders={ordersList}
          onSelect={openDrawer}
          onDuplicate={isAdmin ? handleDuplicate : undefined}
          onEdit={isAdmin ? handleEdit : undefined}
          onDelete={isAdmin ? handleDelete : undefined}
          canManage={isAdmin}
          isAdmin={isAdmin}
          editMode={editMode}
          selectedOrders={selectedOrders}
          onToggleSelect={toggleSelectOrder}
          onToggleSelectAll={toggleSelectAll}
          isLoading={isLoading}
        />
      </div>

      <OrderDrawer
        open={drawerOpen}
        order={selectedOrder}
        onClose={closeDrawer}
        onOrderUpdated={handleOrderUpdated}
        onOrderDeleted={handleOrderDeleted}
        canManage={isAdmin}
        isAdmin={isAdmin}
        initialMode={drawerMode}
      />

      {isAdmin ? (
        <>
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
        </>
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
    <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-synvora-border bg-white p-4 text-sm text-synvora-text-secondary shadow-sm md:flex-row">
      <span>
        Showing <span className="font-medium text-synvora-text">{start}</span>–
        <span className="font-medium text-synvora-text">{end}</span> of
        <span className="font-medium text-synvora-text"> {totalCount}</span> orders
      </span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={isLoading || page <= 1}
          className="inline-flex items-center rounded-lg border border-synvora-border px-3 py-1.5 text-sm font-medium text-synvora-text-secondary transition hover:border-synvora-primary hover:text-synvora-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-xs font-medium uppercase tracking-wide text-synvora-text-secondary">
          Page {page} of {safeTotalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={isLoading || page >= safeTotalPages}
          className="inline-flex items-center rounded-lg border border-synvora-border px-3 py-1.5 text-sm font-medium text-synvora-text-secondary transition hover:border-synvora-primary hover:text-synvora-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
