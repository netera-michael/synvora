"use client";

import { useEffect, useMemo, useState, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, Edit3, Save, Trash2, ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import type { OrderDto } from "@/types/orders";
import { formatCurrency, formatDateTime, formatDateTimeForInput, cn } from "@/lib/utils";
import { PLATFORM_FEE_MULTIPLIER, CLIENT_COMMISSION_RATE } from "@/lib/constants";

type OrderDrawerProps = {
  open: boolean;
  order: OrderDto | null;
  onClose: () => void;
  onOrderUpdated: (order: OrderDto) => void;
  onOrderDeleted: (orderId: number) => void;
  canManage?: boolean;
  isAdmin?: boolean;
  initialMode?: "view" | "edit";
};

type OrderFormValues = {
  orderNumber: string;
  customerName: string;
  venue: string;
  status: string;
  financialStatus: string;
  fulfillmentStatus: string;
  totalAmount: number;
  currency: string;
  processedAt: string;
  tags: string;
  notes: string;
  originalAmount: number | null;
  exchangeRate: number;
};

const STATUS_OPTIONS = ["Open", "Closed", "Archived"];
const PAYMENT_OPTIONS = ["Paid", "Pending", "Refunded", "Partially paid"];
const FULFILLMENT_OPTIONS = ["Fulfilled", "Unfulfilled", "Partial", "Returned"];

const BADGES: Record<string, string> = {
  Paid: "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
  Refunded: "bg-rose-100 text-rose-700",
  Fulfilled: "bg-blue-100 text-blue-700",
  Unfulfilled: "bg-slate-100 text-synvora-text-secondary",
  Open: "bg-slate-100 text-synvora-text",
  Closed: "bg-slate-200 text-synvora-text-secondary",
};

const mapOrderToForm = (value: OrderDto): OrderFormValues => ({
  orderNumber: value.orderNumber,
  customerName: value.customerName || "No Customer",
  venue: value.venue?.name ?? "CICCIO",
  status: value.status ?? "Open",
  financialStatus: value.financialStatus ?? "Paid",
  fulfillmentStatus: value.fulfillmentStatus ?? "",
  totalAmount: value.totalAmount,
  currency: value.currency,
  processedAt: formatDateTimeForInput(value.processedAt),
  tags: value.tags?.join(", ") ?? "",
  notes: value.notes ?? "",
  originalAmount: typeof value.originalAmount === "number" ? value.originalAmount : null,
  exchangeRate: typeof value.exchangeRate === "number" ? value.exchangeRate : 48.5,
});

export function OrderDrawer({
  open,
  order,
  onClose,
  onOrderUpdated,
  onOrderDeleted,
  canManage = true,
  isAdmin = false,
  initialMode = "view",
}: OrderDrawerProps) {
  const [mode, setMode] = useState<"view" | "edit">(initialMode);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<OrderFormValues>({
    defaultValues: {
      orderNumber: "",
      customerName: "",
      venue: "CICCIO",
      status: "Open",
      financialStatus: "Paid",
      fulfillmentStatus: "Unfulfilled",
      totalAmount: 0,
      currency: "USD",
      processedAt: formatDateTimeForInput(new Date()),
      tags: "",
      notes: "",
      originalAmount: null,
      exchangeRate: 48.5,
    },
  });

  const originalAmount = watch("originalAmount");
  const exchangeRate = watch("exchangeRate");

  // Keep totalAmount in sync while editing
  useEffect(() => {
    if (
      typeof originalAmount === "number" &&
      originalAmount >= 0 &&
      typeof exchangeRate === "number" &&
      exchangeRate > 0
    ) {
      const base = originalAmount / exchangeRate;
      const total = Number.isFinite(base) ? Number((base * PLATFORM_FEE_MULTIPLIER).toFixed(2)) : 0;
      setValue("totalAmount", total, { shouldDirty: false });
    } else {
      setValue("totalAmount", 0, { shouldDirty: false });
    }
  }, [originalAmount, exchangeRate, setValue]);

  // Payout preview while editing
  const editPayoutPreview = useMemo(() => {
    if (
      typeof originalAmount === "number" &&
      originalAmount > 0 &&
      typeof exchangeRate === "number" &&
      exchangeRate > 0
    ) {
      return Number(((originalAmount / exchangeRate) * (1 - CLIENT_COMMISSION_RATE)).toFixed(2));
    }
    return null;
  }, [originalAmount, exchangeRate]);

  useEffect(() => {
    if (order) reset(mapOrderToForm(order));
  }, [order, reset]);

  useEffect(() => {
    if (!open) {
      setMode("view");
      setDeleteConfirm(false);
    } else {
      setMode(initialMode);
    }
  }, [open, initialMode]);

  useEffect(() => {
    if (!canManage) setMode("view");
  }, [canManage]);

  if (!order) return null;

  const isEditing = mode === "edit" && canManage;

  // Payout derived directly from order data for view mode
  const viewPayout =
    typeof order.originalAmount === "number" &&
    order.originalAmount > 0 &&
    typeof order.exchangeRate === "number" &&
    order.exchangeRate > 0
      ? Number(((order.originalAmount / order.exchangeRate) * (1 - CLIENT_COMMISSION_RATE)).toFixed(2))
      : null;

  const onSubmit = handleSubmit(async (values) => {
    const trimmedOrderNumber = values.orderNumber?.trim();
    const normalizedOrderNumber =
      trimmedOrderNumber && trimmedOrderNumber.length > 0
        ? trimmedOrderNumber.startsWith("#")
          ? trimmedOrderNumber
          : `#${trimmedOrderNumber}`
        : undefined;
    const payload = {
      ...values,
      customerName: values.customerName?.trim() || "No Customer",
      orderNumber: normalizedOrderNumber,
      processedAt: values.processedAt ? new Date(values.processedAt).toISOString() : new Date().toISOString(),
      originalAmount:
        typeof values.originalAmount === "number" && !Number.isNaN(values.originalAmount)
          ? values.originalAmount
          : null,
      tags: values.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      financialStatus: values.financialStatus?.length ? values.financialStatus : "Paid",
      exchangeRate:
        typeof values.exchangeRate === "number" && values.exchangeRate > 0 ? values.exchangeRate : 48.5,
    };

    const response = await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error("Failed to update order", await response.text());
      return;
    }

    const updatedOrder = (await response.json()) as OrderDto;
    onOrderUpdated(updatedOrder);
    setMode("view");
  });

  const handleDelete = async () => {
    const response = await fetch(`/api/orders/${order.id}`, { method: "DELETE" });
    if (!response.ok) {
      console.error("Failed to delete order");
      return;
    }
    onOrderDeleted(order.id);
    onClose();
  };

  const cancelEdit = () => {
    reset(mapOrderToForm(order));
    setMode("view");
  };

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </Transition.Child>

        {/* Side panel */}
        <div className="fixed inset-0 flex justify-end">
          <Transition.Child
            as={Fragment}
            enter="transform transition ease-in-out duration-300"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="transform transition ease-in-out duration-200"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
          >
            <Dialog.Panel className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">

              {/* ── Header ─────────────────────────────────────── */}
              <div className="flex-none border-b border-synvora-border px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-synvora-border text-synvora-text-secondary transition hover:bg-synvora-surface-hover"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </button>
                        <Dialog.Title className="text-lg font-semibold text-synvora-text">
                          Edit {order.orderNumber}
                        </Dialog.Title>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          <Dialog.Title className="text-xl font-semibold text-synvora-text">
                            {order.orderNumber}
                          </Dialog.Title>
                          {order.financialStatus && (
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                                BADGES[order.financialStatus] ?? "bg-slate-100 text-synvora-text-secondary"
                              )}
                            >
                              {order.financialStatus}
                            </span>
                          )}
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                              order.source === "shopify"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-synvora-primary/10 text-synvora-primary"
                            )}
                          >
                            {order.source === "shopify" ? "Shopify" : "Manual"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-synvora-text-secondary">
                          {formatDateTime(order.processedAt)}
                          {order.customerName && ` · ${order.customerName}`}
                        </p>
                      </>
                    )}
                  </div>

                  <div className="flex flex-none items-center gap-2">
                    {!isEditing && canManage && (
                      <button
                        type="button"
                        onClick={() => setMode("edit")}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-synvora-border px-3 py-1.5 text-sm font-medium text-synvora-text-secondary transition hover:border-synvora-primary hover:text-synvora-primary"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-synvora-border text-synvora-text-secondary transition hover:bg-synvora-surface-hover"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Body ───────────────────────────────────────── */}
              {isEditing ? (
                <form onSubmit={onSubmit} className="flex flex-1 flex-col overflow-hidden">
                  <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">

                    <div className="grid grid-cols-2 gap-4">
                      <label className="flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
                        Order number
                        <input
                          {...register("orderNumber", { required: true })}
                          className="rounded-lg border border-synvora-border px-3 py-2 text-sm shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                        />
                      </label>
                      <label className="flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
                        Customer name
                        <input
                          {...register("customerName", { required: true })}
                          className="rounded-lg border border-synvora-border px-3 py-2 text-sm shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                        />
                      </label>
                      <label className="flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
                        Date & time
                        <input
                          type="datetime-local"
                          {...register("processedAt")}
                          className="rounded-lg border border-synvora-border px-3 py-2 text-sm shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                        />
                      </label>
                      <label className="flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
                        Payment status
                        <select
                          {...register("financialStatus")}
                          className="rounded-lg border border-synvora-border px-3 py-2 text-sm shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                        >
                          <option value="">Not set</option>
                          {PAYMENT_OPTIONS.map((o) => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
                        Amount (EGP)
                        <input
                          type="number"
                          step="0.01"
                          {...register("originalAmount", { valueAsNumber: true })}
                          className="rounded-lg border border-synvora-border px-3 py-2 text-sm shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                        />
                      </label>
                      <label className="flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
                        EGP / USD rate
                        <input
                          type="number"
                          step="0.01"
                          {...register("exchangeRate", { valueAsNumber: true })}
                          className="rounded-lg border border-synvora-border px-3 py-2 text-sm shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                        />
                      </label>
                    </div>

                    {/* Payout preview */}
                    {editPayoutPreview != null && (
                      <div className="rounded-lg border border-synvora-primary/20 bg-synvora-primary/5 px-4 py-3">
                        <p className="text-xs font-medium text-synvora-primary/70">Payout preview</p>
                        <p className="mt-0.5 text-lg font-bold text-synvora-primary">
                          {formatCurrency(editPayoutPreview, "USD")}
                        </p>
                      </div>
                    )}

                    <label className="flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
                      Tags
                      <input
                        {...register("tags")}
                        placeholder="VIP, Wholesale — separate with commas"
                        className="rounded-lg border border-synvora-border px-3 py-2 text-sm shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                      />
                    </label>

                    <label className="flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
                      Notes
                      <textarea
                        rows={3}
                        {...register("notes")}
                        className="rounded-lg border border-synvora-border px-3 py-2 text-sm shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                      />
                    </label>

                    {/* Status fields — admin only, collapsed in a group */}
                    <details className="group">
                      <summary className="cursor-pointer select-none text-xs font-medium text-synvora-text-secondary hover:text-synvora-text">
                        More fields ▸
                      </summary>
                      <div className="mt-3 grid grid-cols-2 gap-4">
                        <label className="flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
                          Order status
                          <select
                            {...register("status")}
                            className="rounded-lg border border-synvora-border px-3 py-2 text-sm shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                          >
                            {STATUS_OPTIONS.map((o) => (
                              <option key={o} value={o}>{o}</option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
                          Fulfillment
                          <select
                            {...register("fulfillmentStatus")}
                            className="rounded-lg border border-synvora-border px-3 py-2 text-sm shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                          >
                            <option value="">Not set</option>
                            {FULFILLMENT_OPTIONS.map((o) => (
                              <option key={o} value={o}>{o}</option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
                          Currency
                          <input
                            {...register("currency")}
                            className="rounded-lg border border-synvora-border px-3 py-2 text-sm uppercase shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                          />
                        </label>
                        <label className="flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
                          Venue
                          <select
                            {...register("venue")}
                            className="rounded-lg border border-synvora-border px-3 py-2 text-sm shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                          >
                            <option value="CICCIO">CICCIO</option>
                          </select>
                        </label>
                      </div>
                    </details>
                  </div>

                  {/* Edit footer */}
                  <div className="flex flex-none items-center justify-end gap-3 border-t border-synvora-border px-6 py-4">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="rounded-lg border border-synvora-border px-4 py-2 text-sm font-medium text-synvora-text-secondary transition hover:bg-synvora-surface-hover"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 rounded-lg bg-synvora-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-synvora-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {isSubmitting ? "Saving…" : "Save changes"}
                    </button>
                  </div>
                </form>
              ) : (
                /* ── View mode ─────────────────────────────────── */
                <div className="flex-1 divide-y divide-synvora-border/60 overflow-y-auto">

                  {/* 1 · Payout hero */}
                  <div className="px-6 py-5">
                    <div className="rounded-xl border border-synvora-primary/15 bg-synvora-primary/5 px-5 py-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-synvora-primary/70">
                        {isAdmin ? "Client Payout" : "Your Payout"}
                      </p>
                      <p className="mt-1 text-3xl font-bold text-synvora-primary">
                        {viewPayout != null ? formatCurrency(viewPayout, "USD") : "—"}
                      </p>
                      {order.originalAmount != null && order.exchangeRate != null && (
                        <p className="mt-1.5 text-xs text-synvora-text-secondary">
                          EGP {order.originalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          {" "}÷ {order.exchangeRate} × {((1 - CLIENT_COMMISSION_RATE) * 100).toFixed(2)}%
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 2 · Key details */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 px-6 py-5">
                    {order.customerName && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-synvora-text-secondary">Customer</p>
                        <p className="mt-1 text-sm font-medium text-synvora-text">{order.customerName}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-synvora-text-secondary">Venue</p>
                      <p className="mt-1 text-sm font-medium text-synvora-text">{order.venue?.name ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-synvora-text-secondary">Gross (USD)</p>
                      <p className="mt-1 text-sm font-medium text-synvora-text">
                        {formatCurrency(order.totalAmount, order.currency)}
                      </p>
                    </div>
                    {order.originalAmount != null && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-synvora-text-secondary">Amount (EGP)</p>
                        <p className="mt-1 text-sm font-medium text-synvora-text">
                          EGP {order.originalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 3 · Line items */}
                  {order.lineItems?.length > 0 && (
                    <div className="px-6 py-5">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-synvora-text-secondary">
                        Items
                      </p>
                      <div className="overflow-hidden rounded-lg border border-synvora-border">
                        <table className="min-w-full divide-y divide-synvora-border text-sm">
                          <thead className="bg-synvora-surface text-left">
                            <tr>
                              <th className="px-4 py-2.5 text-xs font-semibold text-synvora-text-secondary">Product</th>
                              <th className="px-4 py-2.5 text-center text-xs font-semibold text-synvora-text-secondary">Qty</th>
                              <th className="px-4 py-2.5 text-right text-xs font-semibold text-synvora-text-secondary">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-synvora-border/60 bg-white">
                            {order.lineItems.map((item) => (
                              <tr key={item.id}>
                                <td className="px-4 py-3">
                                  <p className="font-medium text-synvora-text">{item.productName}</p>
                                  {item.sku && (
                                    <p className="mt-0.5 text-xs text-synvora-text-secondary">{item.sku}</p>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center text-synvora-text-secondary">{item.quantity}</td>
                                <td className="px-4 py-3 text-right font-medium text-synvora-text">
                                  {formatCurrency(item.total, order.currency)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 4 · Tags — only if present */}
                  {order.tags?.length > 0 && (
                    <div className="px-6 py-5">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-synvora-text-secondary">Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {order.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded-full bg-synvora-surface-active px-3 py-1 text-xs font-medium text-synvora-text-secondary"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 5 · Notes — only if present */}
                  {order.notes && (
                    <div className="px-6 py-5">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-synvora-text-secondary">Notes</p>
                      <p className="text-sm leading-relaxed text-synvora-text">{order.notes}</p>
                    </div>
                  )}

                  {/* 6 · Admin technical details */}
                  {isAdmin && (order.shopifyOrderNumber || order.exchangeRate) && (
                    <div className="px-6 py-5">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-synvora-text-secondary">
                        Technical
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        {order.shopifyOrderNumber && (
                          <div>
                            <p className="text-xs text-synvora-text-secondary">Shopify Order</p>
                            <p className="mt-0.5 text-sm font-medium text-synvora-text">{order.shopifyOrderNumber}</p>
                          </div>
                        )}
                        {order.exchangeRate && (
                          <div>
                            <p className="text-xs text-synvora-text-secondary">EGP / USD Rate</p>
                            <p className="mt-0.5 text-sm font-medium text-synvora-text">{order.exchangeRate}</p>
                          </div>
                        )}
                        {order.source && (
                          <div>
                            <p className="text-xs text-synvora-text-secondary">Source</p>
                            <p className="mt-0.5 text-sm font-medium capitalize text-synvora-text">{order.source}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 7 · Admin delete */}
                  {canManage && (
                    <div className="px-6 py-5">
                      {deleteConfirm ? (
                        <div className="flex items-center gap-3 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3">
                          <p className="flex-1 text-sm text-rose-700">Delete this order? This cannot be undone.</p>
                          <button
                            type="button"
                            onClick={handleDelete}
                            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(false)}
                            className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(true)}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-rose-600 transition hover:text-rose-700"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete order
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
