"use client";

import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { CloudDownload, X } from "lucide-react";
import useSWR from "swr";
import { OrderReviewDialog } from "@/components/shopify/order-review-dialog";

type SyncShopifyDialogProps = {
  open: boolean;
  onClose: () => void;
  onSyncComplete: () => void;
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

type TransformedOrder = {
  externalId: string;
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

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function SyncShopifyDialog({ open, onClose, onSyncComplete }: SyncShopifyDialogProps) {
  const [formState, setFormState] = useState({
    storeId: "",
    startDate: "",
    endDate: "",
    message: "",
    status: "idle" as "idle" | "loading" | "success" | "error"
  });

  const [fetchedOrders, setFetchedOrders] = useState<TransformedOrder[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(48.5);
  const [selectedStore, setSelectedStore] = useState<ShopifyStore | null>(null);
  const [showReview, setShowReview] = useState(false);

  const { data: storesData, error: storesError } = useSWR<{ stores: ShopifyStore[] }>(
    open ? "/api/shopify-stores" : null,
    fetcher
  );

  // Set default dates (last 30 days)
  const getDefaultDates = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    return {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0]
    };
  };

  // Initialize dates when dialog opens
  if (open && !formState.startDate && !formState.endDate) {
    const defaults = getDefaultDates();
    setFormState((current) => ({
      ...current,
      startDate: defaults.start,
      endDate: defaults.end
    }));
  }

  const close = () => {
    setFormState({
      storeId: "",
      startDate: "",
      endDate: "",
      message: "",
      status: "idle"
    });
    setFetchedOrders([]);
    setSelectedStore(null);
    setShowReview(false);
    onClose();
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormState((current) => ({ ...current, status: "loading", message: "" }));

    const [startYear, startMonth, startDay] = formState.startDate.split("-").map(Number);
    const startDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);

    const [endYear, endMonth, endDay] = formState.endDate.split("-").map(Number);
    const endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);

    const response = await fetch("/api/shopify/fetch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        storeId: parseInt(formState.storeId, 10),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Failed to fetch orders" }));
      setFormState((current) => ({
        ...current,
        status: "error",
        message: error.message ?? "Failed to fetch orders from Shopify"
      }));
      return;
    }

    const payload = await response.json();

    // Check if all orders are already imported
    if (payload.totalFetched > 0 && payload.count === 0) {
      setFormState((current) => ({
        ...current,
        status: "error",
        message: `All ${payload.totalFetched} order(s) from the selected date range have already been imported`
      }));
      return;
    }

    // Check if no orders found at all
    if (payload.totalFetched === 0) {
      setFormState((current) => ({
        ...current,
        status: "error",
        message: "No orders found for the selected date range"
      }));
      return;
    }

    // Store the fetched orders and show review dialog
    setFetchedOrders(payload.orders);
    setExchangeRate(payload.exchangeRate);
    setSelectedStore(payload.store);
    setShowReview(true);

    // Show success message with info about filtered orders
    const message = payload.alreadyImported > 0
      ? `Found ${payload.count} new order(s) to import${payload.alreadyImported > 0 ? ` (${payload.alreadyImported} already imported)` : ""}`
      : `Found ${payload.count} order(s) to import`;

    setFormState((current) => ({
      ...current,
      status: "success",
      message
    }));
  };

  const handleReviewClose = () => {
    setShowReview(false);
    close();
  };

  const handleImportComplete = () => {
    setShowReview(false);
    close();
    onSyncComplete();
  };

  return (
    <>
      <Transition show={open && !showReview} as={Fragment}>
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
              <Dialog.Panel className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-synvora-border px-6 py-4">
                  <div>
                    <Dialog.Title className="text-lg font-semibold text-synvora-text">
                      Sync Shopify Orders
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-synvora-text-secondary">
                      Select a store and date range to fetch orders for review
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

                <form onSubmit={onSubmit} className="px-6 py-6">
                  {storesError ? (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                      <p className="text-sm font-semibold text-red-800">Failed to load stores</p>
                      <p className="mt-1 text-xs text-red-600">
                        Please ensure the database migration has been run. Close this dialog and check
                        the Shopify Stores page for details.
                      </p>
                    </div>
                  ) : storesData?.stores.length === 0 ? (
                    <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
                      <p className="text-sm text-yellow-800">
                        No Shopify stores connected.{" "}
                        <a
                          href="/admin/settings/shopify-stores"
                          className="font-semibold underline hover:text-yellow-900"
                        >
                          Add a store first
                        </a>
                      </p>
                    </div>
                  ) : (
                    <>
                      <label className="flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
                        Shopify Store <span className="text-red-500">*</span>
                        <select
                          value={formState.storeId}
                          onChange={(event) =>
                            setFormState((current) => ({ ...current, storeId: event.target.value }))
                          }
                          className="rounded-lg border border-synvora-border px-3 py-2 text-sm text-synvora-text shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                          required
                        >
                          <option value="">Select a store</option>
                          {storesData?.stores.map((store) => (
                            <option key={store.id} value={store.id}>
                              {store.nickname || store.storeDomain} ({store.venue.name})
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="mt-4 flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
                        Start Date <span className="text-red-500">*</span>
                        <input
                          type="date"
                          value={formState.startDate}
                          onChange={(event) =>
                            setFormState((current) => ({ ...current, startDate: event.target.value }))
                          }
                          className="rounded-lg border border-synvora-border px-3 py-2 text-sm text-synvora-text shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                          required
                        />
                      </label>

                      <label className="mt-4 flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
                        End Date <span className="text-red-500">*</span>
                        <input
                          type="date"
                          value={formState.endDate}
                          onChange={(event) =>
                            setFormState((current) => ({ ...current, endDate: event.target.value }))
                          }
                          className="rounded-lg border border-synvora-border px-3 py-2 text-sm text-synvora-text shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                          required
                        />
                      </label>
                    </>
                  )}

                  {formState.message && (
                    <p
                      className={
                        formState.status === "success"
                          ? "mt-4 rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-600"
                          : "mt-4 rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-600"
                      }
                    >
                      {formState.message}
                    </p>
                  )}

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
                      disabled={formState.status === "loading" || storesData?.stores.length === 0}
                      className="inline-flex items-center gap-2 rounded-lg bg-synvora-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-synvora-primary/90 disabled:cursor-not-allowed disabled:bg-synvora-surface-disabled disabled:text-synvora-text-secondary"
                    >
                      <CloudDownload className="h-4 w-4" />
                      {formState.status === "loading" ? "Fetching..." : "Fetch Orders"}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>

      {/* Order Review Dialog */}
      {showReview && (
        <OrderReviewDialog
          open={showReview}
          onClose={handleReviewClose}
          orders={fetchedOrders}
          exchangeRate={exchangeRate}
          store={selectedStore}
          onImportComplete={handleImportComplete}
        />
      )}
    </>
  );
}
