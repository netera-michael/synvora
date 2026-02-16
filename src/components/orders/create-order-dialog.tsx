"use client";

import { Fragment, useEffect, useMemo } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useForm } from "react-hook-form";
import { Save, X } from "lucide-react";
import type { OrderDto } from "@/types/orders";
import { formatCurrency, formatDateTimeForInput } from "@/lib/utils";

type CreateOrderDialogProps = {
  open: boolean;
  initialOrder?: OrderDto | null;
  onClose: () => void;
  onOrderCreated: (order: OrderDto) => void;
};

type CreateOrderValues = {
  orderNumber: string;
  customerName: string;
  venue: string;
  financialStatus: string;
  totalAmount: number;
  currency: string;
  processedAt: string;
  exchangeRate: number;
  tags: string;
  notes: string;
  originalAmount: number | null;
};

const mapOrderToForm = (order: OrderDto): CreateOrderValues => {
  const exchangeRate =
    typeof order.exchangeRate === "number" && order.exchangeRate > 0 ? order.exchangeRate : 48.5;
  const originalAmount =
    typeof order.originalAmount === "number" && order.originalAmount >= 0 ? order.originalAmount : null;
  const base =
    originalAmount !== null ? originalAmount / exchangeRate : order.totalAmount;
  const totalAmount =
    originalAmount !== null ? Number((base * 1.035).toFixed(2)) : order.totalAmount;

  return {
    orderNumber: "",
    customerName: order.customerName ?? "No Customer",
    venue: order.venue?.name ?? "CICCIO",
    financialStatus: order.financialStatus ?? "Paid",
    totalAmount,
    currency: order.currency ?? "USD",
    // Use current timestamp for duplicates so they appear at the top as newest orders
    processedAt: formatDateTimeForInput(new Date()),
    exchangeRate,
    tags: order.tags?.join(", ") ?? "",
    notes: order.notes ?? "",
    originalAmount
  };
};

export function CreateOrderDialog({ open, initialOrder, onClose, onOrderCreated }: CreateOrderDialogProps) {
  const defaultValues: CreateOrderValues = {
    orderNumber: "",
    customerName: "No Customer",
    venue: "CICCIO",
    financialStatus: "Paid",
    totalAmount: 0,
    currency: "USD",
    processedAt: formatDateTimeForInput(new Date()),
    exchangeRate: 48.5,
    tags: "",
    notes: "",
    originalAmount: null
  };

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { isSubmitting }
  } = useForm<CreateOrderValues>({
    defaultValues
  });

  const originalAmount = watch("originalAmount");
  const exchangeRate = watch("exchangeRate");

  useEffect(() => {
    if (!open) {
      return;
    }

    if (initialOrder) {
      const mapped = mapOrderToForm(initialOrder);
      reset({
        ...defaultValues,
        ...mapped
      });
    } else {
      reset({
        ...defaultValues,
        processedAt: formatDateTimeForInput(new Date())
      });
    }
  }, [open, initialOrder, reset]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (typeof originalAmount === "number" && originalAmount >= 0 && typeof exchangeRate === "number" && exchangeRate > 0) {
      const base = originalAmount / exchangeRate;
      const total = Number.isFinite(base) ? Number((base * 1.035).toFixed(2)) : 0;
      setValue("totalAmount", total, { shouldDirty: false, shouldValidate: true });
    } else {
      setValue("totalAmount", 0, { shouldDirty: false, shouldValidate: true });
    }
  }, [originalAmount, exchangeRate, setValue]);

  const payoutAmount = useMemo(() => {
    if (typeof originalAmount === "number" && originalAmount >= 0 && typeof exchangeRate === "number" && exchangeRate > 0) {
      const base = originalAmount / exchangeRate;
      return Number((base * 0.9825).toFixed(2));
    }
    return 0;
  }, [originalAmount, exchangeRate]);

  const submit = handleSubmit(async (values) => {
    const trimmedCustomer = values.customerName?.trim();
    const trimmedVenue = values.venue?.trim();
    const trimmedOrderNumber = values.orderNumber?.trim();
    const normalizedOrderNumber =
      trimmedOrderNumber && trimmedOrderNumber.length > 0
        ? trimmedOrderNumber.startsWith("#")
          ? trimmedOrderNumber
          : `#${trimmedOrderNumber}`
        : undefined;
    const processedAtIso = values.processedAt ? new Date(values.processedAt).toISOString() : new Date().toISOString();

    const payload = {
      ...values,
      customerName: trimmedCustomer && trimmedCustomer.length > 0 ? trimmedCustomer : "No Customer",
      venue: trimmedVenue && trimmedVenue.length > 0 ? trimmedVenue : "CICCIO",
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

    const response = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error("Failed to create order");
      return;
    }

    const order = (await response.json()) as OrderDto;
    onOrderCreated(order);
    reset({
      ...defaultValues,
      processedAt: formatDateTimeForInput(new Date())
    });
    onClose();
  });

  const close = () => {
    reset({
      ...defaultValues,
      processedAt: formatDateTimeForInput(new Date())
    });
    onClose();
  };

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={close}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" />
        </Transition.Child>
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="transform transition ease-out duration-200"
            enterFrom="translate-y-6 opacity-0"
            enterTo="translate-y-0 opacity-100"
            leave="transform transition ease-in duration-150"
            leaveFrom="translate-y-0 opacity-100"
            leaveTo="translate-y-4 opacity-0"
          >
            <Dialog.Panel className="w-full max-w-3xl rounded-xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-synvora-border px-6 py-4">
                <div>
                  <Dialog.Title className="text-lg font-semibold text-synvora-text">Create order</Dialog.Title>
                  <Dialog.Description className="text-sm text-synvora-text-secondary">
                    Capture orders created outside of Shopify directly in Synvora.
                  </Dialog.Description>
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-synvora-text-secondary hover:bg-synvora-surface-hover hover:text-synvora-text transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={submit} className="max-h-[70vh] overflow-y-auto px-6 py-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
                    Order number
                    <input
                      {...register("orderNumber")}
                      className="rounded-lg border border-synvora-border px-3 py-2 text-sm text-synvora-text shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                      placeholder="#1050"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
                    Customer name
                    <input
                      {...register("customerName")}
                      className="rounded-lg border border-synvora-border px-3 py-2 text-sm text-synvora-text shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                      placeholder="No Customer"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
                    Venue
                    <select
                      {...register("venue")}
                      className="rounded-lg border border-synvora-border px-3 py-2 text-sm text-synvora-text shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                    >
                      <option value="CICCIO">CICCIO</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
                    Payment status
                    <input
                      {...register("financialStatus")}
                      className="rounded-lg border border-synvora-border px-3 py-2 text-sm text-synvora-text shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                      placeholder="Paid"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
                    Total amount (USD)
                    <input
                      type="number"
                      step="0.01"
                      readOnly
                      {...register("totalAmount", { valueAsNumber: true })}
                      className="rounded-lg border border-synvora-border bg-synvora-surface-active px-3 py-2 text-sm text-synvora-text shadow-sm focus-visible:outline-none cursor-not-allowed"
                    />
                    <span className="text-xs font-normal text-synvora-text-secondary">
                      Auto-calculated from EGP amount × 1.035 / rate.
                    </span>
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
                    Original amount (EGP)
                    <input
                      type="number"
                      step="0.01"
                      {...register("originalAmount", { valueAsNumber: true })}
                      className="rounded-lg border border-synvora-border px-3 py-2 text-sm text-synvora-text shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                      placeholder="2450"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
                    USD/EGP rate
                    <input
                      type="number"
                      step="0.01"
                      {...register("exchangeRate", { valueAsNumber: true })}
                      className="rounded-lg border border-synvora-border px-3 py-2 text-sm text-synvora-text shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
                    Currency
                    <input
                      {...register("currency")}
                      className="uppercase rounded-lg border border-synvora-border px-3 py-2 text-sm text-synvora-text shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
                    Processed at
                    <input
                      type="datetime-local"
                      {...register("processedAt")}
                      className="rounded-lg border border-synvora-border px-3 py-2 text-sm text-synvora-text shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                    />
                  </label>
                </div>

                <div className="mt-2 rounded-lg border border-dashed border-synvora-border bg-synvora-surface px-4 py-3 text-sm text-synvora-text-secondary">
                  <p className="font-medium text-synvora-text">Expected payout</p>
                  <p className="mt-1 text-lg font-semibold text-synvora-text">
                    {formatCurrency(payoutAmount, "USD")}
                  </p>
                  <p className="text-xs text-synvora-text-secondary">
                    Calculated as 0.9825 × (EGP ÷ rate).
                  </p>
                </div>

                <label className="mt-4 flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
                  Tags
                  <input
                    {...register("tags")}
                    className="rounded-lg border border-synvora-border px-3 py-2 text-sm text-synvora-text shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                    placeholder="VIP, Express"
                  />
                </label>

                <label className="mt-4 flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
                  Notes
                  <textarea
                    rows={3}
                    {...register("notes")}
                    className="rounded-lg border border-synvora-border px-3 py-2 text-sm text-synvora-text shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                  />
                </label>



                <div className="mt-6 flex items-center justify-end gap-3 border-t border-synvora-border pt-4">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-lg border border-synvora-border px-4 py-2 text-sm font-medium text-synvora-text-secondary transition hover:bg-synvora-surface-hover hover:text-synvora-text"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-lg bg-synvora-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-synvora-primary/90 disabled:cursor-not-allowed disabled:bg-synvora-surface-disabled disabled:text-synvora-text-secondary"
                  >
                    <Save className="h-4 w-4" />
                    {isSubmitting ? "Creating..." : "Create order"}
                  </button>
                </div>
              </form>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
