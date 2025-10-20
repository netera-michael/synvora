"use client";

import { Fragment, useEffect, useMemo } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useForm, useFieldArray } from "react-hook-form";
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
  financialStatus: string;
  totalAmount: number;
  currency: string;
  processedAt: string;
  exchangeRate: number;
  tags: string;
  notes: string;
  originalAmount: number | null;
  lineItems: Array<{
    productName: string;
    quantity: number;
    sku: string;
    price: number;
    total: number;
  }>;
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
    financialStatus: order.financialStatus ?? "Paid",
    totalAmount,
    currency: order.currency ?? "USD",
    processedAt: formatDateTimeForInput(order.processedAt),
    exchangeRate,
    tags: order.tags?.join(", ") ?? "",
    notes: order.notes ?? "",
    originalAmount,
    lineItems:
      order.lineItems && order.lineItems.length
        ? order.lineItems.map((item) => ({
            productName: item.productName,
            quantity: item.quantity,
            sku: item.sku ?? "",
            price: item.price,
            total: item.total
          }))
        : [
            {
              productName: "",
              quantity: 1,
              sku: "",
              price: 0,
              total: 0
            }
          ]
  };
};

export function CreateOrderDialog({ open, initialOrder, onClose, onOrderCreated }: CreateOrderDialogProps) {
  const defaultValues: CreateOrderValues = {
    orderNumber: "",
    customerName: "No Customer",
    financialStatus: "Paid",
    totalAmount: 0,
    currency: "USD",
    processedAt: formatDateTimeForInput(new Date()),
    exchangeRate: 48.5,
    tags: "",
    notes: "",
    originalAmount: null,
    lineItems: [
      {
        productName: "",
        quantity: 1,
        sku: "",
        price: 0,
        total: 0
      }
    ]
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

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lineItems"
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
      lineItems: values.lineItems
        .filter((item) => item.productName.trim().length > 0)
        .map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          price: Number(item.price),
          total: Number(item.total)
        })),
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
            <Dialog.Panel className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div>
                  <Dialog.Title className="text-lg font-semibold text-slate-900">Create order</Dialog.Title>
                  <Dialog.Description className="text-sm text-slate-500">
                    Capture orders created outside of Shopify directly in Synvora.
                  </Dialog.Description>
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={submit} className="max-h-[70vh] overflow-y-auto px-6 py-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                    Order number
                    <input
                      {...register("orderNumber")}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                      placeholder="#1050"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                    Customer name
                    <input
                      {...register("customerName")}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                      placeholder="No Customer"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                    Payment status
                    <input
                      {...register("financialStatus")}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                      placeholder="Paid"
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
                    Original amount (EGP)
                    <input
                      type="number"
                      step="0.01"
                      {...register("originalAmount", { valueAsNumber: true })}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                      placeholder="2450"
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
                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                    Currency
                    <input
                      {...register("currency")}
                      className="uppercase rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                    Processed at
                    <input
                      type="datetime-local"
                      {...register("processedAt")}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                    />
                  </label>
                </div>

                <div className="mt-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <p className="font-semibold text-slate-800">Expected payout</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {formatCurrency(payoutAmount, "USD")}
                  </p>
                  <p className="text-xs text-slate-500">
                    Calculated as 0.9825 × (EGP ÷ rate).
                  </p>
                </div>

                <label className="mt-4 flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  Tags
                  <input
                    {...register("tags")}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                    placeholder="VIP, Express"
                  />
                </label>

                <label className="mt-4 flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  Notes
                  <textarea
                    rows={3}
                    {...register("notes")}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                  />
                </label>

                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">Line items</p>
                    <button
                      type="button"
                      onClick={() =>
                        append({ productName: "", quantity: 1, sku: "", price: 0, total: 0 })
                      }
                      className="text-sm font-semibold text-synvora-primary"
                    >
                      + Add line
                    </button>
                  </div>
                  <div className="mt-4 space-y-4">
                    {fields.map((field, index) => (
                      <div key={field.id} className="rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-700">Item {index + 1}</p>
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="text-xs font-semibold text-rose-500"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-4">
                          <input
                            placeholder="Product name"
                            {...register(`lineItems.${index}.productName` as const)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30 md:col-span-2"
                          />
                          <input
                            type="number"
                            placeholder="Qty"
                            {...register(`lineItems.${index}.quantity` as const, { valueAsNumber: true })}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                          />
                          <input
                            placeholder="SKU"
                            {...register(`lineItems.${index}.sku` as const)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                          />
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Unit price"
                            {...register(`lineItems.${index}.price` as const, { valueAsNumber: true })}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                          />
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Total"
                            {...register(`lineItems.${index}.total` as const, { valueAsNumber: true })}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-synvora-primary px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-synvora-primary/90 disabled:cursor-not-allowed disabled:bg-slate-300"
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
