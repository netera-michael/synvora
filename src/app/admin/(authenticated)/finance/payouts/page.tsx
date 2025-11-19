"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { Plus, RefreshCw, CloudDownload } from "lucide-react";
import type { PayoutDto } from "@/types/payouts";
import { SyncMercuryDialog } from "@/components/mercury/sync-mercury-dialog";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type PayoutsResponse = {
  payouts: PayoutDto[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
};

type VenuesResponse = {
  venues: Array<{ id: number; name: string; slug: string }>;
};

export default function PayoutsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user.role === "ADMIN";
  const { data, error, isLoading, mutate } = useSWR<PayoutsResponse>("/api/payouts", fetcher);
  const { data: venuesData, isLoading: venuesLoading } = useSWR<VenuesResponse>(isAdmin ? "/api/venues" : null, fetcher);
  const venues = venuesData?.venues ?? [];
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [editingPayout, setEditingPayout] = useState<PayoutDto | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isSyncMercuryOpen, setIsSyncMercuryOpen] = useState(false);

  const openCreate = () => {
    setEditingPayout(null);
    setDialogOpen(true);
  };

  const openEdit = (payout: PayoutDto) => {
    setEditingPayout(payout);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setEditingPayout(null);
    setDialogOpen(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this payout?")) {
      return;
    }

    await fetch(`/api/payouts/${id}`, { method: "DELETE" });
    mutate();
  };

  const handleSyncMercury = async () => {
    if (!confirm("Sync all unsynced payouts to Mercury.com?")) {
      return;
    }

    setSyncing(true);
    setSyncMessage(null);

    try {
      const response = await fetch("/api/mercury/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncAll: true })
      });

      const data = await response.json();
      if (response.ok) {
        setSyncMessage(`Success: ${data.message}`);
        mutate();
      } else {
        setSyncMessage(`Error: ${data.message}`);
      }
    } catch (error) {
      setSyncMessage("Failed to sync payouts");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Payouts</h1>
          <p className="text-sm text-slate-500">Track USD payouts processed across your venues.</p>
        </div>
        {isAdmin ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSyncMercuryOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-synvora-primary hover:text-synvora-primary"
            >
              <CloudDownload className="h-4 w-4" />
              Sync from Mercury
            </button>
            <button
              type="button"
              onClick={handleSyncMercury}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-synvora-primary hover:text-synvora-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing…" : "Sync to Mercury"}
            </button>
            <button
              type="button"
              onClick={openCreate}
              disabled={venuesLoading || venues.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-synvora-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-synvora-primary/90"
            >
              <Plus className="h-4 w-4" />
              New payout
            </button>
          </div>
        ) : null}
      </header>

      {syncMessage && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${
          syncMessage.startsWith("Success")
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-rose-200 bg-rose-50 text-rose-700"
        }`}>
          {syncMessage}
        </div>
      )}

      {error ? (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-6 py-10 text-center text-rose-600">
          We couldn&apos;t load payouts right now. Try again later.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Account</th>
                <th className="px-6 py-3">Venue</th>
                <th className="px-6 py-3 text-right">Amount</th>
                {isAdmin ? (
                  <>
                    <th className="px-6 py-3">Mercury</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 6} className="px-6 py-6 text-center text-slate-500">
                    Loading payouts…
                  </td>
                </tr>
              ) : data && data.payouts.length ? (
                data.payouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-700">{formatDate(payout.processedAt)}</td>
                    <td className="px-6 py-4 text-slate-600">{payout.status}</td>
                    <td className="px-6 py-4 text-slate-700">{payout.description}</td>
                    <td className="px-6 py-4 text-slate-600">{payout.account}</td>
                    <td className="px-6 py-4 text-slate-600">{payout.venue?.name ?? "—"}</td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-900">
                      {formatCurrency(Math.abs(payout.amount), payout.currency)}
                    </td>
                    {isAdmin ? (
                      <>
                        <td className="px-6 py-4 text-sm">
                          {payout.syncedToMercury ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                              Synced
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                              Not synced
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right text-sm">
                        <button
                          type="button"
                          onClick={() => openEdit(payout)}
                          className="mr-2 inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-synvora-primary hover:text-synvora-primary"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(payout.id)}
                          className="inline-flex items-center rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:border-rose-300"
                        >
                          Delete
                        </button>
                      </td>
                      </>
                    ) : null}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isAdmin ? 8 : 6} className="px-6 py-6 text-center text-slate-500">
                    No payouts recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {data ? (
        <PaginationControls pagination={data.pagination} />
      ) : null}

      {isAdmin ? (
        <>
          <PayoutDialog open={isDialogOpen} payout={editingPayout} onClose={closeDialog} onSaved={mutate} venues={venues} />
          <SyncMercuryDialog
            open={isSyncMercuryOpen}
            onClose={() => setIsSyncMercuryOpen(false)}
            onSyncComplete={mutate}
            venues={venues}
          />
        </>
      ) : null}
    </div>
  );
}

type PaginationProps = {
  pagination: PayoutsResponse["pagination"];
};

function PaginationControls({ pagination }: PaginationProps) {
  if (!pagination.totalCount) {
    return null;
  }

  const { page, pageSize, totalCount, totalPages } = pagination;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(start + pageSize - 1, totalCount);

  return (
    <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm md:flex-row">
      <span>
        Showing <span className="font-semibold text-slate-900">{start}</span>–
        <span className="font-semibold text-slate-900">{end}</span> of
        <span className="font-semibold text-slate-900"> {totalCount}</span>
      </span>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Page {page} of {totalPages || 1}
      </span>
    </div>
  );
}

type PayoutDialogProps = {
  open: boolean;
  payout: PayoutDto | null;
  onClose: () => void;
  onSaved: () => void;
  venues: Array<{ id: number; name: string; slug: string }>;
};

function PayoutDialog({ open, payout, onClose, onSaved, venues }: PayoutDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [formState, setFormState] = useState({
    amount: 0,
    currency: "USD",
    status: "Posted",
    description: "Payout",
    account: "Payouts",
    processedAt: new Date().toISOString().slice(0, 10),
    notes: "",
    venueId: venues[0]?.id ?? 0
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    if (payout) {
      setFormState({
        amount: payout.amount,
        currency: payout.currency,
        status: payout.status,
        description: payout.description,
        account: payout.account,
        processedAt: payout.processedAt.slice(0, 10),
        notes: payout.notes ?? "",
        venueId: payout.venueId
      });
    } else {
      setFormState({
        amount: 0,
        currency: "USD",
        status: "Posted",
        description: "Payout",
        account: "Payouts",
        processedAt: new Date().toISOString().slice(0, 10),
        notes: "",
        venueId: venues[0]?.id ?? 0
      });
    }
  }, [open, payout, venues]);

  if (!open) {
    return null;
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormState((state) => ({
      ...state,
      [name]: name === "amount" ? Number(value) : name === "venueId" ? Number(value) : value
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    const payload = {
      ...formState,
      notes: formState.notes?.trim() ? formState.notes.trim() : null,
      processedAt: new Date(formState.processedAt).toISOString()
    };

    const response = await fetch(payout ? `/api/payouts/${payout.id}` : "/api/payouts", {
      method: payout ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    setSubmitting(false);

    if (!response.ok) {
      console.error("Failed to save payout", await response.text());
      return;
    }

    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
          <header className="space-y-1 pb-2">
            <h2 className="text-lg font-semibold text-slate-900">{payout ? "Edit" : "Create"} payout</h2>
            <p className="text-sm text-slate-500">Record USD payouts for finance reconciliation.</p>
          </header>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Amount (USD)
              <input
                name="amount"
                type="number"
                step="0.01"
                value={formState.amount}
                onChange={handleChange}
                required
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Status
              <input
                name="status"
                value={formState.status}
                onChange={handleChange}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Description
              <input
                name="description"
                value={formState.description}
                onChange={handleChange}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Account
              <input
                name="account"
                value={formState.account}
                onChange={handleChange}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Venue
              <select
                name="venueId"
                value={formState.venueId}
                onChange={handleChange}
                required
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
              >
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Processed on
              <input
                name="processedAt"
                type="date"
                value={formState.processedAt}
                onChange={handleChange}
                required
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Notes
            <textarea
              name="notes"
              rows={3}
              value={formState.notes}
              onChange={handleChange}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
            />
          </label>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-synvora-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-synvora-primary/90 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {submitting ? "Saving…" : "Save payout"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
