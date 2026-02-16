"use client";

import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, ChevronDown, ChevronRight, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { formatEGP } from "@/lib/product-pricing";

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

    const ordersToImport = orders.filter((order) =>
      selectedOrders.has(order.externalId)
    );

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
        alert(`Error: ${error.message}`);
        setImporting(false);
        return;
      }

      const result = await response.json();
      setImportResult(result);

      // Wait 2 seconds to show the success message, then close
      setTimeout(() => {
        onImportComplete();
      }, 2000);
    } catch (error) {
      console.error("Import error:", error);
      alert("Failed to import orders. Please try again.");
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
                    <thead className="sticky top-0 bg-white border-b-2 border-synvora-border">
                      <tr className="text-left text-xs font-semibold text-synvora-text-secondary uppercase tracking-wider">
                        <th className="pb-3 pr-4">
                          <input
                            type="checkbox"
                            checked={selectedOrders.size === orders.length}
                            onChange={toggleAll}
                            className="rounded border-synvora-border text-synvora-primary focus:ring-synvora-primary"
                            disabled={importing}
                          />
                        </th>
                        <th className="pb-3 pr-4">Order #</th>
                        {isMultiStore && <th className="pb-3 pr-4">Store</th>}
                        <th className="pb-3 pr-4">Customer</th>
                        <th className="pb-3 pr-4">Date</th>
                        <th className="pb-3 pr-4">Location</th>
                        <th className="pb-3 pr-4 text-right">EGP Amount</th>
                        <th className="pb-3 pr-4 text-right">USD Amount</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-synvora-border">
                      {orders.map((order) => {
                        const isExpanded = expandedOrders.has(order.externalId);
                        const isSelected = selectedOrders.has(order.externalId);

                        return (
                          <Fragment key={order.externalId}>
                            <tr
                              className={`text-sm ${isSelected ? "bg-synvora-primary/5" : "hover:bg-synvora-surface-active"
                                } transition`}
                            >
                              <td className="py-3 pr-4">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleOrder(order.externalId)}
                                  className="rounded border-synvora-border text-synvora-primary focus:ring-synvora-primary"
                                  disabled={importing}
                                />
                              </td>
                              <td className="py-3 pr-4 font-medium text-synvora-text">
                                {order.orderNumber}
                              </td>
                              {isMultiStore && (
                                <td className="py-3 pr-4 text-xs font-medium text-slate-500">
                                  {order.storeName}
                                </td>
                              )}
                              <td className="py-3 pr-4 text-synvora-text">
                                {order.customerName}
                              </td>
                              <td className="py-3 pr-4 text-synvora-text-secondary">
                                {formatDate(order.processedAt)}
                              </td>
                              <td className="py-3 pr-4 text-synvora-text-secondary">
                                {[order.shippingCity, order.shippingCountry]
                                  .filter(Boolean)
                                  .join(", ") || "-"}
                              </td>
                              <td className="py-3 pr-4 text-right font-medium text-synvora-text">
                                {order.originalAmount
                                  ? `${formatEGP(order.originalAmount)} EGP`
                                  : "-"}
                              </td>
                              <td className="py-3 pr-4 text-right font-medium text-synvora-text">
                                {formatCurrency(order.totalAmount, order.currency)}
                              </td>
                              <td className="py-3 pr-4">
                                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-synvora-text">
                                  {order.financialStatus || order.status}
                                </span>
                              </td>
                              <td className="py-3">
                                <button
                                  onClick={() => toggleExpand(order.externalId)}
                                  className="text-slate-400 hover:text-synvora-text-secondary transition"
                                  disabled={importing}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </button>
                              </td>
                            </tr>

                            {/* Expanded Row - Line Items */}
                            {isExpanded && (
                              <tr>
                                <td colSpan={isMultiStore ? 10 : 9} className="py-3 px-4 bg-synvora-surface-active">
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold text-synvora-text-secondary uppercase">
                                      Line Items
                                    </p>
                                    <div className="bg-white rounded-lg border border-synvora-border overflow-hidden">
                                      <table className="w-full text-sm">
                                        <thead className="bg-synvora-surface-active">
                                          <tr className="text-left text-xs text-synvora-text-secondary">
                                            <th className="px-3 py-2">Product</th>
                                            <th className="px-3 py-2">SKU</th>
                                            <th className="px-3 py-2 text-center">Quantity</th>
                                            <th className="px-3 py-2 text-right">Price</th>
                                            <th className="px-3 py-2 text-right">Total</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-synvora-border">
                                          {order.lineItems.map((item, idx) => (
                                            <tr key={idx}>
                                              <td className="px-3 py-2 text-synvora-text">
                                                {item.productName}
                                              </td>
                                              <td className="px-3 py-2 text-synvora-text-secondary">
                                                {item.sku || "-"}
                                              </td>
                                              <td className="px-3 py-2 text-center text-synvora-text">
                                                {item.quantity}
                                              </td>
                                              <td className="px-3 py-2 text-right text-synvora-text">
                                                {formatCurrency(item.price, order.currency)}
                                              </td>
                                              <td className="px-3 py-2 text-right font-medium text-synvora-text">
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
                            )}
                          </Fragment>
                        );
                      })}
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
