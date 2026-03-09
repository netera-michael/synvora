"use client";

import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, ChevronRight } from "lucide-react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { OrderDrawer } from "@/components/orders/order-drawer";
import type { OrderDto } from "@/types/orders";

type OrdersResponse = { orders: OrderDto[] };

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

export function DayOrdersPanel({ open, date, dateLabel, onClose }: DayOrdersPanelProps) {
  const { data: session } = useSession();
  const isAdmin = session?.user.role === "ADMIN";
  const tzOffset = new Date().getTimezoneOffset();

  const [selectedOrder, setSelectedOrder] = useState<OrderDto | null>(null);
  const [orderDrawerOpen, setOrderDrawerOpen] = useState(false);

  const param = date ? toDayParam(date) : null;
  const { data, isLoading } = useSWR<OrdersResponse>(
    open && param ? `/api/orders?startDate=${param}&endDate=${param}&page=all&tzOffset=${tzOffset}` : null,
    fetcher
  );

  const orders: OrderDto[] = data?.orders ?? [];
  const totalEGP = orders.reduce((s, o) => s + (o.originalAmount ?? 0), 0);
  const totalUSD = orders.reduce((s, o) => s + o.totalAmount, 0);

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
                </div>

                {/* Footer totals */}
                {!isLoading && orders.length > 0 && (
                  <div className="border-t border-synvora-border bg-synvora-surface px-5 py-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-synvora-text-secondary">Total</span>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-synvora-text tabular-nums">
                        {fmt(totalEGP)} EGP
                      </p>
                      <p className="text-xs text-synvora-text-secondary tabular-nums">
                        {fmtUSD(totalUSD)}{" "}
                        <span className="text-synvora-border">·</span>{" "}
                        {fmt(totalUSD * 3.67)} AED
                      </p>
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
