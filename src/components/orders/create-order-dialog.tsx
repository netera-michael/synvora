"use client";

import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useForm, useFieldArray } from "react-hook-form";
import { Save, X } from "lucide-react";
import type { OrderDto } from "@/types/orders";

type CreateOrderDialogProps = {
  open: boolean;
  onClose: () => void;
  onOrderCreated: (order: OrderDto) => void;
};

type CreateOrderValues = {
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  currency: string;
  processedAt: string;
  shippingCity: string;
  shippingCountry: string;
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

export function CreateOrderDialog({ open, onClose, onOrderCreated }: CreateOrderDialogProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { isSubmitting }
  } = useForm<CreateOrderValues>({
    defaultValues: {
      orderNumber: "",
      customerName: "No Customer",
      totalAmount: 0,
      currency: "USD",
      processedAt: new Date().toISOString().slice(0, 10),
      shippingCity: "",
      shippingCountry: "",
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
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lineItems"
  });

  const submit = handleSubmit(async (values) => {
    const trimmedCustomer = values.customerName?.trim();
    const trimmedOrderNumber = values.orderNumber?.trim();
    const payload = {
      ...values,
      customerName: trimmedCustomer && trimmedCustomer.length > 0 ? trimmedCustomer : "No Customer",
      orderNumber: trimmedOrderNumber && trimmedOrderNumber.length > 0 ? trimmedOrderNumber : undefined,
      originalAmount:
        typeof values.originalAmount === "number" && !Number.isNaN(values.originalAmount)
          ? values.originalAmount
          : null,
      tags: values.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      lineItems: values.lineItems.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        price: Number(item.price),
        total: Number(item.total)
      }))
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
    reset();
    onClose();
  });

  const close = () => {
    reset();
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
                    Total amount
                    <input
                      type="number"
                      step="0.01"
                      {...register("totalAmount", { valueAsNumber: true })}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                    />
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
                    Currency
                    <input
                      {...register("currency")}
                      className="uppercase rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                    Processed at
                    <input
                      type="date"
                      {...register("processedAt")}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                    Shipping city
                    <input
                      {...register("shippingCity")}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                    Shipping country
                    <input
                      {...register("shippingCountry")}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                    />
                  </label>
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
                          {fields.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="text-xs font-semibold text-rose-500"
                            >
                              Remove
                            </button>
                          ) : null}
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
