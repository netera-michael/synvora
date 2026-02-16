"use client";

import { useState } from "react";
import useSWR from "swr";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Loader2, CheckCircle2, XCircle, Filter, CloudDownload } from "lucide-react";
import { toast } from "sonner";
import { SyncShopifyDialog } from "@/components/orders/sync-shopify-dialog";

export default function PendingImportsPage() {
    const [amountFilter, setAmountFilter] = useState("");
    const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSyncOpen, setIsSyncOpen] = useState(false);

    // Fetch pending orders with filters
    const { data, error, mutate } = useSWR(
        `/api/shopify/pending?amount=${amountFilter}`,
        async (url) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch pending orders");
            return res.json();
        }
    );

    const pendingOrders = data?.orders || [];
    const isLoading = !data && !error;

    const toggleSelectAll = () => {
        if (selectedOrders.size === pendingOrders.length) {
            setSelectedOrders(new Set());
        } else {
            setSelectedOrders(new Set(pendingOrders.map((o: any) => o.id)));
        }
    };

    const toggleSelect = (id: number) => {
        const newSelected = new Set(selectedOrders);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedOrders(newSelected);
    };

    const handleImport = async () => {
        if (selectedOrders.size === 0) return;
        setIsProcessing(true);
        try {
            const res = await fetch("/api/shopify/pending", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orderIds: Array.from(selectedOrders),
                    // TODO: Add venue selector mechanism or default venue
                    venueId: 1,
                }),
            });

            if (!res.ok) throw new Error("Import failed");

            const result = await res.json();
            toast.success(result.message);
            setSelectedOrders(new Set());
            mutate(); // Refresh list
        } catch (err) {
            toast.error("Failed to import orders");
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleIgnore = async () => {
        if (selectedOrders.size === 0) return;
        if (!confirm("Are you sure you want to ignore/delete these orders?")) return;

        setIsProcessing(true);
        try {
            const res = await fetch("/api/shopify/pending", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderIds: Array.from(selectedOrders) }),
            });

            if (!res.ok) throw new Error("Delete failed");

            toast.success("Orders removed from queue");
            setSelectedOrders(new Set());
            mutate();
        } catch (err) {
            toast.error("Failed to delete orders");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-synvora-text">Pending Imports</h1>
                    <p className="text-sm text-synvora-text-secondary">
                        Review and approve orders from Shopify before importing.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsSyncOpen(true)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-synvora-border bg-white px-4 py-2 text-sm font-medium text-synvora-text hover:bg-synvora-surface-hover"
                    >
                        <CloudDownload className="h-4 w-4" />
                        Fetch from Shopify
                    </button>
                    <button
                        onClick={handleIgnore}
                        disabled={selectedOrders.size === 0 || isProcessing}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                    >
                        <XCircle className="h-4 w-4" />
                        Ignore Selected
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={selectedOrders.size === 0 || isProcessing}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-synvora-primary px-4 py-2 text-sm font-medium text-white hover:bg-synvora-primary/90 disabled:opacity-50"
                    >
                        {isProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <CheckCircle2 className="h-4 w-4" />
                        )}
                        Import Selected ({selectedOrders.size})
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 rounded-xl border border-synvora-border bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-synvora-text-secondary">
                    <Filter className="h-4 w-4" />
                    <span className="text-sm font-medium">Filter by Amount:</span>
                </div>
                <input
                    type="number"
                    placeholder="e.g. 1000"
                    value={amountFilter}
                    onChange={(e) => setAmountFilter(e.target.value)}
                    className="rounded-lg border border-synvora-border px-3 py-1.5 text-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                />
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-synvora-border bg-white shadow-sm">
                <table className="min-w-full divide-y divide-synvora-border text-sm">
                    <thead className="bg-synvora-surface-active text-left text-xs font-semibold uppercase text-synvora-text-secondary">
                        <tr>
                            <th className="w-12 px-6 py-4">
                                <input
                                    type="checkbox"
                                    checked={pendingOrders.length > 0 && selectedOrders.size === pendingOrders.length}
                                    onChange={toggleSelectAll}
                                    className="rounded border-synvora-border text-synvora-primary focus:ring-synvora-primary"
                                />
                            </th>
                            <th className="px-6 py-4">Order Number</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Amount</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Store</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} className="py-8 text-center text-synvora-text-secondary">
                                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                    <span className="mt-2 block">Loading pending orders...</span>
                                </td>
                            </tr>
                        ) : pendingOrders.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-8 text-center text-synvora-text-secondary">
                                    No pending orders found.
                                </td>
                            </tr>
                        ) : (
                            pendingOrders.map((order: any) => (
                                <tr key={order.id} className="hover:bg-synvora-surface-hover">
                                    <td className="px-6 py-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedOrders.has(order.id)}
                                            onChange={() => toggleSelect(order.id)}
                                            className="rounded border-synvora-border text-synvora-primary focus:ring-synvora-primary"
                                        />
                                    </td>
                                    <td className="px-6 py-4 font-medium text-synvora-text">{order.orderNumber}</td>
                                    <td className="px-6 py-4 text-synvora-text-secondary">
                                        {formatDateTime(order.createdAt)}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-synvora-text">
                                        {formatCurrency(order.totalAmount, order.currency)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                                            {order.financialStatus}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-synvora-text-secondary">{order.storeDomain}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <SyncShopifyDialog
                open={isSyncOpen}
                onClose={() => setIsSyncOpen(false)}
                onSyncComplete={() => {
                    mutate();
                    setIsSyncOpen(false);
                }}
            />
        </div>
    );
}
