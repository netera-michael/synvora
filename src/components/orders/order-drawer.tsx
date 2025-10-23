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

export function OrderDrawer({ open, order, onClose, onOrderUpdated, onOrderDeleted, canManage = true }: OrderDrawerProps) {
  const [mode, setMode] = useState<"view" | "edit">("view");
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
    }
  }, [open]);

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
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm" />
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
            <Dialog.Panel className="relative flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div className="flex items-center gap-3">
                  {isEditing ? (
                    <button
                      type="button"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300"
                      onClick={() => setMode("view")}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  ) : null}
                  <div>
                    <Dialog.Title className="text-xl font-semibold text-slate-900">
                      {order.orderNumber}
                    </Dialog.Title>
                    <p className="text-sm text-slate-500">
                      {formatDateTime(order.processedAt)} • {order.customerName || "No Customer"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canManage && mode === "view" ? (
                    <button
                      type="button"
                      onClick={() => setMode("edit")}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-synvora-primary hover:text-synvora-primary"
                    >
                      <Edit3 className="h-4 w-4" />
                      Edit
                    </button>
                  ) : null}
                  {canManage ? (
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="inline-flex items-center gap-2 rounded-xl border border-transparent bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <Tab.Group>
                <Tab.List className="flex border-b border-slate-200 px-6">
                  <Tab
                    className={({ selected }) =>
                      cn(
                        "px-3 py-2 text-sm font-semibold outline-none",
                        selected ? "text-synvora-primary" : "text-slate-500"
                      )
                    }
                  >
                    Overview
                  </Tab>
                  <Tab
                    className={({ selected }) =>
                      cn(
                        "px-3 py-2 text-sm font-semibold outline-none",
                        selected ? "text-synvora-primary" : "text-slate-500"
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
                        <div className="rounded-2xl border border-slate-200 p-6">
                          <h3 className="text-sm font-semibold text-slate-900">Payment</h3>
                          <p className="mt-2 text-2xl font-semibold text-slate-900">
                            {formatCurrency(order.totalAmount, order.currency)}
                          </p>
                          <p className="mt-2 text-sm text-slate-500">
                            {order.financialStatus ?? "Status not set"}
                          </p>
                          <div className="mt-3 space-y-1 text-sm text-slate-600">
                            <p>
                              <span className="font-semibold text-slate-900">Payout (USD):</span> {formatCurrency(payoutAmount, order.currency)}
                            </p>
                            <p>
                              <span className="font-semibold text-slate-900">Venue:</span> {order.venue?.name ?? "CICCIO"}
                            </p>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 p-6">
                          <h3 className="text-sm font-semibold text-slate-900">Fulfillment</h3>
                          <p className="mt-2 text-lg font-semibold text-slate-900">
                            {order.fulfillmentStatus ?? "Unassigned"}
                          </p>
                          <p className="mt-2 text-sm text-slate-500">
                            Ship to {order.shippingCity ?? "—"},{" "}
                            {order.shippingCountry ?? "—"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 p-6">
                          <h3 className="text-sm font-semibold text-slate-900">Tags</h3>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {order.tags?.length ? (
                              order.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                                >
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-slate-500">No tags yet</span>
                            )}
                          </div>
                        </div>

                        <div className="lg:col-span-3 rounded-2xl border border-slate-200 p-6">
                          <h3 className="text-sm font-semibold text-slate-900">Notes</h3>
                          <p className="mt-2 text-sm text-slate-500">{order.notes ?? "No notes yet."}</p>
                        </div>
                      </div>
                    ) : (
                      <form className="space-y-6" onSubmit={onSubmit}>
                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                            Order number
                            <input
                              {...register("orderNumber", { required: true })}
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                            />
                          </label>
                          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                            Customer name
                            <input
                              {...register("customerName", { required: true })}
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                            />
                          </label>
                          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                            Venue
                            <select
                              {...register("venue", { required: true })}
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                            >
                              <option value="CICCIO">CICCIO</option>
                            </select>
                          </label>
                          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                            Status
                            <select
                              {...register("status")}
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                            >
                              {STATUS_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                            Payment status
                            <select
                              {...register("financialStatus")}
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                            >
                              <option value="">Not set</option>
                              {PAYMENT_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                            Fulfillment status
                            <select
                              {...register("fulfillmentStatus")}
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                            >
                              <option value="">Not set</option>
                              {FULFILLMENT_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                            Processed at
                            <input
                              type="datetime-local"
                              {...register("processedAt")}
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                            />
                          </label>
                          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                            Total amount (USD)
                            <input
                              type="number"
                              step="0.01"
                              readOnly
                              {...register("totalAmount", { valueAsNumber: true })}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 shadow-inner focus-visible:outline-none"
                            />
                            <span className="text-xs font-normal text-slate-400">
                              Auto-calculated from EGP amount × 1.035 / rate.
                            </span>
                          </label>
                          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                            Currency
                            <input
                              {...register("currency")}
                              className="uppercase rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                            />
                          </label>
                          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                            Original amount (EGP)
                            <input
                              type="number"
                              step="0.01"
                              {...register("originalAmount", { valueAsNumber: true })}
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                            />
                          </label>
                          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                            USD/EGP rate
                            <input
                              type="number"
                              step="0.01"
                              {...register("exchangeRate", { valueAsNumber: true })}
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                            />
                          </label>
                        </div>

                        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                          Tags
                          <input
                            {...register("tags")}
                            placeholder="VIP, Wholesale"
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                          />
                          <span className="text-xs font-normal text-slate-400">
                            Separate tags with commas.
                          </span>
                        </label>

                        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                          Notes
                          <textarea
                            rows={3}
                            {...register("notes")}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                          />
                        </label>

                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                          <p className="font-semibold text-slate-800">Expected payout</p>
                          <p className="mt-1 text-lg font-semibold text-slate-900">
                            {formatCurrency(payoutAmount, "USD")}
                          </p>
                          <p className="text-xs text-slate-500">
                            Calculated as 0.9825 × (EGP ÷ rate).
                          </p>
                        </div>



                        <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                          <button
                            type="button"
                            onClick={() => {
                              if (order) {
                                reset(mapOrderToForm(order));
                              }
                              setMode("view");
                            }}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-2 rounded-xl bg-synvora-primary px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-synvora-primary/90 disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            <Save className="h-4 w-4" />
                            {isSubmitting ? "Saving..." : "Save changes"}
                          </button>
                        </div>
                      </form>
                    )}
                  </Tab.Panel>

                  <Tab.Panel>
                    <div className="space-y-4 text-sm text-slate-500">
                      <p>The order event timeline will appear here once activity is recorded.</p>
                      <ul className="space-y-2">
                        <li className="rounded-xl border border-slate-200 px-4 py-3">
                          <p className="text-sm font-semibold text-slate-700">Created in Synvora</p>
                          <p className="text-xs text-slate-400">
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
