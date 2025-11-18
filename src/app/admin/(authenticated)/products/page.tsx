"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus, Package, Trash2, Edit2, RefreshCw } from "lucide-react";
import { ProductDialog } from "@/components/products/product-dialog";
import { ShopifySyncDialog } from "@/components/products/shopify-sync-dialog";

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
  createdAt: string;
};

const fetcher = async (url: string) => {
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    const error: any = new Error(data.message || "Failed to fetch");
    error.status = response.status;
    error.info = data;
    throw error;
  }

  return data;
};

export default function ProductsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const { data, error, isLoading, mutate } = useSWR<{ products: Product[] }>(
    "/api/products",
    fetcher
  );

  const handleDelete = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete "${product.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "DELETE"
      });

      if (response.ok) {
        mutate();
      } else {
        const data = await response.json();
        alert(data.message || "Failed to delete product");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete product");
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingProduct(null);
    mutate();
  };

  const handleSyncDialogClose = () => {
    setSyncDialogOpen(false);
    mutate();
  };

  const formatEGP = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Products</h1>
          <p className="mt-2 text-sm text-slate-600">
            Manage product catalog with SKU mapping and EGP pricing for order synchronization
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSyncDialogOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Sync from Shopify
          </button>
          <button
            onClick={() => {
              setEditingProduct(null);
              setDialogOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-synvora-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-synvora-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-sm text-slate-500">Loading products...</div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-6">
          <h3 className="text-sm font-semibold text-red-800">
            {(error as any)?.info?.message || "Failed to load products"}
          </h3>
          <p className="mt-2 text-sm text-red-600">Please try again or contact support.</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && data?.products.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-slate-200 p-12 text-center">
          <Package className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-4 text-lg font-semibold text-slate-900">No products yet</h3>
          <p className="mt-2 text-sm text-slate-600">
            Get started by adding your first product with SKU and EGP pricing
          </p>
          <button
            onClick={() => setDialogOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-synvora-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-synvora-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        </div>
      )}

      {/* Products table */}
      {!isLoading && !error && data && data.products.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Shopify ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  EGP Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Venue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {data.products.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-900">
                      {product.name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-600">
                      {product.sku || "-"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-600 font-mono">
                      {product.shopifyProductId || "-"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-slate-900">
                      EGP {formatEGP(product.egpPrice)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-900">{product.venue.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        product.active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {product.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 transition"
                      >
                        <Edit2 className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(product)}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialogs */}
      <ProductDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        product={editingProduct}
      />
      <ShopifySyncDialog open={syncDialogOpen} onClose={handleSyncDialogClose} />
    </div>
  );
}
