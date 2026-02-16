"use client";

import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

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
  createdAt?: string;
};

type TransactionReviewDialogProps = {
  open: boolean;
  onClose: () => void;
  transactions: MercuryTransaction[];
  accountName: string;
  venues: Array<{ id: number; name: string }>;
  onImportComplete: () => void;
};

export function TransactionReviewDialog({
  open,
  onClose,
  transactions,
  accountName,
  venues,
  onImportComplete
}: TransactionReviewDialogProps) {
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(
    new Set(safeTransactions.map((t) => t.id))
  );

  // Update selected transactions when transactions prop changes
  useEffect(() => {
    const safe = Array.isArray(transactions) ? transactions : [];
    setSelectedTransactions(new Set(safe.map((t) => t.id)));
  }, [transactions]);




  const [venueId, setVenueId] = useState<number>(venues[0]?.id || 0);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
  } | null>(null);

  const toggleTransaction = (id: string) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTransactions(newSelected);
  };

  const toggleAll = () => {
    if (selectedTransactions.size === safeTransactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(safeTransactions.map((t) => t.id)));
    }
  };

  const handleImport = async () => {
    if (selectedTransactions.size === 0 || !venueId) return;

    setImporting(true);
    setImportResult(null);

    try {
      const transactionsToImport = safeTransactions.filter((t) =>
        selectedTransactions.has(t.id)
      );

      const response = await fetch("/api/mercury/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          transactions: transactionsToImport,
          venueId
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to import transactions" }));
        alert(error.message ?? "Failed to import transactions");
        setImporting(false);
        return;
      }

      const result = await response.json();
      setImportResult(result);
      onImportComplete();
    } catch (error) {
      console.error("Import error:", error);
      alert("Failed to import transactions");
    } finally {
      setImporting(false);
    }
  };

  // Calculate totals for selected transactions
  const selectedTransactionsData = safeTransactions.filter((t) =>
    selectedTransactions.has(t.id)
  );

  const totalAmount = selectedTransactionsData.reduce((sum, t) => sum + t.amount, 0);

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
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
            <Dialog.Panel className="w-full max-w-5xl rounded-3xl bg-white shadow-2xl">
              <div className="flex flex-col h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                  <div>
                    <Dialog.Title className="text-lg font-semibold text-slate-900">
                      Review Transactions for Import
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-slate-500 mt-1">
                      Account: <span className="font-medium">{accountName}</span>
                      {" • "}
                      {transactions.length} transaction(s) found
                    </Dialog.Description>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300"
                    disabled={importing}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Success Message */}
                {importResult && (
                  <div className="mx-6 mt-4 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <div className="text-sm text-emerald-800">
                        <p className="font-semibold">Import completed successfully!</p>
                        <p>
                          Imported: {importResult.imported} • Skipped: {importResult.skipped}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Transactions Table */}
                <div className="overflow-auto flex-1 px-6 py-4">
                  {safeTransactions.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      No transactions found for the selected date range
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="sticky top-0 bg-white border-b-2 border-slate-200">
                        <tr className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          <th className="pb-3 pr-4">
                            <input
                              type="checkbox"
                              checked={selectedTransactions.size === safeTransactions.length}
                              onChange={toggleAll}
                              className="rounded border-slate-300 text-synvora-primary focus:ring-synvora-primary"
                              disabled={importing}
                            />
                          </th>
                          <th className="pb-3 pr-4">Date</th>
                          <th className="pb-3 pr-4">Counterparty</th>
                          <th className="pb-3 pr-4">Category</th>
                          <th className="pb-3 pr-4">Memo</th>
                          <th className="pb-3 pr-4 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {safeTransactions.map((transaction) => {
                          const isSelected = selectedTransactions.has(transaction.id);

                          return (
                            <tr
                              key={transaction.id}
                              className={`text-sm ${isSelected ? "bg-synvora-primary/5" : "hover:bg-slate-50"
                                } transition`}
                            >
                              <td className="py-3 pr-4">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleTransaction(transaction.id)}
                                  className="rounded border-slate-300 text-synvora-primary focus:ring-synvora-primary"
                                  disabled={importing}
                                />
                              </td>
                              <td className="py-3 pr-4 text-slate-600">
                                {formatDate(transaction.postedAt)}
                              </td>
                              <td className="py-3 pr-4 font-medium text-slate-900">
                                {transaction.counterparty?.name || transaction.merchant?.name || "-"}
                              </td>
                              <td className="py-3 pr-4 text-slate-600">
                                {transaction.category || "-"}
                              </td>
                              <td className="py-3 pr-4 text-slate-600">
                                {transaction.memo || "-"}
                              </td>
                              <td className="py-3 pr-4 text-right font-medium text-slate-900">
                                {formatCurrency(transaction.amount, "USD")}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 px-6 py-4 bg-slate-50">
                  <div className="space-y-4">
                    {venues.length > 0 && (
                      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                        Venue
                        <select
                          value={venueId}
                          onChange={(e) => setVenueId(Number(e.target.value))}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                          disabled={importing}
                        >
                          {venues.map((venue) => (
                            <option key={venue.id} value={venue.id}>
                              {venue.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6 text-sm text-slate-600">
                        <div>
                          <span className="font-semibold text-slate-900">{selectedTransactions.size}</span> of{" "}
                          <span className="font-semibold text-slate-900">{safeTransactions.length}</span> transactions selected
                        </div>
                        {selectedTransactions.size > 0 && (
                          <>
                            <div className="h-4 w-px bg-slate-300" />
                            <div>
                              <span className="text-xs uppercase tracking-wide text-slate-500">Total:</span>{" "}
                              <span className="font-semibold text-slate-900">{formatCurrency(totalAmount, "USD")}</span>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={onClose}
                          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300"
                          disabled={importing}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleImport}
                          disabled={importing || selectedTransactions.size === 0 || venues.length === 0}
                          className="inline-flex items-center gap-2 rounded-lg bg-synvora-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-synvora-primary/90 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          {importing ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Importing…
                            </>
                          ) : (
                            `Import ${selectedTransactions.size} Transaction${selectedTransactions.size !== 1 ? "s" : ""}`
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}

