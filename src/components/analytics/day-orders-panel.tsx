"use client";

import { Fragment, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, ChevronRight, Save, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import useSWR, { useSWRConfig } from "swr";
import { toast } from "sonner";
import { OrderDrawer } from "@/components/orders/order-drawer";
import { CLIENT_COMMISSION_RATE } from "@/lib/constants";
import type { OrderDto } from "@/types/orders";

type OrdersResponse = { orders: OrderDto[] };
type DeductionDto = {
  id: number;
  venueId: number;
  date: string;
  amount: number;
  note?: string | null;
  venue: {
    id: number;
    name: string;
    slug: string;
  };
};
type DeductionsResponse = {
  deductions: DeductionDto[];
  totalAmount: number;
};
type VenuesResponse = {
  venues: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
};

type DayOrdersPanelProps = {
  open: boolean;
  date: string | null; // YYYY-MM-DD
  dateLabel: string;
  onClose: () => void;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function toDayParam(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

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

function getOrderAedRate(order: OrderDto) {
  if (typeof order.aedEgpRate === "number" && order.aedEgpRate > 0) {
    return order.aedEgpRate;
  }

  if (typeof order.exchangeRate === "number" && order.exchangeRate > 0 && order.exchangeRate <= 20) {
    return order.exchangeRate;
  }

  return null;
}

function calculateNetAedPayout(order: OrderDto) {
  const rate = getOrderAedRate(order);
  if (typeof order.originalAmount === "number" && order.originalAmount > 0 && rate) {
    return order.originalAmount * (1 - CLIENT_COMMISSION_RATE) / rate;
  }
  return 0;
}

export function DayOrdersPanel({ open, date, dateLabel, onClose }: DayOrdersPanelProps) {
  const { data: session } = useSession();
  const { mutate: mutateGlobal } = useSWRConfig();
  const isAdmin = session?.user.role === "ADMIN";
  const tzOffset = new Date().getTimezoneOffset();

  const [selectedOrder, setSelectedOrder] = useState<OrderDto | null>(null);
  const [orderDrawerOpen, setOrderDrawerOpen] = useState(false);
  const [selectedVenueId, setSelectedVenueId] = useState<number | "">("");
  const [deductionAmount, setDeductionAmount] = useState("");
  const [deductionNote, setDeductionNote] = useState("");
  const [isSavingDeduction, setIsSavingDeduction] = useState(false);

  const param = date ? toDayParam(date) : null;
  const { data, isLoading } = useSWR<OrdersResponse>(
    open && param ? `/api/orders?startDate=${param}&endDate=${param}&page=all&tzOffset=${tzOffset}` : null,
    fetcher
  );
  const deductionsKey = open && date && isAdmin ? `/api/daily-deductions?date=${date}` : null;
  const { data: deductionsData, isLoading: isDeductionsLoading, mutate: mutateDeductions } = useSWR<DeductionsResponse>(
    deductionsKey,
    fetcher
  );
  const { data: venuesData } = useSWR<VenuesResponse>(
    open && isAdmin ? "/api/venues" : null,
    fetcher
  );

  const orders: OrderDto[] = data?.orders ?? [];
  const deductions = deductionsData?.deductions ?? [];
  const totalEGP = orders.reduce((s, o) => s + (o.originalAmount ?? 0), 0);
  const totalUSD = orders.reduce((s, o) => s + o.totalAmount, 0);
  const grossAED = orders.reduce((s, o) => s + calculateNetAedPayout(o), 0);
  const totalDeductions = deductionsData?.totalAmount ?? 0;
  const totalAED = grossAED - totalDeductions;

  useEffect(() => {
    if (!open) {
      setSelectedVenueId("");
      setDeductionAmount("");
      setDeductionNote("");
      return;
    }

    if (!isAdmin || !venuesData?.venues.length) {
      return;
    }

    if (selectedVenueId === "") {
      setSelectedVenueId(venuesData.venues[0].id);
    }
  }, [isAdmin, open, selectedVenueId, venuesData]);

  const resetDeductionForm = () => {
    if (venuesData?.venues.length) {
      setSelectedVenueId(venuesData.venues[0].id);
    } else {
      setSelectedVenueId("");
    }
    setDeductionAmount("");
    setDeductionNote("");
  };

  const handleOrderClick = (order: OrderDto) => {
    setSelectedOrder(order);
    setOrderDrawerOpen(true);
  };

  const handleOrderUpdated = (order: OrderDto) => {
    setSelectedOrder(order);
  };

  const handleOrderDeleted = () => {
    setOrderDrawerOpen(false);
    setSelectedOrder(null);
  };

  const handleDeductionSave = async () => {
    if (!date) {
      return;
    }

    if (selectedVenueId === "") {
      toast.error("Select a venue first.");
      return;
    }

    const amount = Number(deductionAmount);
    if (Number.isNaN(amount) || amount < 0) {
      toast.error("Enter a valid deduction amount.");
      return;
    }

    setIsSavingDeduction(true);
    const response = await fetch("/api/daily-deductions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        venueId: selectedVenueId,
        amount,
        note: deductionNote.trim() || null
      })
    });

    setIsSavingDeduction(false);

    if (!response.ok) {
      toast.error("Failed to save deduction.");
      return;
    }

    await mutateDeductions();
    await mutateGlobal((key) => typeof key === "string" && key.startsWith("/api/analytics?"));
    resetDeductionForm();
    toast.success(amount === 0 ? "Deduction removed." : "Deduction saved.");
  };

  const handleDeductionDelete = async (venueId: number) => {
    if (!date) {
      return;
    }

    const response = await fetch("/api/daily-deductions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, venueId })
    });

    if (!response.ok) {
      toast.error("Failed to delete deduction.");
      return;
    }

    await mutateDeductions();
    await mutateGlobal((key) => typeof key === "string" && key.startsWith("/api/analytics?"));
    if (selectedVenueId === venueId) {
      resetDeductionForm();
    }
    toast.success("Deduction deleted.");
  };

  const editDeduction = (deduction: DeductionDto) => {
    setSelectedVenueId(deduction.venueId);
    setDeductionAmount(String(deduction.amount));
    setDeductionNote(deduction.note ?? "");
  };

  return (
    <>
      <Transition show={open} as={Fragment}>
        <Dialog onClose={onClose} className="relative z-40">
          {/* Backdrop */}
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
          </Transition.Child>

          {/* Panel — bottom sheet on mobile, right slide-over on sm+ */}
          <div className="fixed inset-0 flex items-end sm:items-stretch sm:justify-end pointer-events-none">
            <Transition.Child
              as={Fragment}
              enter="transform transition ease-out duration-300"
              enterFrom="translate-y-full sm:translate-y-0 sm:translate-x-full"
              enterTo="translate-y-0 sm:translate-x-0"
              leave="transform transition ease-in duration-200"
              leaveFrom="translate-y-0 sm:translate-x-0"
              leaveTo="translate-y-full sm:translate-y-0 sm:translate-x-full"
            >
              <Dialog.Panel className="pointer-events-auto w-full sm:max-w-md bg-white shadow-2xl flex flex-col max-h-[88vh] sm:max-h-full sm:h-full rounded-t-2xl sm:rounded-none border-t border-synvora-border sm:border-t-0 sm:border-l">
                {/* Handle bar (mobile only) */}
                <div className="flex justify-center pt-3 pb-1 sm:hidden">
                  <div className="h-1 w-10 rounded-full bg-synvora-border" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-synvora-border">
                  <div>
                    <Dialog.Title className="text-base font-semibold text-synvora-text">
                      {dateLabel}
                    </Dialog.Title>
                    <p className="text-xs text-synvora-text-secondary mt-0.5">
                      {isLoading ? "Loading…" : `${orders.length} order${orders.length !== 1 ? "s" : ""}`}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="rounded-lg p-2 text-synvora-text-secondary hover:bg-synvora-surface hover:text-synvora-text transition"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Orders list */}
                <div className="flex-1 overflow-y-auto">
                  {isLoading ? (
                    <div className="space-y-0 divide-y divide-synvora-border">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="px-5 py-4 animate-pulse">
                          <div className="flex items-center justify-between">
                            <div className="space-y-2">
                              <div className="h-3.5 w-24 rounded bg-synvora-surface" />
                              <div className="h-3 w-32 rounded bg-synvora-surface" />
                            </div>
                            <div className="space-y-2 text-right">
                              <div className="h-3.5 w-20 rounded bg-synvora-surface ml-auto" />
                              <div className="h-3 w-14 rounded bg-synvora-surface ml-auto" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-synvora-text-secondary">
                      <p className="text-sm">No orders found for this day.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-synvora-border">
                      {orders.map((order) => (
                        <button
                          key={order.id}
                          onClick={() => handleOrderClick(order)}
                          className="w-full text-left px-5 py-3.5 hover:bg-synvora-surface transition group flex items-center justify-between gap-4"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-synvora-text">
                                {order.orderNumber}
                              </span>
                              {order.financialStatus && (
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                    order.financialStatus.toLowerCase() === "paid"
                                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                      : order.financialStatus.toLowerCase() === "refunded"
                                      ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                                      : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                                  }`}
                                >
                                  {order.financialStatus}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-synvora-text-secondary mt-0.5 truncate">
                              {order.customerName}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="text-right">
                              {order.originalAmount ? (
                                <p className="text-sm font-semibold text-synvora-text tabular-nums">
                                  {fmt(order.originalAmount)} EGP
                                </p>
                              ) : null}
                              <p className="text-xs text-synvora-text-secondary tabular-nums">
                                {fmtUSD(order.totalAmount)}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-synvora-border opacity-0 group-hover:opacity-100 transition flex-shrink-0" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {isAdmin ? (
                    <div className="border-t border-synvora-border bg-white px-5 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-synvora-text">Day Deductions</h3>
                          <p className="mt-0.5 text-xs text-synvora-text-secondary">
                            AED deductions are subtracted from the day and month payout totals.
                          </p>
                        </div>
                        {!isDeductionsLoading && (
                          <span className="text-xs font-medium text-synvora-text-secondary">
                            {fmt(totalDeductions)} AED deducted
                          </span>
                        )}
                      </div>

                      <div className="mt-4 space-y-2">
                        {deductions.length === 0 ? (
                          <p className="text-sm text-synvora-text-secondary">No deductions saved for this day.</p>
                        ) : (
                          deductions.map((deduction) => (
                            <div
                              key={deduction.id}
                              className="flex items-start justify-between gap-3 rounded-xl border border-synvora-border bg-synvora-surface px-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-synvora-text">{deduction.venue.name}</p>
                                <p className="text-xs text-synvora-text-secondary">
                                  {fmt(deduction.amount)} AED
                                  {deduction.note ? ` • ${deduction.note}` : ""}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => editDeduction(deduction)}
                                  className="rounded-lg px-2 py-1 text-xs font-medium text-synvora-text-secondary hover:bg-white hover:text-synvora-text"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeductionDelete(deduction.venueId)}
                                  className="rounded-lg p-1.5 text-rose-600 hover:bg-white"
                                  aria-label={`Delete deduction for ${deduction.venue.name}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="mt-4 rounded-xl border border-synvora-border bg-synvora-surface px-4 py-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block">
                            <span className="text-xs font-medium uppercase tracking-wide text-synvora-text-secondary">
                              Venue
                            </span>
                            <select
                              value={selectedVenueId}
                              onChange={(event) =>
                                setSelectedVenueId(event.target.value ? Number(event.target.value) : "")
                              }
                              className="mt-1 w-full rounded-lg border border-synvora-border bg-white px-3 py-2 text-sm text-synvora-text outline-none focus:border-synvora-primary"
                            >
                              <option value="">Select venue</option>
                              {(venuesData?.venues ?? []).map((venue) => (
                                <option key={venue.id} value={venue.id}>
                                  {venue.name}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="block">
                            <span className="text-xs font-medium uppercase tracking-wide text-synvora-text-secondary">
                              Deduction AED
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={deductionAmount}
                              onChange={(event) => setDeductionAmount(event.target.value)}
                              className="mt-1 w-full rounded-lg border border-synvora-border bg-white px-3 py-2 text-sm text-synvora-text outline-none focus:border-synvora-primary"
                              placeholder="0.00"
                            />
                          </label>
                        </div>

                        <label className="mt-3 block">
                          <span className="text-xs font-medium uppercase tracking-wide text-synvora-text-secondary">
                            Note
                          </span>
                          <input
                            type="text"
                            value={deductionNote}
                            onChange={(event) => setDeductionNote(event.target.value)}
                            className="mt-1 w-full rounded-lg border border-synvora-border bg-white px-3 py-2 text-sm text-synvora-text outline-none focus:border-synvora-primary"
                            placeholder="Optional note"
                          />
                        </label>

                        <div className="mt-3 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={resetDeductionForm}
                            className="rounded-lg border border-synvora-border px-3 py-2 text-sm font-medium text-synvora-text-secondary hover:bg-white"
                          >
                            Reset
                          </button>
                          <button
                            type="button"
                            onClick={handleDeductionSave}
                            disabled={isSavingDeduction}
                            className="inline-flex items-center gap-2 rounded-lg bg-synvora-primary px-3 py-2 text-sm font-medium text-white hover:bg-synvora-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Save className="h-4 w-4" />
                            {isSavingDeduction ? "Saving..." : "Save Deduction"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Footer totals */}
                {!isLoading && (orders.length > 0 || totalDeductions > 0) && (
                  <div className="border-t border-synvora-border bg-synvora-surface px-5 py-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-synvora-text-secondary">Total</span>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-synvora-text tabular-nums">
                        {fmt(totalEGP)} EGP
                      </p>
                      {isAdmin ? (
                        <>
                          <p className="text-xs text-synvora-text-secondary tabular-nums">
                            {fmtUSD(totalUSD)}{" "}
                            <span className="text-synvora-border">·</span>{" "}
                            {fmt(grossAED)} gross AED
                          </p>
                          {totalDeductions > 0 ? (
                            <p className="text-xs text-rose-600 tabular-nums">
                              -{fmt(totalDeductions)} AED deductions
                            </p>
                          ) : null}
                          <p className="text-sm font-semibold text-synvora-text tabular-nums">
                            {fmt(totalAED)} net AED
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-synvora-text-secondary tabular-nums">
                          {fmtUSD(totalUSD)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>

      {/* Order detail drawer — renders on top of panel */}
      <OrderDrawer
        open={orderDrawerOpen}
        order={selectedOrder}
        onClose={() => {
          setOrderDrawerOpen(false);
          setSelectedOrder(null);
        }}
        onOrderUpdated={handleOrderUpdated}
        onOrderDeleted={handleOrderDeleted}
        canManage={isAdmin}
        isAdmin={isAdmin}
      />
    </>
  );
}
