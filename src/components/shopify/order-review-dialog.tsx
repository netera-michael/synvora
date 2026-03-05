"use client";

import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, ChevronDown, ChevronRight, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { PLATFORM_FEE_MULTIPLIER, CLIENT_COMMISSION_RATE, AED_USD_PEG } from "@/lib/constants";

type TransformedOrder = {
  externalId: string;
  shopifyStoreId?: number;
  storeName?: string;
  orderNumber: string;
  customerName: string;
  status: string;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  totalAmount: number;
  originalAmount: number | null;
  shopifyUSD: number;
  currency: string;
  processedAt: string;
  shippingCity: string | null;
  shippingCountry: string | null;
  tags: string[];
  notes: string | null;
  lineItems: Array<{
    productName: string;
    quantity: number;
    sku?: string;
    price: number;
    total: number;
  }>;
};

type ShopifyStore = {
  id: number;
  storeDomain: string;
  nickname: string | null;
  venue: { id: number; name: string };
};

type OrderReviewDialogProps = {
  open: boolean;
  onClose: () => void;
  orders: TransformedOrder[];
  store: ShopifyStore | null;
  onImportComplete: () => void;
};

/** Derive all amounts for an order given its EGP and the daily AED/EGP rate */
function deriveAmounts(egp: number, aedEgpRate: number) {
  const aedBase = egp / aedEgpRate;
  const revenueUSD = Number(((aedBase / AED_USD_PEG) * PLATFORM_FEE_MULTIPLIER).toFixed(2));
  const payoutAED = Number((aedBase * (1 - CLIENT_COMMISSION_RATE)).toFixed(2));
  return { revenueUSD, payoutAED, aedBase };
}

export function OrderReviewDialog({
  open,
  onClose,
  orders,
  store,
  onImportComplete,
}: OrderReviewDialogProps) {
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(
    new Set(orders.map((o) => o.externalId))
  );
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    updated: number;
    skipped: number;
  } | null>(null);

  // Daily AED/EGP rate per day group (key = "Jan 13, 2026" etc.)
  const [dailyRates, setDailyRates] = useState<Record<string, number>>({});
  // Per-order EGP override (for custom sales or manual corrections)
  const [egpOverrides, setEgpOverrides] = useState<Record<string, number>>({});

  const isMultiStore = orders.some(
    (o) => o.shopifyStoreId && o.shopifyStoreId !== orders[0]?.shopifyStoreId
  );

  const getOrderDate = (order: TransformedOrder) =>
    new Date(order.processedAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  /** Get the effective EGP for an order (override > catalog > null) */
  const getEGP = (order: TransformedOrder): number | null => {
    if (egpOverrides[order.externalId] !== undefined) return egpOverrides[order.externalId];
    return order.originalAmount;
  };

  /** Get the daily rate for an order's date */
  const getRateForOrder = (order: TransformedOrder): number | null => {
    const date = getOrderDate(order);
    return dailyRates[date] ?? null;
  };

  /** Get computed USD revenue and AED payout for display */
  const getComputedAmounts = (order: TransformedOrder) => {
    const egp = getEGP(order);
    const rate = getRateForOrder(order);
    if (egp !== null && rate) return deriveAmounts(egp, rate);
    return null;
  };

  const toggleOrder = (externalId: string) => {
    const next = new Set(selectedOrders);
    next.has(externalId) ? next.delete(externalId) : next.add(externalId);
    setSelectedOrders(next);
  };

  const toggleAll = () => {
    setSelectedOrders(
      selectedOrders.size === orders.length
        ? new Set()
        : new Set(orders.map((o) => o.externalId))
    );
  };

  const toggleExpand = (externalId: string) => {
    const next = new Set(expandedOrders);
    next.has(externalId) ? next.delete(externalId) : next.add(externalId);
    setExpandedOrders(next);
  };

  const formatCurrency = (amount: number, currency = "USD") =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);

  const formatEGP = (amount: number) =>
    new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  // Sort + group by day
  const sortedOrders = [...orders].sort(
    (a, b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime()
  );
  const groups: { date: string; orders: TransformedOrder[] }[] = [];
  for (const order of sortedOrders) {
    const date = getOrderDate(order);
    const last = groups[groups.length - 1];
    if (last && last.date === date) last.orders.push(order);
    else groups.push({ date, orders: [order] });
  }

  const handleImport = async () => {
    if (selectedOrders.size === 0) return;

    // Validate every selected order has a rate + EGP
    const missingRate = [...selectedOrders].some((id) => {
      const order = orders.find((o) => o.externalId === id)!;
      return !getRateForOrder(order);
    });
    if (missingRate) {
      toast.error("Please enter the daily AED/EGP rate for every day that has selected orders.");
      return;
    }
    const missingEGP = [...selectedOrders].some((id) => {
      const order = orders.find((o) => o.externalId === id)!;
      return getEGP(order) === null;
    });
    if (missingEGP) {
      toast.error("Some orders are missing an EGP amount. Please enter it manually.");
      return;
    }

    setImporting(true);
    setImportResult(null);

    const ordersToImport = orders
      .filter((o) => selectedOrders.has(o.externalId))
      .map((order) => {
        const egp = getEGP(order)!;
        const rate = getRateForOrder(order)!;
        const { revenueUSD } = deriveAmounts(egp, rate);
        return {
          ...order,
          originalAmount: egp,
          totalAmount: revenueUSD,
          aedEgpRate: rate,
          exchangeRate: rate,
        };
      });

    try {
      const response = await fetch("/api/shopify/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId: store?.id ?? null, orders: ordersToImport }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to import orders" }));
        toast.error(`Error: ${error.message}`);
        setImporting(false);
        return;
      }

      const result = await response.json();
      setImportResult(result);
      toast.success(`Imported ${result.imported} orders successfully!`);
      setTimeout(() => onImportComplete(), 2000);
    } catch {
      toast.error("Failed to import orders. Please try again.");
      setImporting(false);
    }
  };

  // Footer totals
  const selectedData = orders.filter((o) => selectedOrders.has(o.externalId));
  const totalEGP = selectedData.reduce((sum, o) => sum + (getEGP(o) ?? 0), 0);
  const totalUSD = selectedData.reduce((sum, o) => {
    const c = getComputedAmounts(o);
    return sum + (c?.revenueUSD ?? 0);
  }, 0);
  const totalAED = selectedData.reduce((sum, o) => {
    const c = getComputedAmounts(o);
    return sum + (c?.payoutAED ?? 0);
  }, 0);

  const hasUnratedOrders = orders.some(
    (o) => selectedOrders.has(o.externalId) && !getRateForOrder(o)
  );
  const hasCustomSales = orders.some((o) => o.originalAmount === null);

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
          leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="transform transition ease-out duration-200"
            enterFrom="translate-y-6 opacity-0" enterTo="translate-y-0 opacity-100"
            leave="transform transition ease-in duration-150"
            leaveFrom="translate-y-0 opacity-100" leaveTo="translate-y-4 opacity-0"
          >
            <Dialog.Panel className="w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl flex flex-col">

              {/* Header */}
              <div className="flex items-center justify-between border-b border-synvora-border px-6 py-4 flex-none">
                <div>
                  <Dialog.Title className="text-lg font-semibold text-synvora-text">
                    Review Orders for Import
                  </Dialog.Title>
                  {store && (
                    <p className="text-sm text-synvora-text-secondary">
                      <span className="font-medium">{store.nickname || store.storeDomain}</span>
                      {" · "}
                      <span className="font-medium">{store.venue.name}</span>
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={importing}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-synvora-border text-synvora-text-secondary transition hover:bg-synvora-surface-hover"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Banners */}
              {(hasUnratedOrders || hasCustomSales) && !importResult && (
                <div className="flex-none px-6 pt-4 space-y-2">
                  {hasUnratedOrders && (
                    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      <AlertTriangle className="h-4 w-4 flex-none mt-0.5 text-amber-600" />
                      <p>Enter the <strong>AED/EGP rate</strong> for each day to unlock all calculations.</p>
                    </div>
                  )}
                  {hasCustomSales && (
                    <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                      <AlertTriangle className="h-4 w-4 flex-none mt-0.5 text-blue-500" />
                      <p>Some orders have <strong>no product match</strong> (custom sales). Enter the EGP amount manually or it will be derived from Shopify USD once you set the daily rate.</p>
                    </div>
                  )}
                </div>
              )}

              {importResult && (
                <div className="flex-none mx-6 mt-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-none" />
                  <p className="text-sm text-emerald-800 font-medium">
                    Import complete — Imported: {importResult.imported} · Updated: {importResult.updated} · Skipped: {importResult.skipped}
                  </p>
                </div>
              )}

              {/* Table */}
              <div className="flex-1 overflow-auto px-6 py-4">
                {orders.length === 0 ? (
                  <div className="text-center py-12 text-synvora-text-secondary">
                    No new orders found for the selected date range.
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-white border-b border-synvora-border">
                      <tr className="text-left text-xs font-semibold uppercase tracking-wide text-synvora-text-secondary">
                        <th className="px-3 py-3 w-10">
                          <input type="checkbox"
                            checked={selectedOrders.size === orders.length}
                            onChange={toggleAll}
                            disabled={importing}
                            className="rounded border-synvora-border text-synvora-primary focus:ring-synvora-primary"
                          />
                        </th>
                        <th className="px-3 py-3">Order</th>
                        {isMultiStore && <th className="px-3 py-3">Store</th>}
                        <th className="px-3 py-3">Customer</th>
                        <th className="px-3 py-3">Date</th>
                        <th className="px-3 py-3 text-right">EGP</th>
                        <th className="px-3 py-3 text-right">Revenue (USD)</th>
                        <th className="px-3 py-3 text-right">Payout (AED)</th>
                        <th className="px-3 py-3">Status</th>
                        <th className="px-3 py-3 w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-synvora-border/60">
                      {groups.flatMap((group) => {
                        const rate = dailyRates[group.date];
                        const selectedInGroup = group.orders.filter((o) => selectedOrders.has(o.externalId));
                        const groupEGP = selectedInGroup.reduce((s, o) => s + (getEGP(o) ?? 0), 0);
                        const groupUSD = selectedInGroup.reduce((s, o) => {
                          const c = getComputedAmounts(o);
                          return s + (c?.revenueUSD ?? 0);
                        }, 0);
                        const groupAED = selectedInGroup.reduce((s, o) => {
                          const c = getComputedAmounts(o);
                          return s + (c?.payoutAED ?? 0);
                        }, 0);

                        const orderRows = group.orders.flatMap((order) => {
                          const isSelected = selectedOrders.has(order.externalId);
                          const isExpanded = expandedOrders.has(order.externalId);
                          const egp = getEGP(order);
                          const computed = getComputedAmounts(order);
                          const isCustomSale = order.originalAmount === null && egpOverrides[order.externalId] === undefined;

                          return [
                            <tr
                              key={order.externalId}
                              className={`transition-colors ${isSelected ? "bg-synvora-primary/5" : "hover:bg-synvora-surface-active/50"}`}
                            >
                              <td className="px-3 py-3">
                                <input type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleOrder(order.externalId)}
                                  disabled={importing}
                                  className="rounded border-synvora-border text-synvora-primary focus:ring-synvora-primary"
                                />
                              </td>
                              <td className="px-3 py-3 font-medium text-synvora-text">{order.orderNumber}</td>
                              {isMultiStore && <td className="px-3 py-3 text-synvora-text-secondary">{order.storeName}</td>}
                              <td className="px-3 py-3 text-synvora-text">{order.customerName}</td>
                              <td className="px-3 py-3 text-synvora-text-secondary whitespace-nowrap">{formatDate(order.processedAt)}</td>

                              {/* EGP — editable for custom sales */}
                              <td className="px-3 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <input
                                    type="number"
                                    value={egpOverrides[order.externalId] ?? (order.originalAmount ?? "")}
                                    onChange={(e) => {
                                      const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                      setEgpOverrides((prev) => {
                                        const next = { ...prev };
                                        if (val === undefined) delete next[order.externalId];
                                        else next[order.externalId] = val;
                                        return next;
                                      });
                                    }}
                                    placeholder={isCustomSale ? "Enter EGP" : "0"}
                                    className={`w-28 rounded border px-2 py-1 text-right text-sm focus:outline-none focus:ring-1 focus:ring-synvora-primary ${
                                      isCustomSale
                                        ? "border-amber-300 bg-amber-50 placeholder-amber-400"
                                        : "border-synvora-border/50 bg-transparent"
                                    }`}
                                    disabled={importing}
                                  />
                                  <span className="text-[10px] text-synvora-text-secondary uppercase">EGP</span>
                                </div>
                              </td>

                              {/* Revenue USD — computed */}
                              <td className="px-3 py-3 text-right font-medium text-synvora-text">
                                {computed ? formatCurrency(computed.revenueUSD) : <span className="text-synvora-text-secondary">—</span>}
                              </td>

                              {/* Payout AED — computed */}
                              <td className="px-3 py-3 text-right font-medium text-synvora-text">
                                {computed ? (
                                  <span className="text-emerald-700">{formatCurrency(computed.payoutAED, "AED")}</span>
                                ) : (
                                  <span className="text-synvora-text-secondary">—</span>
                                )}
                              </td>

                              <td className="px-3 py-3">
                                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-synvora-text">
                                  {order.financialStatus || order.status}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-right">
                                <button
                                  onClick={() => toggleExpand(order.externalId)}
                                  disabled={importing}
                                  className="p-1 rounded text-slate-400 hover:text-synvora-text-secondary hover:bg-slate-100 transition"
                                >
                                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </button>
                              </td>
                            </tr>,

                            isExpanded && (
                              <tr key={`${order.externalId}-expanded`}>
                                <td colSpan={isMultiStore ? 10 : 9} className="px-6 py-3 bg-synvora-surface-active/30">
                                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-synvora-text-secondary">Line Items</p>
                                  <div className="rounded-xl border border-synvora-border overflow-hidden bg-white shadow-sm">
                                    <table className="w-full text-sm">
                                      <thead className="bg-synvora-surface-active/50 border-b border-synvora-border">
                                        <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-synvora-text-secondary">
                                          <th className="px-4 py-2">Product</th>
                                          <th className="px-4 py-2 text-center">Qty</th>
                                          <th className="px-4 py-2 text-right">Shopify Price (USD)</th>
                                          <th className="px-4 py-2 text-right">Total (USD)</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-synvora-border">
                                        {order.lineItems.map((item, idx) => (
                                          <tr key={idx} className="hover:bg-slate-50">
                                            <td className="px-4 py-2 font-medium text-synvora-text">{item.productName}</td>
                                            <td className="px-4 py-2 text-center">{item.quantity}</td>
                                            <td className="px-4 py-2 text-right text-synvora-text-secondary">{formatCurrency(item.price)}</td>
                                            <td className="px-4 py-2 text-right font-semibold">{formatCurrency(item.total)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                  <p className="mt-2 text-[10px] text-synvora-text-secondary">
                                    Shopify total: {formatCurrency(order.shopifyUSD)} — used only as fallback for unmatched custom sales
                                  </p>
                                </td>
                              </tr>
                            ),
                          ];
                        });

                        // Day summary row with rate input
                        const summaryRow = (
                          <tr key={`summary-${group.date}`} className="bg-slate-50 border-t-2 border-synvora-border">
                            <td colSpan={isMultiStore ? 4 : 3} className="px-3 py-3" />
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-synvora-text-secondary uppercase tracking-wide whitespace-nowrap">
                                  {group.date} — Rate:
                                </span>
                                <input
                                  type="number"
                                  value={rate ?? ""}
                                  onChange={(e) => {
                                    const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                    setDailyRates((prev) => {
                                      const next = { ...prev };
                                      if (val === undefined) delete next[group.date];
                                      else next[group.date] = val;
                                      return next;
                                    });
                                  }}
                                  placeholder="e.g. 13.15"
                                  step="0.01"
                                  className={`w-24 rounded border px-2 py-1 text-right text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-synvora-primary ${
                                    rate ? "border-synvora-primary bg-synvora-primary/5 text-synvora-primary" : "border-amber-300 bg-amber-50"
                                  }`}
                                  disabled={importing}
                                />
                                <span className="text-[10px] text-synvora-text-secondary uppercase">EGP/AED</span>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right text-xs font-bold text-synvora-text">
                              {formatEGP(groupEGP)} EGP
                            </td>
                            <td className="px-3 py-3 text-right text-xs font-bold text-synvora-text">
                              {groupUSD > 0 ? formatCurrency(groupUSD) : "—"}
                            </td>
                            <td className="px-3 py-3 text-right text-xs font-bold text-emerald-700">
                              {groupAED > 0 ? formatCurrency(groupAED, "AED") : "—"}
                            </td>
                            <td colSpan={2} />
                          </tr>
                        );

                        return [...orderRows, summaryRow];
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Footer */}
              <div className="flex-none flex items-center justify-between border-t border-synvora-border bg-synvora-surface-active px-6 py-4">
                <div className="flex items-center gap-5 text-sm text-synvora-text-secondary">
                  <span>
                    <span className="font-semibold text-synvora-text">{selectedOrders.size}</span>
                    {" of "}
                    <span className="font-semibold text-synvora-text">{orders.length}</span>
                    {" orders selected"}
                  </span>
                  {selectedOrders.size > 0 && (
                    <>
                      <div className="h-4 w-px bg-slate-300" />
                      <span><span className="text-xs uppercase tracking-wide">EGP:</span> <span className="font-semibold text-synvora-text">{formatEGP(totalEGP)}</span></span>
                      <div className="h-4 w-px bg-slate-300" />
                      <span><span className="text-xs uppercase tracking-wide">Revenue:</span> <span className="font-semibold text-synvora-text">{totalUSD > 0 ? formatCurrency(totalUSD) : "—"}</span></span>
                      <div className="h-4 w-px bg-slate-300" />
                      <span><span className="text-xs uppercase tracking-wide">Payout:</span> <span className="font-semibold text-emerald-700">{totalAED > 0 ? formatCurrency(totalAED, "AED") : "—"}</span></span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={importing}
                    className="rounded-lg border border-synvora-border px-4 py-2 text-sm font-semibold text-synvora-text-secondary transition hover:bg-slate-50 hover:text-synvora-text"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={importing || selectedOrders.size === 0 || !!importResult}
                    className="inline-flex items-center gap-2 rounded-lg bg-synvora-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-synvora-primary/90 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {importing ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />Importing...</>
                    ) : (
                      `Import ${selectedOrders.size} Order${selectedOrders.size !== 1 ? "s" : ""}`
                    )}
                  </button>
                </div>
              </div>

            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
