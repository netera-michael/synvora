"use client";

import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, RefreshCw, Download, AlertCircle } from "lucide-react";
import useSWR from "swr";

type ShopifyStore = {
  id: number;
  storeDomain: string;
  nickname: string | null;
  venue: {
    id: number;
    name: string;
  };
};

type ShopifyProduct = {
  shopifyProductId: string;
  name: string;
  sku: string | null;
  price: number;
  status: string;
};

type ShopifySyncDialogProps = {
  open: boolean;
  onClose: () => void;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function ShopifySyncDialog({ open, onClose }: ShopifySyncDialogProps) {
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [productPrices, setProductPrices] = useState<Record<string, string>>({});
  const [fetching, setFetching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"select-store" | "set-prices">("select-store");

  const { data: storesData } = useSWR<{ stores: ShopifyStore[] }>(
    open ? "/api/shopify-stores" : null,
    fetcher
  );

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedStoreId(null);
      setProducts([]);
      setProductPrices({});
      setStep("select-store");
      setError(null);
    }
  }, [open]);

  const handleFetchProducts = async () => {
    if (!selectedStoreId) return;

    setFetching(true);
    setError(null);

    try {
      const response = await fetch("/api/shopify/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ storeId: selectedStoreId })
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products);

        // Initialize prices with Shopify prices (in USD, will need conversion)
        const initialPrices: Record<string, string> = {};
        data.products.forEach((p: ShopifyProduct) => {
          // Convert USD to EGP using approximate rate (48.5) as starting point
          initialPrices[p.shopifyProductId] = (p.price * 48.5).toFixed(2);
        });
        setProductPrices(initialPrices);

        setStep("set-prices");
      } else {
        const data = await response.json();
        setError(data.message || "Failed to fetch products");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to fetch products from Shopify");
    } finally {
      setFetching(false);
    }
  };

  const handleImport = async () => {
    if (!selectedStoreId) return;

    setImporting(true);
    setError(null);

    try {
      const productsToImport = products.map((p) => ({
        shopifyProductId: p.shopifyProductId,
        name: p.name,
        sku: p.sku,
        egpPrice: parseFloat(productPrices[p.shopifyProductId] || "0")
      }));

      const response = await fetch("/api/shopify/products/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          storeId: selectedStoreId,
          products: productsToImport
        })
      });

      if (response.ok) {
        const data = await response.json();
        let message = `Successfully imported ${data.created} new products and updated ${data.updated} existing products!`;

        if (data.skipped > 0) {
          message += `\n\n${data.skipped} product(s) were skipped.`;
          if (data.errors && data.errors.length > 0) {
            message += `\n\nReasons:\n- ${data.errors.join("\n- ")}`;
          }
        }

        alert(message);
        onClose();
      } else {
        const data = await response.json();
        setError(data.message || "Failed to import products");
      }
    } catch (err) {
      console.error("Import error:", err);
      setError("Failed to import products");
    } finally {
      setImporting(false);
    }
  };

  const updatePrice = (productId: string, value: string) => {
    setProductPrices((prev) => ({
      ...prev,
      [productId]: value
    }));
  };

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
            <Dialog.Panel className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <Dialog.Title className="text-lg font-semibold text-slate-900">
                  Sync Products from Shopify
                </Dialog.Title>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6">
                {error && (
                  <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {step === "select-store" && (
                  <div className="space-y-4">
                    <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                      Select Shopify Store
                      <select
                        value={selectedStoreId || ""}
                        onChange={(e) => setSelectedStoreId(Number(e.target.value))}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                      >
                        <option value="">Choose a store...</option>
                        {storesData?.stores.map((store) => (
                          <option key={store.id} value={store.id}>
                            {store.nickname || store.storeDomain} ({store.venue.name})
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      onClick={handleFetchProducts}
                      disabled={!selectedStoreId || fetching}
                      className="inline-flex items-center gap-2 rounded-xl bg-synvora-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-synvora-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshCw className={`h-4 w-4 ${fetching ? "animate-spin" : ""}`} />
                      {fetching ? "Fetching Products..." : "Fetch Products"}
                    </button>
                  </div>
                )}

                {step === "set-prices" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-600">
                        Found <strong>{products.length}</strong> products. Set EGP prices for each:
                      </p>
                      <button
                        onClick={() => setStep("select-store")}
                        className="text-sm text-synvora-primary hover:underline"
                      >
                        ← Back to store selection
                      </button>
                    </div>

                    <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-lg">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                              Product
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                              SKU
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                              Shopify Price (USD)
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                              EGP Price
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {products.map((product) => (
                            <tr key={product.shopifyProductId}>
                              <td className="px-4 py-3 text-sm text-slate-900">
                                {product.name}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {product.sku || "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                ${product.price.toFixed(2)}
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={productPrices[product.shopifyProductId] || ""}
                                  onChange={(e) =>
                                    updatePrice(product.shopifyProductId, e.target.value)
                                  }
                                  className="w-32 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-900 focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                                  placeholder="0.00"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                      <button
                        onClick={onClose}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300"
                        disabled={importing}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleImport}
                        disabled={importing}
                        className="inline-flex items-center gap-2 rounded-xl bg-synvora-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-synvora-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Download className={`h-4 w-4 ${importing ? "animate-bounce" : ""}`} />
                        {importing ? "Importing..." : `Import ${products.length} Products`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
