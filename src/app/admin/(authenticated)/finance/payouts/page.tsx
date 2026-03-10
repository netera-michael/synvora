"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { Plus, CloudDownload, TrendingDown, TrendingUp, Wallet, Settings2, Receipt, CreditCard, ChevronLeft, ChevronRight } from "lucide-react";
import type { PayoutDto, VenueBalance } from "@/types/payouts";
import { SyncMercuryDialog } from "@/components/mercury/sync-mercury-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

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

type BalanceResponse = {
  venues: VenueBalance[];
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);

export default function PayoutsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user.role === "ADMIN";
  const [currentPage, setCurrentPage] = useState(1);

  const { data, error, isLoading, mutate } = useSWR<PayoutsResponse>(`/api/payouts?page=${currentPage}`, fetcher);
  const { data: venuesData, isLoading: venuesLoading } = useSWR<VenuesResponse>(
    isAdmin ? "/api/venues" : null,
    fetcher
  );
  const { data: balanceData, mutate: mutateBalance } = useSWR<BalanceResponse>("/api/balance", fetcher);

  const venues = venuesData?.venues ?? [];
  const balances = balanceData?.venues ?? [];

  const [isPayoutOpen, setPayoutOpen] = useState(false);
  const [editingPayout, setEditingPayout] = useState<PayoutDto | null>(null);
  const [isSyncMercuryOpen, setIsSyncMercuryOpen] = useState(false);
  const [isAdjustOpen, setAdjustOpen] = useState(false);
  const [adjustVenue, setAdjustVenue] = useState<VenueBalance | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const openCreate = () => {
    setEditingPayout(null);
    setPayoutOpen(true);
  };

  const openEdit = (payout: PayoutDto) => {
    setEditingPayout(payout);
    setPayoutOpen(true);
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/payouts/${id}`, { method: "DELETE" });
    if (res.ok) {
      mutate();
      mutateBalance();
      toast.success("Payout deleted.");
    } else {
      toast.error("Failed to delete payout.");
    }
    setDeleteConfirmId(null);
  };

  const handleSaved = () => {
    mutate();
    mutateBalance();
  };

  const openAdjust = (venue: VenueBalance) => {
    setAdjustVenue(venue);
    setAdjustOpen(true);
  };

  useEffect(() => {
    const serverPage = data?.pagination.page;
    if (serverPage && serverPage !== currentPage) {
      setCurrentPage(serverPage);
    }
  }, [currentPage, data?.pagination.page]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-synvora-text">Payouts</h1>
          <p className="mt-1 text-sm text-synvora-text-secondary">
            {isAdmin
              ? "Manage payouts and monitor venue balances."
              : "Your pending balance and payout history."}
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSyncMercuryOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-synvora-border bg-white px-4 py-2 text-sm font-medium text-synvora-text-secondary shadow-sm transition hover:border-synvora-primary hover:text-synvora-primary"
            >
              <CloudDownload className="h-4 w-4" />
              Sync Mercury
            </button>
            <button
              type="button"
              onClick={openCreate}
              disabled={venuesLoading || venues.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-synvora-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-synvora-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              New Payout
            </button>
          </div>
        )}
      </div>

      {/* Balance cards */}
      {balances.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-1">
          {balances.map((venue) => (
            <div
              key={venue.id}
              className="rounded-xl border border-synvora-border bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  {isAdmin && (
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-synvora-text-secondary">
                      {venue.name}
                    </p>
                  )}
                  <div className="flex items-baseline gap-2">
                    <Wallet className="h-5 w-5 text-synvora-primary" />
                    <span className="text-sm font-medium text-synvora-text-secondary">Pending Balance</span>
                  </div>
                  <p
                    className={`mt-1 text-3xl font-bold ${
                      venue.pendingBalance >= 0 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {fmt(venue.pendingBalance)}
                  </p>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => openAdjust(venue)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-synvora-border px-3 py-1.5 text-xs font-medium text-synvora-text-secondary transition hover:border-synvora-primary hover:text-synvora-primary"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    Set Adjustment
                  </button>
                )}
              </div>

              <div className="mt-5 grid grid-cols-1 divide-y divide-synvora-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <div className="pb-4 sm:pb-0 sm:pr-4">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-synvora-text-secondary">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                    Total Earned
                  </div>
                  <p className="mt-1 text-lg font-semibold text-synvora-text">
                    {fmt(venue.totalOrdersPayout)}
                  </p>
                  <p className="text-xs text-synvora-text-secondary">From all orders</p>
                </div>
                <div className="py-4 sm:py-0 sm:px-4">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-synvora-text-secondary">
                    <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
                    Total Paid Out
                  </div>
                  <p className="mt-1 text-lg font-semibold text-synvora-text">
                    {fmt(venue.totalPaidOut)}
                  </p>
                  <p className="text-xs text-synvora-text-secondary">Payouts sent</p>
                </div>
                {isAdmin ? (
                  <div className="pt-4 sm:pt-0 sm:pl-4">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-synvora-text-secondary">
                      <Settings2 className="h-3.5 w-3.5 text-blue-400" />
                      Adjustment
                    </div>
                    <p className="mt-1 text-lg font-semibold text-synvora-text">
                      {venue.balanceAdjustment >= 0 ? "+" : ""}{fmt(venue.balanceAdjustment)}
                    </p>
                    <p className="text-xs text-synvora-text-secondary">Manual offset</p>
                  </div>
                ) : (
                  <div className="pt-4 sm:pt-0 sm:pl-4">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-synvora-text-secondary">
                      <Receipt className="h-3.5 w-3.5 text-synvora-primary" />
                      Payments
                    </div>
                    <p className="mt-1 text-lg font-semibold text-synvora-text">
                      {data?.pagination.totalCount ?? 0}
                    </p>
                    <p className="text-xs text-synvora-text-secondary">Received</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payout history */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-synvora-text-secondary">
          Payout History
        </h2>
        {error ? (
          <div className="rounded-xl border border-rose-100 bg-rose-50 px-6 py-8 text-center text-sm text-rose-600">
            Could not load payouts. Try again later.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-synvora-border bg-white shadow-sm">
            <table className="min-w-full divide-y divide-synvora-border text-sm">
              <thead className="bg-synvora-surface text-left text-xs font-semibold uppercase tracking-wide text-synvora-text-secondary">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Period</th>
                  <th className="px-5 py-3">Bank</th>
                  {isAdmin && <th className="px-5 py-3">Venue</th>}
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3">Notes</th>
                  {isAdmin && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-synvora-border/60">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-5 py-3.5"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-5 py-3.5"><Skeleton className="h-4 w-28" /></td>
                      <td className="px-5 py-3.5"><Skeleton className="h-4 w-24" /></td>
                      {isAdmin && <td className="px-5 py-3.5"><Skeleton className="h-4 w-20" /></td>}
                      <td className="px-5 py-3.5 text-right"><Skeleton className="ml-auto h-4 w-16" /></td>
                      <td className="px-5 py-3.5"><Skeleton className="h-4 w-32" /></td>
                      {isAdmin && <td className="px-5 py-3.5"><Skeleton className="ml-auto h-7 w-28" /></td>}
                    </tr>
                  ))
                ) : data?.payouts.length ? (
                  data.payouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-synvora-surface-active/40">
                      <td className="px-5 py-3.5 text-synvora-text">{formatDate(payout.processedAt)}</td>
                      <td className="px-5 py-3.5 text-synvora-text-secondary">
                        {payout.period ?? <span className="text-synvora-text-secondary/50">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-synvora-text-secondary">
                        {payout.bank ?? <span className="text-synvora-text-secondary/50">—</span>}
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-3.5 text-synvora-text-secondary">
                          {payout.venue?.name ?? "—"}
                        </td>
                      )}
                      <td className="px-5 py-3.5 text-right font-semibold text-synvora-text">
                        {fmt(Math.abs(payout.amount))}
                      </td>
                      <td className="px-5 py-3.5 text-synvora-text-secondary">
                        {payout.notes ?? <span className="opacity-40">—</span>}
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-3.5 text-right">
                          {deleteConfirmId === payout.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-xs text-synvora-text-secondary">Delete?</span>
                              <button
                                type="button"
                                onClick={() => handleDelete(payout.id)}
                                className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-rose-700"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="rounded-lg border border-synvora-border px-3 py-1 text-xs font-medium text-synvora-text-secondary transition hover:bg-synvora-surface-hover"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => openEdit(payout)}
                                className="mr-2 rounded-lg border border-synvora-border px-3 py-1 text-xs font-medium text-synvora-text-secondary transition hover:border-synvora-primary hover:text-synvora-primary"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(payout.id)}
                                className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 5}>
                      <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-synvora-surface-active">
                          <CreditCard className="h-6 w-6 text-synvora-text-secondary" />
                        </div>
                        <p className="text-sm font-medium text-synvora-text">No payouts yet</p>
                        <p className="text-xs text-synvora-text-secondary">
                          {isAdmin ? "Record your first payout using the button above." : "Payouts will appear here once they've been processed."}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && data.pagination.totalCount > data.pagination.pageSize && (
        <PaginationControls
          pagination={data.pagination}
          onPageChange={setCurrentPage}
        />
      )}

      {isAdmin && (
        <>
          <PayoutDialog
            open={isPayoutOpen}
            payout={editingPayout}
            venues={venues}
            onClose={() => setPayoutOpen(false)}
            onSaved={handleSaved}
          />
          <SyncMercuryDialog
            open={isSyncMercuryOpen}
            onClose={() => setIsSyncMercuryOpen(false)}
            onSyncComplete={handleSaved}
            venues={venues}
          />
          <AdjustmentDialog
            open={isAdjustOpen}
            venue={adjustVenue}
            onClose={() => setAdjustOpen(false)}
            onSaved={mutateBalance}
          />
        </>
      )}
    </div>
  );
}

// ── Payout Dialog ─────────────────────────────────────────────────────────────

type PayoutDialogProps = {
  open: boolean;
  payout: PayoutDto | null;
  venues: Array<{ id: number; name: string; slug: string }>;
  onClose: () => void;
  onSaved: () => void;
};

function PayoutDialog({ open, payout, venues, onClose, onSaved }: PayoutDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const empty = {
    amount: "" as string | number,
    bank: "Mashreq Bank",
    period: "",
    processedAt: new Date().toISOString().slice(0, 10),
    notes: "",
    venueId: venues[0]?.id ?? 0
  };
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (!open) return;
    if (payout) {
      setForm({
        amount: payout.amount,
        bank: payout.bank ?? "Mashreq Bank",
        period: payout.period ?? "",
        processedAt: payout.processedAt.slice(0, 10),
        notes: payout.notes ?? "",
        venueId: payout.venueId ?? venues[0]?.id ?? 0
      });
    } else {
      setForm({ ...empty, venueId: venues[0]?.id ?? 0 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, payout]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      amount: Number(form.amount),
      bank: form.bank.trim() || null,
      period: form.period.trim() || null,
      processedAt: new Date(form.processedAt).toISOString(),
      notes: form.notes.trim() || null,
      venueId: form.venueId,
      // Keep required fields for existing records
      currency: "USD",
      status: "Posted",
      description: form.period.trim() ? `Payout – ${form.period.trim()}` : "Payout",
      account: "Payouts"
    };

    const res = await fetch(payout ? `/api/payouts/${payout.id}` : "/api/payouts", {
      method: payout ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    setSubmitting(false);
    if (!res.ok) {
      toast.error("Failed to save payout.");
      return;
    }
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <form onSubmit={handleSubmit}>
          <div className="border-b border-synvora-border px-6 py-4">
            <h2 className="text-base font-semibold text-synvora-text">{payout ? "Edit" : "New"} Payout</h2>
            <p className="mt-0.5 text-sm text-synvora-text-secondary">Record a payout sent to the client.</p>
          </div>

          <div className="space-y-4 px-6 py-5">
            {venues.length > 1 && (
              <label className="flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
                Venue
                <select
                  value={form.venueId}
                  onChange={(e) => setForm((f) => ({ ...f, venueId: Number(e.target.value) }))}
                  className="rounded-lg border border-synvora-border px-3 py-2 text-sm shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                >
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </label>
            )}

            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
                Amount (USD) <span className="text-rose-500">*</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="rounded-lg border border-synvora-border px-3 py-2 text-sm shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
                Date <span className="text-rose-500">*</span>
                <input
                  type="date"
                  required
                  value={form.processedAt}
                  onChange={(e) => setForm((f) => ({ ...f, processedAt: e.target.value }))}
                  className="rounded-lg border border-synvora-border px-3 py-2 text-sm shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
              Bank
              <input
                type="text"
                placeholder="e.g. Mashreq Bank"
                value={form.bank}
                onChange={(e) => setForm((f) => ({ ...f, bank: e.target.value }))}
                className="rounded-lg border border-synvora-border px-3 py-2 text-sm shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
              Period covered
              <input
                type="text"
                placeholder="e.g. January 2026"
                value={form.period}
                onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
                className="rounded-lg border border-synvora-border px-3 py-2 text-sm shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
              Notes
              <textarea
                rows={2}
                placeholder="Optional note for the client"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="rounded-lg border border-synvora-border px-3 py-2 text-sm shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-synvora-border px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-synvora-border px-4 py-2 text-sm font-medium text-synvora-text-secondary transition hover:bg-synvora-surface-hover"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-synvora-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-synvora-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save Payout"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Balance Adjustment Dialog ─────────────────────────────────────────────────

type AdjustmentDialogProps = {
  open: boolean;
  venue: VenueBalance | null;
  onClose: () => void;
  onSaved: () => void;
};

function AdjustmentDialog({ open, venue, onClose, onSaved }: AdjustmentDialogProps) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && venue) {
      setValue(String(venue.balanceAdjustment));
    }
  }, [open, venue]);

  if (!open || !venue) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch(`/api/venues/${venue.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ balanceAdjustment: Number(value) })
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error("Failed to update adjustment.");
      return;
    }
    toast.success("Balance adjustment updated.");
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl">
        <form onSubmit={handleSubmit}>
          <div className="border-b border-synvora-border px-6 py-4">
            <h2 className="text-base font-semibold text-synvora-text">Balance Adjustment — {venue.name}</h2>
            <p className="mt-0.5 text-sm text-synvora-text-secondary">
              Add a manual offset to the balance calculation. Use this to seed historical amounts.
            </p>
          </div>
          <div className="px-6 py-5">
            <label className="flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
              Adjustment (USD)
              <input
                type="number"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0.00"
                className="rounded-lg border border-synvora-border px-3 py-2 text-sm shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
              />
              <span className="text-xs text-synvora-text-secondary">
                Positive = add to balance. Negative = subtract. Current: {fmt(venue.balanceAdjustment)}
              </span>
            </label>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-synvora-border px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-synvora-border px-4 py-2 text-sm font-medium text-synvora-text-secondary transition hover:bg-synvora-surface-hover"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-synvora-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-synvora-primary/90 disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

function PaginationControls({
  pagination,
  onPageChange
}: {
  pagination: PayoutsResponse["pagination"];
  onPageChange: (page: number) => void;
}) {
  const { page, pageSize, totalCount, totalPages } = pagination;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(start + pageSize - 1, totalCount);
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-synvora-border bg-white p-4 text-sm text-synvora-text-secondary shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <span>
        Showing <span className="font-medium text-synvora-text">{start}–{end}</span> of{" "}
        <span className="font-medium text-synvora-text">{totalCount}</span>
      </span>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <span className="text-xs font-semibold uppercase tracking-wide">
          Page {page} of {totalPages || 1}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 rounded-lg border border-synvora-border px-3 py-1.5 text-xs font-medium text-synvora-text-secondary transition hover:bg-synvora-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Prev
          </button>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-1 rounded-lg border border-synvora-border px-3 py-1.5 text-xs font-medium text-synvora-text-secondary transition hover:bg-synvora-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
