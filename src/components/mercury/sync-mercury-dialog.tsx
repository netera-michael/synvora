"use client";

import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { CloudDownload, X } from "lucide-react";
import useSWR from "swr";
import { TransactionReviewDialog } from "@/components/mercury/transaction-review-dialog";

type SyncMercuryDialogProps = {
  open: boolean;
  onClose: () => void;
  onSyncComplete: () => void;
  venues: Array<{ id: number; name: string }>;
};

type MercuryAccount = {
  id: string;
  name: string;
  type: string;
};

type MercuryTransaction = {
  id: string;
  amount: number;
  direction: "credit" | "debit";
  counterparty: {
    name: string;
  };
  category: string;
  merchant: {
    name: string;
  };
  memo?: string;
  postedAt: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function SyncMercuryDialog({ open, onClose, onSyncComplete, venues }: SyncMercuryDialogProps) {
  const [formState, setFormState] = useState({
    accountId: "",
    startDate: "",
    endDate: "",
    message: "",
    status: "idle" as "idle" | "loading" | "success" | "error"
  });

  const [fetchedTransactions, setFetchedTransactions] = useState<MercuryTransaction[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<MercuryAccount | null>(null);
  const [showReview, setShowReview] = useState(false);

  const { data: accountsData, error: accountsError } = useSWR<{ accounts: MercuryAccount[] }>(
    open ? "/api/mercury/accounts" : null,
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
      accountId: "",
      startDate: "",
      endDate: "",
      message: "",
      status: "idle"
    });
    setFetchedTransactions([]);
    setSelectedAccount(null);
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

    const response = await fetch("/api/mercury/fetch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        accountId: formState.accountId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Failed to fetch transactions" }));
      console.error("Fetch error:", error);
      setFormState((current) => ({
        ...current,
        status: "error",
        message: error.message ?? `Failed to fetch transactions from Mercury (${response.status})`
      }));
      return;
    }

    const payload = await response.json();
    console.log("Fetch response:", payload);

    // Check if all transactions are already imported
    if (payload.totalFetched > 0 && payload.count === 0) {
      setFormState((current) => ({
        ...current,
        status: "error",
        message: `All ${payload.totalFetched} transaction(s) from the selected date range have already been imported`
      }));
      return;
    }

    // Check if no transactions found at all
    if (payload.totalFetched === 0) {
      setFormState((current) => ({
        ...current,
        status: "error",
        message: "No transactions found for the selected date range"
      }));
      return;
    }

    // Store the fetched transactions and show review dialog
    setFetchedTransactions(payload.transactions);
    const account = accountsData?.accounts.find((a) => a.id === formState.accountId);
    setSelectedAccount(account || null);
    setShowReview(true);

    // Show success message with info about filtered transactions
    const message = payload.alreadyImported > 0
      ? `Found ${payload.count} new transaction(s) to import${payload.alreadyImported > 0 ? ` (${payload.alreadyImported} already imported)` : ""}`
      : `Found ${payload.count} transaction(s) to import`;

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
    onSyncComplete();
    close();
  };

  return (
    <>
      <Transition show={open && !showReview} as={Fragment}>
        <Dialog onClose={close} className="relative z-50">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-900/40" />
          </Transition.Child>

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md rounded-3xl bg-white shadow-2xl">
                <form onSubmit={onSubmit} className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <Dialog.Title className="text-lg font-semibold text-slate-900">
                      Sync from Mercury
                    </Dialog.Title>
                    <button
                      type="button"
                      onClick={close}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                      Account
                      <select
                        value={formState.accountId}
                        onChange={(e) => setFormState({ ...formState, accountId: e.target.value })}
                        required
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                      >
                        <option value="">Select an account</option>
                        {accountsData?.accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name}
                          </option>
                        ))}
                      </select>
                      {accountsError && (
                        <span className="text-xs text-rose-600">
                          Failed to load accounts. Please check your Mercury settings.
                        </span>
                      )}
                    </label>

                    <div className="grid grid-cols-2 gap-4">
                      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                        Start Date
                        <input
                          type="date"
                          value={formState.startDate}
                          onChange={(e) => setFormState({ ...formState, startDate: e.target.value })}
                          required
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                        />
                      </label>

                      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                        End Date
                        <input
                          type="date"
                          value={formState.endDate}
                          onChange={(e) => setFormState({ ...formState, endDate: e.target.value })}
                          required
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                        />
                      </label>
                    </div>

                    {formState.message && (
                      <div
                        className={`rounded-lg border p-3 text-sm ${
                          formState.status === "error"
                            ? "border-rose-200 bg-rose-50 text-rose-700"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {formState.message}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={close}
                      className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formState.status === "loading"}
                      className="inline-flex items-center gap-2 rounded-lg bg-synvora-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-synvora-primary/90 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {formState.status === "loading" ? (
                        <>
                          <CloudDownload className="h-4 w-4 animate-pulse" />
                          Fetching…
                        </>
                      ) : (
                        <>
                          <CloudDownload className="h-4 w-4" />
                          Fetch Transactions
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>

      <TransactionReviewDialog
        open={showReview}
        onClose={handleReviewClose}
        transactions={fetchedTransactions}
        accountName={selectedAccount?.name || "Unknown"}
        venues={venues}
        onImportComplete={handleImportComplete}
      />
    </>
  );
}

