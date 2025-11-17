"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus, Store, Trash2, Edit2 } from "lucide-react";
import { StoreDialog } from "@/components/shopify/store-dialog";

type ShopifyStore = {
  id: number;
  storeDomain: string;
  nickname: string | null;
  venue: {
    id: number;
    name: string;
  };
  createdAt: string;
  _count: {
    orders: number;
  };
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ShopifyStoresPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<ShopifyStore | null>(null);

  const { data, error, isLoading, mutate } = useSWR<{ stores: ShopifyStore[] }>(
    "/api/shopify-stores",
    fetcher
  );

  const handleDelete = async (store: ShopifyStore) => {
    if (store._count.orders > 0) {
      alert(
        `Cannot delete store with ${store._count.orders} orders. Please delete or reassign orders first.`
      );
      return;
    }

    if (!confirm(`Are you sure you want to delete "${store.nickname || store.storeDomain}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/shopify-stores/${store.id}`, {
        method: "DELETE"
      });

      if (response.ok) {
        mutate();
      } else {
        const data = await response.json();
        alert(data.message || "Failed to delete store");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete store");
    }
  };

  const handleEdit = (store: ShopifyStore) => {
    setEditingStore(store);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingStore(null);
    mutate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Shopify Stores</h1>
          <p className="mt-2 text-sm text-slate-600">
            Manage connected Shopify stores for order synchronization
          </p>
        </div>
        <button
          onClick={() => {
            setEditingStore(null);
            setDialogOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-synvora-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-synvora-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Store
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-sm text-slate-500">Loading stores...</div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-600">Failed to load stores. Please try again.</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && data?.stores.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-slate-200 p-12 text-center">
          <Store className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-4 text-lg font-semibold text-slate-900">No stores connected</h3>
          <p className="mt-2 text-sm text-slate-600">
            Get started by connecting your first Shopify store
          </p>
          <button
            onClick={() => setDialogOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-synvora-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-synvora-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Store
          </button>
        </div>
      )}

      {/* Stores table */}
      {!isLoading && !error && data && data.stores.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Store
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Venue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Added
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {data.stores.map((store) => (
                <tr key={store.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {store.nickname || store.storeDomain}
                      </div>
                      {store.nickname && (
                        <div className="text-sm text-slate-500">{store.storeDomain}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-900">{store.venue.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-900">{store._count.orders}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-500">
                      {new Date(store.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(store)}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 transition"
                      >
                        <Edit2 className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(store)}
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

      {/* Dialog */}
      <StoreDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        store={editingStore}
      />
    </div>
  );
}
