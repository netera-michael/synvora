"use client";

import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X } from "lucide-react";
import useSWR from "swr";

type Product = {
  id: number;
  name: string;
  sku: string | null;
  shopifyProductId: string | null;
  egpPrice: number;
  active: boolean;
  venue: {
    id: number;
    name: string;
  };
};

type Venue = {
  id: number;
  name: string;
  slug: string;
};

type ProductDialogProps = {
  open: boolean;
  onClose: () => void;
  product: Product | null;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function ProductDialog({ open, onClose, product }: ProductDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    shopifyProductId: "",
    egpPrice: "",
    venueId: "",
    active: true
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: venuesData } = useSWR<{ venues: Venue[] }>(
    open ? "/api/venues" : null,
    fetcher
  );

  // Pre-fill form when editing
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        sku: product.sku || "",
        shopifyProductId: product.shopifyProductId || "",
        egpPrice: product.egpPrice.toString(),
        venueId: product.venue.id.toString(),
        active: product.active
      });
    } else {
      // Reset for new product
      setFormData({
        name: "",
        sku: "",
        shopifyProductId: "",
        egpPrice: "",
        venueId: venuesData?.venues[0]?.id.toString() || "",
        active: true
      });
    }
    setError(null);
  }, [product, open, venuesData]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      name: formData.name,
      sku: formData.sku || null,
      shopifyProductId: formData.shopifyProductId || null,
      egpPrice: parseFloat(formData.egpPrice),
      venueId: parseInt(formData.venueId, 10),
      active: formData.active
    };

    try {
      const url = product ? `/api/products/${product.id}` : "/api/products";
      const method = product ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        onClose();
      } else {
        const data = await response.json();
        setError(data.message || "Failed to save product");
      }
    } catch (err) {
      console.error("Save error:", err);
      setError("Failed to save product. Please try again.");
    } finally {
      setSubmitting(false);
    }
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
            <Dialog.Panel className="w-full max-w-md rounded-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <Dialog.Title className="text-lg font-semibold text-slate-900">
                  {product ? "Edit Product" : "Add Product"}
                </Dialog.Title>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="px-6 py-6">
                {error && (
                  <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                    Product Name <span className="text-red-500">*</span>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                      placeholder="e.g., Golden Entry Ticket"
                      required
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                    SKU
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                      placeholder="e.g., GOLDEN-TICKET"
                    />
                    <span className="text-xs text-slate-500">
                      Used to match products from Shopify orders
                    </span>
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                    Shopify Product ID
                    <input
                      type="text"
                      value={formData.shopifyProductId}
                      onChange={(e) =>
                        setFormData({ ...formData, shopifyProductId: e.target.value })
                      }
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 font-mono shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                      placeholder="e.g., gid://shopify/Product/123456"
                    />
                    <span className="text-xs text-slate-500">
                      Optional: Shopify product ID for exact matching
                    </span>
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                    EGP Price <span className="text-red-500">*</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.egpPrice}
                      onChange={(e) => setFormData({ ...formData, egpPrice: e.target.value })}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                      placeholder="e.g., 6000"
                      required
                    />
                    <span className="text-xs text-slate-500">
                      Price in Egyptian Pounds for this product
                    </span>
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                    Venue <span className="text-red-500">*</span>
                    <select
                      value={formData.venueId}
                      onChange={(e) => setFormData({ ...formData, venueId: e.target.value })}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                      required
                      disabled={!!product}
                    >
                      <option value="">Select a venue</option>
                      {venuesData?.venues.map((venue) => (
                        <option key={venue.id} value={venue.id}>
                          {venue.name}
                        </option>
                      ))}
                    </select>
                    {product && (
                      <span className="text-xs text-slate-500">
                        Venue cannot be changed after creation
                      </span>
                    )}
                  </label>

                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="rounded border-slate-300 text-synvora-primary focus:ring-synvora-primary"
                    />
                    Active
                  </label>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-synvora-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-synvora-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? "Saving..." : product ? "Update" : "Create"}
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
