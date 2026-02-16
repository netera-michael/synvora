"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Dialog, Transition, Tab } from "@headlessui/react";
import { Trash2, Edit3, X, Save, ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import type { OrderDto } from "@/types/orders";
import { formatCurrency, formatDateTime, formatDateTimeForInput, cn } from "@/lib/utils";

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
  exchangeRate: typeof value.exchangeRate === "number" ? value.exchangeRate : 48.5
});

export function OrderDrawer({ open, order, onClose, onOrderUpdated, onOrderDeleted, canManage = true, isAdmin = false, initialMode = "view" }: OrderDrawerProps) {
  const [mode, setMode] = useState<"view" | "edit">(initialMode);
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { isSubmitting }
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
      exchangeRate: 48.5
    }
  });

  const originalAmount = watch("originalAmount");
  const exchangeRate = watch("exchangeRate");

  useEffect(() => {
    if (typeof originalAmount === "number" && originalAmount >= 0 && typeof exchangeRate === "number" && exchangeRate > 0) {
      const base = originalAmount / exchangeRate;
      const total = Number.isFinite(base) ? Number((base * 1.035).toFixed(2)) : 0;
      setValue("totalAmount", total, { shouldDirty: false });
    } else {
      setValue("totalAmount", 0, { shouldDirty: false });
    }
  }, [originalAmount, exchangeRate, setValue]);

  const payoutAmount = useMemo(() => {
    if (typeof originalAmount === "number" && originalAmount >= 0 && typeof exchangeRate === "number" && exchangeRate > 0) {
      const base = originalAmount / exchangeRate;
      return Number((base * 0.9825).toFixed(2));
    }
    return 0;
  }, [originalAmount, exchangeRate]);

  useEffect(() => {
    if (order) {
      reset(mapOrderToForm(order));
    }
  }, [order, reset]);

  useEffect(() => {
    if (!open) {
      setMode("view");
    } else {
      setMode(initialMode);
    }
  }, [open, initialMode]);

  useEffect(() => {
    if (!canManage) {
      setMode("view");
    }
  }, [canManage]);

  if (!order) {
    return null;
  }

  const isEditing = mode === "edit" && canManage;

  const onSubmit = handleSubmit(async (values) => {
    const trimmedOrderNumber = values.orderNumber?.trim();
    const normalizedOrderNumber =
      trimmedOrderNumber && trimmedOrderNumber.length > 0
        ? trimmedOrderNumber.startsWith("#")
          ? trimmedOrderNumber
          : `#${trimmedOrderNumber}`
        : undefined;
    const trimmedCustomerName = values.customerName?.trim();
    const processedAtIso = values.processedAt ? new Date(values.processedAt).toISOString() : new Date().toISOString();
    const payload = {
      ...values,
      customerName:
        trimmedCustomerName && trimmedCustomerName.length > 0 ? trimmedCustomerName : "No Customer",
      orderNumber: normalizedOrderNumber,
      processedAt: processedAtIso,
      originalAmount:
        typeof values.originalAmount === "number" && !Number.isNaN(values.originalAmount)
          ? values.originalAmount
          : null,
      tags: values.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      financialStatus: values.financialStatus?.length ? values.financialStatus : "Paid",
      exchangeRate:
        typeof values.exchangeRate === "number" && values.exchangeRate > 0 ? values.exchangeRate : 48.5
    };

    const response = await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
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
    if (!canManage) {
      return;
    }

    if (!confirm("Delete this order? This action cannot be undone.")) {
      return;
    }

    const response = await fetch(`/api/orders/${order.id}`, { method: "DELETE" });
    if (!response.ok) {
      console.error("Failed to delete order");
      return;
    }

    onOrderDeleted(order.id);
    onClose();
  };

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-out duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="transform transition ease-in-out duration-200"
            enterFrom="translate-y-8 opacity-0"
            enterTo="translate-y-0 opacity-100"
            leave="transform transition ease-in-out duration-150"
            leaveFrom="translate-y-0 opacity-100"
            leaveTo="translate-y-4 opacity-0"
          >
            <Dialog.Panel className="relative flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-synvora-surface shadow-2xl">
              <div className="flex items-center justify-between border-b border-synvora-border px-6 py-4">
                <div className="flex items-center gap-3">
                  {isEditing ? (
                    <button
                      type="button"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-synvora-border text-synvora-text-secondary transition hover:bg-synvora-surface-hover hover:border-synvora-border-hover"
                      onClick={() => setMode("view")}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  ) : null}
                  <div>
                    <Dialog.Title className="text-xl font-semibold text-synvora-text">
                      {order.orderNumber}
                    </Dialog.Title>
                    <p className="text-sm text-synvora-text-secondary">
                      {formatDateTime(order.processedAt)} • {order.customerName || "No Customer"}
                      {isAdmin && order.shopifyOrderNumber && (
                        <span className="ml-2 text-xs font-medium text-slate-400">
                          Shopify: {order.shopifyOrderNumber}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canManage && mode === "view" ? (
                    <button
                      type="button"
                      onClick={() => setMode("edit")}
                      className="inline-flex items-center gap-2 rounded-lg border border-synvora-border px-4 py-2 text-sm font-semibold text-synvora-text-secondary transition hover:bg-synvora-surface-hover hover:text-synvora-text"
                    >
                      <Edit3 className="h-4 w-4" />
                      Edit
                    </button>
                  ) : null}
                  {canManage ? (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-synvora-border text-synvora-text-secondary transition hover:bg-synvora-surface-hover"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <Tab.Group>
                <Tab.List className="flex border-b border-synvora-border px-6">
                  <Tab
                    className={({ selected }) =>
                      cn(
                        "px-3 py-2 text-sm font-semibold outline-none",
                        selected ? "text-synvora-primary border-b-2 border-synvora-primary" : "text-synvora-text-secondary hover:text-synvora-text"
                      )
                    }
                  >
                    Overview
                  </Tab>
                  <Tab
                    className={({ selected }) =>
                      cn(
                        "px-3 py-2 text-sm font-semibold outline-none",
                        selected ? "text-synvora-primary border-b-2 border-synvora-primary" : "text-synvora-text-secondary hover:text-synvora-text"
                      )
                    }
                  >
                    Timeline
                  </Tab>
                </Tab.List>
                <Tab.Panels className="flex-1 overflow-y-auto px-6 py-6">
                  <Tab.Panel className="space-y-6">
                    {!isEditing ? (
                      <div className="grid gap-6 lg:grid-cols-3">
                        <div className="rounded-xl border border-synvora-border p-6 shadow-sm">
                          <h3 className="text-sm font-semibold text-synvora-text">Payment</h3>
                          <p className="mt-2 text-2xl font-semibold text-synvora-text">
                            {formatCurrency(order.totalAmount, order.currency)}
                          </p>
                          <p className="mt-2 text-sm text-synvora-text-secondary">
                            {order.financialStatus ?? "Status not set"}
                          </p>
                          <div className="mt-3 space-y-1 text-sm text-synvora-text-secondary">
                            <p>
                              <span className="font-semibold text-synvora-text">Payout (USD):</span> {formatCurrency(payoutAmount, order.currency)}
                            </p>
                            <p>
                              <span className="font-semibold text-synvora-text">Venue:</span> {order.venue?.name ?? "CICCIO"}
                            </p>
                          </div>
                        </div>
                        <div className="rounded-xl border border-synvora-border p-6 shadow-sm">
                          <h3 className="text-sm font-semibold text-synvora-text">Fulfillment</h3>
                          <p className="mt-2 text-lg font-semibold text-synvora-text">
                            {order.fulfillmentStatus ?? "Unassigned"}
                          </p>
                          <p className="mt-2 text-sm text-synvora-text-secondary">
                            Ship to {order.shippingCity ?? "—"},{" "}
                            {order.shippingCountry ?? "—"}
                          </p>
                        </div>
                        <div className="rounded-xl border border-synvora-border p-6 shadow-sm">
                          <h3 className="text-sm font-semibold text-synvora-text">Tags</h3>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {order.tags?.length ? (
                              order.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center rounded-full bg-synvora-surface-active px-3 py-1 text-xs font-medium text-synvora-text-secondary"
                                >
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-synvora-text-secondary">No tags yet</span>
                            )}
                          </div>
                        </div>

                        <div className="lg:col-span-3 rounded-xl border border-synvora-border p-6 shadow-sm">
                          <h3 className="text-sm font-semibold text-synvora-text">Notes</h3>
                          <p className="mt-2 text-sm text-synvora-text-secondary">{order.notes ?? "No notes yet."}</p>
                        </div>
                      </div>
                    ) : (
                      <form className="space-y-6" onSubmit={onSubmit}>
                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="flex flex-col gap-2 text-sm font-semibold text-synvora-text-secondary">
                            Order number
                            <input
                              {...register("orderNumber", { required: true })}
                              className="rounded-lg border border-synvora-border/60 px-3 py-2 text-sm text-synvora-text shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                            />
                          </label>
                          <label className="flex flex-col gap-2 text-sm font-semibold text-synvora-text-secondary">
                            Customer name
                            <input
                              {...register("customerName", { required: true })}
                              className="rounded-lg border border-synvora-border/60 px-3 py-2 text-sm text-synvora-text shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                            />
                          </label>
                          <label className="flex flex-col gap-2 text-sm font-semibold text-synvora-text-secondary">
                            Venue
                            <select
                              {...register("venue", { required: true })}
                              className="rounded-lg border border-synvora-border/60 px-3 py-2 text-sm text-synvora-text shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                            >
                              <option value="CICCIO">CICCIO</option>
                            </select>
                          </label>
                          <label className="flex flex-col gap-2 text-sm font-semibold text-synvora-text-secondary">
                            Status
                            <select
                              {...register("status")}
                              className="rounded-lg border border-synvora-border/60 px-3 py-2 text-sm text-synvora-text shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                            >
                              {STATUS_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="flex flex-col gap-2 text-sm font-semibold text-synvora-text-secondary">
                            Payment status
                            <select
                              {...register("financialStatus")}
                              className="rounded-lg border border-synvora-border/60 px-3 py-2 text-sm text-synvora-text shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                            >
                              <option value="">Not set</option>
                              {PAYMENT_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="flex flex-col gap-2 text-sm font-semibold text-synvora-text-secondary">
                            Fulfillment status
                            <select
                              {...register("fulfillmentStatus")}
                              className="rounded-lg border border-synvora-border/60 px-3 py-2 text-sm text-synvora-text shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                            >
                              <option value="">Not set</option>
                              {FULFILLMENT_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="flex flex-col gap-2 text-sm font-semibold text-synvora-text-secondary">
                            Processed at
                            <input
                              type="datetime-local"
                              {...register("processedAt")}
                              className="rounded-lg border border-synvora-border/60 px-3 py-2 text-sm text-synvora-text shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                            />
                          </label>
                          <label className="flex flex-col gap-2 text-sm font-semibold text-synvora-text-secondary">
                            Total amount (USD)
                            <input
                              type="number"
                              step="0.01"
                              readOnly
                              {...register("totalAmount", { valueAsNumber: true })}
                              className="rounded-lg border border-synvora-border/60 bg-synvora-surface-hover px-3 py-2 text-sm text-synvora-text shadow-sm focus-visible:outline-none"
                            />
                            <span className="text-xs font-normal text-synvora-text-secondary/70">
                              Auto-calculated from EGP amount × 1.035 / rate.
                            </span>
                          </label>
                          <label className="flex flex-col gap-2 text-sm font-semibold text-synvora-text-secondary">
                            Currency
                            <input
                              {...register("currency")}
                              className="uppercase rounded-lg border border-synvora-border/60 px-3 py-2 text-sm text-synvora-text shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                            />
                          </label>
                          <label className="flex flex-col gap-2 text-sm font-semibold text-synvora-text-secondary">
                            Original amount (EGP)
                            <input
                              type="number"
                              step="0.01"
                              {...register("originalAmount", { valueAsNumber: true })}
                              className="rounded-lg border border-synvora-border/60 px-3 py-2 text-sm text-synvora-text shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                            />
                          </label>
                          <label className="flex flex-col gap-2 text-sm font-semibold text-synvora-text-secondary">
                            USD/EGP rate
                            <input
                              type="number"
                              step="0.01"
                              {...register("exchangeRate", { valueAsNumber: true })}
                              className="rounded-lg border border-synvora-border/60 px-3 py-2 text-sm text-synvora-text shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                            />
                          </label>
                        </div>

                        <label className="flex flex-col gap-2 text-sm font-semibold text-synvora-text-secondary">
                          Tags
                          <input
                            {...register("tags")}
                            placeholder="VIP, Wholesale"
                            className="rounded-lg border border-synvora-border/60 px-3 py-2 text-sm text-synvora-text shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                          />
                          <span className="text-xs font-normal text-synvora-text-secondary/70">
                            Separate tags with commas.
                          </span>
                        </label>

                        <label className="flex flex-col gap-2 text-sm font-semibold text-synvora-text-secondary">
                          Notes
                          <textarea
                            rows={3}
                            {...register("notes")}
                            className="rounded-lg border border-synvora-border/60 px-3 py-2 text-sm text-synvora-text shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                          />
                        </label>

                        <div className="rounded-lg border border-dashed border-synvora-border-hover bg-synvora-surface-hover px-4 py-3 text-sm text-synvora-text-secondary">
                          <p className="font-semibold text-synvora-text">Expected payout</p>
                          <p className="mt-1 text-lg font-semibold text-synvora-text">
                            {formatCurrency(payoutAmount, "USD")}
                          </p>
                          <p className="text-xs text-synvora-text-secondary/70">
                            Calculated as 0.9825 × (EGP ÷ rate).
                          </p>
                        </div>



                        <div className="flex items-center justify-end gap-3 border-t border-synvora-border pt-4">
                          <button
                            type="button"
                            onClick={() => {
                              if (order) {
                                reset(mapOrderToForm(order));
                              }
                              setMode("view");
                            }}
                            className="inline-flex items-center gap-2 rounded-lg border border-synvora-border px-4 py-2 text-sm font-semibold text-synvora-text-secondary transition hover:bg-synvora-surface-hover"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-2 rounded-lg bg-synvora-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-synvora-primary/90 disabled:cursor-not-allowed disabled:bg-synvora-surface-disabled"
                          >
                            <Save className="h-4 w-4" />
                            {isSubmitting ? "Saving..." : "Save changes"}
                          </button>
                        </div>
                      </form>
                    )}
                  </Tab.Panel>

                  <Tab.Panel>
                    <div className="space-y-4 text-sm text-synvora-text-secondary">
                      <p>The order event timeline will appear here once activity is recorded.</p>
                      <ul className="space-y-2">
                        <li className="rounded-lg border border-synvora-border px-4 py-3">
                          <p className="text-sm font-semibold text-synvora-text">Created in Synvora</p>
                          <p className="text-xs text-synvora-text-secondary/70">
                            {formatDateTime(order.processedAt)} • {order.customerName}
                          </p>
                        </li>
                      </ul>
                    </div>
                  </Tab.Panel>
                </Tab.Panels>
              </Tab.Group>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
