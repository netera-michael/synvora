"use client";

import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, ChevronDown, ChevronRight, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { formatEGP } from "@/lib/product-pricing";
import { toast } from "sonner";

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
  exchangeRate: number;
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
  venue: {
    id: number;
    name: string;
  };
};

type OrderReviewDialogProps = {
  open: boolean;
  onClose: () => void;
  orders: TransformedOrder[];
  exchangeRate: number;
  store: ShopifyStore | null;
  onImportComplete: () => void;
};

export function OrderReviewDialog({
  open,
  onClose,
  orders,
  exchangeRate,
  store,
  onImportComplete
}: OrderReviewDialogProps) {
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(
    new Set(orders.map((o) => o.externalId))
  );
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  const isMultiStore = orders.some(o => o.shopifyStoreId && o.shopifyStoreId !== orders[0]?.shopifyStoreId);
  const [importResult, setImportResult] = useState<{
    imported: number;
    updated: number;
    skipped: number;
  } | null>(null);

  const [aedToUsdRate, setAedToUsdRate] = useState<number | null>(null);
  const [aedOverrides, setAedOverrides] = useState<Record<string, number>>({});

  // Fetch live AED/USD rate
  const fetchAedRate = async () => {
    try {
      const res = await fetch("/api/exchange-rate?from=AED&to=USD", {
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setAedToUsdRate(data.rate);
      }
    } catch (error) {
      console.error("Failed to fetch AED rate:", error);
    }
  };

  useState(() => {
    fetchAedRate();
  });

  const toggleOrder = (externalId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(externalId)) {
      newSelected.delete(externalId);
    } else {
      newSelected.add(externalId);
    }
    setSelectedOrders(newSelected);
  };

  const toggleAll = () => {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(orders.map((o) => o.externalId)));
    }
  };

  const toggleExpand = (externalId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(externalId)) {
      newExpanded.delete(externalId);
    } else {
      newExpanded.add(externalId);
    }
    setExpandedOrders(newExpanded);
  };

  const handleImport = async () => {
    if (selectedOrders.size === 0) return;

    setImporting(true);
    setImportResult(null);

    const ordersToImport = orders
      .filter((order) => selectedOrders.has(order.externalId))
      .map((order) => {
        const date = new Date(order.processedAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric"
        });

        const aedOverride = aedOverrides[date];
        if (aedOverride && aedToUsdRate) {
          const group = orders.filter(
            (o) =>
              selectedOrders.has(o.externalId) &&
              new Date(o.processedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric"
              }) === date
          );

          const groupTotalEGP = group.reduce((sum, o) => sum + (o.originalAmount || 0), 0);
          const baseUSDFromAED = aedOverride * aedToUsdRate;
          const totalUSDFromAED = baseUSDFromAED * 1.035;

          // Proportional distribution
          const weight = groupTotalEGP > 0 ? (order.originalAmount || 0) / groupTotalEGP : 1 / group.length;
          const adjustedTotalUSD = totalUSDFromAED * weight;

          // Derived exchange rate (TotalEGP / baseUSD)
          const derivedRate = groupTotalEGP > 0 && baseUSDFromAED > 0 ? groupTotalEGP / baseUSDFromAED : order.exchangeRate;

          return {
            ...order,
            totalAmount: adjustedTotalUSD,
            exchangeRate: derivedRate
          };
        }
        return order;
      });

    try {
      const response = await fetch("/api/shopify/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          storeId: store?.id || null,
          orders: ordersToImport
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to import orders" }));
        console.error("Import failed:", error);

        let errorMessage = error.message;
        if (error.issues) {
          console.error("Validation issues:", error.issues);
          errorMessage = "Validation failed. Check console for details.";
        }

        toast.error(`Error: ${errorMessage}`);
        setImporting(false);
        return;
      }

      const result = await response.json();
      setImportResult(result);
      toast.success(`Imported ${result.imported} orders successfully!`);

      // Wait 2 seconds to show the success message, then close
      setTimeout(() => {
        onImportComplete();
      }, 2000);
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import orders. Please try again.");
      setImporting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency
    }).format(amount);
  };

  // Calculate totals for selected orders
  const selectedOrdersData = orders.filter((order) =>
    selectedOrders.has(order.externalId)
  );

  const totalEGP = selectedOrdersData.reduce((sum, order) => {
    return sum + (order.originalAmount || 0);
  }, 0);

  const totalUSD = selectedOrdersData.reduce((sum, order) => {
    return sum + order.totalAmount;
  }, 0);

  const hasMissingPricing = orders.some((o) => o.originalAmount === null);

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
            <Dialog.Panel className="w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-synvora-border px-6 py-4">
                <div>
                  <Dialog.Title className="text-lg font-semibold text-synvora-text">
                    Review Orders for Import
                  </Dialog.Title>
                  <Dialog.Description className="text-sm text-synvora-text-secondary">
                    {store && (
                      <>
                        Store: <span className="font-medium">{store.nickname || store.storeDomain}</span>
                        {" • "}
                        Venue: <span className="font-medium">{store.venue.name}</span>
                        {" • "}
                        Exchange Rate: <span className="font-medium">{exchangeRate.toFixed(2)} EGP/USD</span>
                      </>
                    )}
                  </Dialog.Description>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-synvora-border text-synvora-text-secondary transition hover:border-synvora-border"
                  disabled={importing}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Warning for Missing Pricing */}
              {hasMissingPricing && !importResult && (
                <div className="mx-6 mt-4 rounded-xl bg-amber-50 border border-amber-200 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <p className="font-semibold">Missing Pricing Information</p>
                      <p className="mt-1">
                        Some orders are showing &quot;-&quot; for amounts because the products haven&apos;t been synced to the database yet.
                        <br />
                        Please <strong>close this dialog</strong> and click <strong>&quot;Sync Products&quot;</strong> for this store to fix pricing.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {importResult && (
                <div className="mx-6 mt-4 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <div className="text-sm text-emerald-800">
                      <p className="font-semibold">Import completed successfully!</p>
                      <p>
                        Imported: {importResult.imported} • Updated: {importResult.updated} • Skipped: {importResult.skipped}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Orders Table */}
              <div className="overflow-auto max-h-[calc(90vh-220px)] px-6 py-4">
                {orders.length === 0 ? (
                  <div className="text-center py-12 text-synvora-text-secondary">
                    No orders found for the selected date range
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="sticky top-0 z-10 bg-white border-b border-synvora-border">
                      <tr className="text-left text-xs font-semibold text-synvora-text-secondary uppercase tracking-wide">
                        <th className="px-6 py-4 w-12">
                          <input
                            type="checkbox"
                            checked={selectedOrders.size === orders.length}
                            onChange={toggleAll}
                            className="rounded border-synvora-border text-synvora-primary focus:ring-synvora-primary"
                            disabled={importing}
                          />
                        </th>
                        <th className="px-6 py-4">Order #</th>
                        {isMultiStore && <th className="px-6 py-4">Store</th>}
                        <th className="px-6 py-4">Customer</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Location</th>
                        <th className="px-6 py-4 text-right">EGP Amount</th>
                        <th className="px-6 py-4 text-right">USD Amount</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-synvora-border">
                      {(() => {
                        // Sort orders by date descending
                        const sortedOrders = [...orders].sort(
                          (a, b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime()
                        );

                        // Group orders by day
                        const groups: { date: string; orders: typeof orders }[] = [];
                        sortedOrders.forEach((order) => {
                          const date = new Date(order.processedAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                          });
                          const lastGroup = groups[groups.length - 1];
                          if (lastGroup && lastGroup.date === date) {
                            lastGroup.orders.push(order);
                          } else {
                            groups.push({ date, orders: [order] });
                          }
                        });

                        return groups.flatMap((group, groupIdx) => {
                          const dailyEGP = group.orders
                            .filter(o => selectedOrders.has(o.externalId))
                            .reduce((sum, o) => sum + (o.originalAmount || 0), 0);
                          const dailyUSD = group.orders
                            .filter(o => selectedOrders.has(o.externalId))
                            .reduce((sum, o) => sum + o.totalAmount, 0);

                          const rows = group.orders.flatMap((order) => {
                            const isExpanded = expandedOrders.has(order.externalId);
                            const isSelected = selectedOrders.has(order.externalId);

                            return [
                              <tr
                                key={order.externalId}
                                className={`text-sm font-medium transition ${isSelected ? "bg-synvora-primary/5" : "hover:bg-synvora-surface-active/80"
                                  }`}
                              >
                                <td className="px-6 py-4">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleOrder(order.externalId)}
                                    className="rounded border-synvora-border text-synvora-primary focus:ring-synvora-primary"
                                    disabled={importing}
                                  />
                                </td>
                                <td className="px-6 py-4 text-synvora-text">
                                  {order.orderNumber}
                                </td>
                                {isMultiStore && (
                                  <td className="px-6 py-4 text-synvora-text-secondary">
                                    {order.storeName}
                                  </td>
                                )}
                                <td className="px-6 py-4 text-synvora-text">
                                  {order.customerName}
                                </td>
                                <td className="px-6 py-4 text-synvora-text-secondary">
                                  {formatDate(order.processedAt)}
                                </td>
                                <td className="px-6 py-4 text-synvora-text-secondary">
                                  {[order.shippingCity, order.shippingCountry]
                                    .filter(Boolean)
                                    .join(", ") || "-"}
                                </td>
                                <td className="px-6 py-4 text-right font-medium text-synvora-text">
                                  {order.originalAmount
                                    ? `${formatEGP(order.originalAmount)} EGP`
                                    : "-"}
                                </td>
                                <td className="px-6 py-4 text-right font-medium text-synvora-text">
                                  {formatCurrency(order.totalAmount, order.currency)}
                                </td>
                                <td className="px-6 py-4">
                                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-synvora-text">
                                    {order.financialStatus || order.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <button
                                    onClick={() => toggleExpand(order.externalId)}
                                    className="text-slate-400 hover:text-synvora-text-secondary transition p-1 rounded-md hover:bg-slate-100"
                                    disabled={importing}
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </button>
                                </td>
                              </tr>,

                              /* Expanded Row - Line Items */
                              isExpanded && (
                                <tr key={`${order.externalId}-expanded`}>
                                  <td colSpan={isMultiStore ? 10 : 9} className="px-6 py-4 bg-synvora-surface-active/30">
                                    <div className="space-y-3">
                                      <p className="text-[10px] font-bold text-synvora-text-secondary uppercase tracking-wider">
                                        Line Items
                                      </p>
                                      <div className="bg-white rounded-xl border border-synvora-border overflow-hidden shadow-sm">
                                        <table className="w-full text-sm">
                                          <thead className="bg-synvora-surface-active/50 border-b border-synvora-border">
                                            <tr className="text-left text-[10px] font-bold text-synvora-text-secondary uppercase tracking-wider">
                                              <th className="px-4 py-2.5">Product</th>
                                              <th className="px-4 py-2.5">SKU</th>
                                              <th className="px-4 py-2.5 text-center">Qty</th>
                                              <th className="px-4 py-2.5 text-right">Price</th>
                                              <th className="px-4 py-2.5 text-right">Total</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-synvora-border">
                                            {order.lineItems.map((item, idx) => (
                                              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-2.5 font-medium text-synvora-text">
                                                  {item.productName}
                                                </td>
                                                <td className="px-4 py-2.5 text-synvora-text-secondary font-mono text-xs">
                                                  {item.sku || "-"}
                                                </td>
                                                <td className="px-4 py-2.5 text-center text-synvora-text font-medium">
                                                  {item.quantity}
                                                </td>
                                                <td className="px-4 py-2.5 text-right text-synvora-text">
                                                  {formatCurrency(item.price, order.currency)}
                                                </td>
                                                <td className="px-4 py-2.5 text-right font-semibold text-synvora-text">
                                                  {formatCurrency(item.total, order.currency)}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>

                                      {/* Additional Info */}
                                      {(order.tags.length > 0 || order.notes) && (
                                        <div className="mt-3 space-y-2">
                                          {order.tags.length > 0 && (
                                            <div>
                                              <p className="text-xs font-semibold text-synvora-text-secondary mb-1">
                                                Tags:
                                              </p>
                                              <div className="flex flex-wrap gap-1">
                                                {order.tags.map((tag, idx) => (
                                                  <span
                                                    key={idx}
                                                    className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs text-synvora-text"
                                                  >
                                                    {tag}
                                                  </span>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                          {order.notes && (
                                            <div>
                                              <p className="text-xs font-semibold text-synvora-text-secondary mb-1">
                                                Notes:
                                              </p>
                                              <p className="text-xs text-synvora-text bg-white rounded border border-synvora-border p-2">
                                                {order.notes}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )
                            ];
                          });

                          const aedOverride = aedOverrides[group.date];
                          const baseUSD = aedOverride && aedToUsdRate ? aedOverride * aedToUsdRate : null;
                          const derivedUSD = aedOverride && aedToUsdRate ? baseUSD! * 1.035 : dailyUSD;
                          const derivedRate = aedOverride && dailyEGP > 0 && baseUSD ? dailyEGP / baseUSD : null;

                          // Add a summary row after each day
                          rows.push(
                            <tr key={`summary-${group.date}`} className="bg-synvora-surface-active/50 font-semibold items-center">
                              <td colSpan={isMultiStore ? 6 : 5} className="py-3 px-6 text-xs font-bold text-synvora-text-secondary uppercase tracking-wide text-right align-middle">
                                {group.date} Totals
                              </td>
                              <td className="py-3 px-6 text-right text-synvora-text align-middle">
                                {formatEGP(dailyEGP)} EGP
                              </td>
                              <td className="py-3 px-6 text-right text-synvora-text align-middle">
                                <div className="flex flex-col items-end gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-synvora-text-secondary">AED Payout:</span>
                                    <input
                                      type="number"
                                      value={aedOverride || ""}
                                      onChange={(e) => {
                                        const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                        setAedOverrides((prev) => {
                                          const next = { ...prev };
                                          if (val === undefined) {
                                            delete next[group.date];
                                          } else {
                                            next[group.date] = val;
                                          }
                                          return next;
                                        });
                                      }}
                                      placeholder="0.00"
                                      className="w-20 rounded border border-synvora-border px-2 py-0.5 text-right text-xs focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                                    />
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <span className={aedOverride ? "text-synvora-primary" : ""}>
                                      {formatCurrency(derivedUSD, "USD")}
                                    </span>
                                    {aedOverride && baseUSD && (
                                      <span className="text-[10px] text-synvora-text-secondary">
                                        Payout: {formatCurrency(baseUSD, "USD")}
                                      </span>
                                    )}
                                  </div>
                                  {derivedRate && (
                                    <span className="text-[10px] text-synvora-primary font-bold">
                                      Rate: {derivedRate.toFixed(2)} EGP/USD
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td colSpan={2} className="px-6 py-3"></td>
                            </tr>
                          );

                          return rows;
                        });
                      })()}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-synvora-border px-6 py-4 bg-synvora-surface-active">
                <div className="flex items-center gap-6 text-sm text-synvora-text-secondary">
                  <div>
                    <span className="font-semibold text-synvora-text">{selectedOrders.size}</span> of{" "}
                    <span className="font-semibold text-synvora-text">{orders.length}</span> orders selected
                  </div>
                  {selectedOrders.size > 0 && (
                    <>
                      <div className="h-4 w-px bg-slate-300" />
                      <div>
                        <span className="text-xs uppercase tracking-wide text-synvora-text-secondary">Total EGP:</span>{" "}
                        <span className="font-semibold text-synvora-text">{formatEGP(totalEGP)} EGP</span>
                      </div>
                      <div className="h-4 w-px bg-slate-300" />
                      <div>
                        <span className="text-xs uppercase tracking-wide text-synvora-text-secondary">Total USD:</span>{" "}
                        <span className="font-semibold text-synvora-text">{formatCurrency(totalUSD, "USD")}</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg border border-synvora-border px-4 py-2 text-sm font-semibold text-synvora-text-secondary transition hover:bg-slate-50 hover:text-synvora-text"
                    disabled={importing}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={importing || selectedOrders.size === 0 || importResult !== null}
                    className="inline-flex items-center gap-2 rounded-lg bg-synvora-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-synvora-primary/90 focus:outline-none focus:ring-2 focus:ring-synvora-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      `Import Selected (${selectedOrders.size})`
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
