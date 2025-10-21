"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/utils";

const DEFAULT_EXCHANGE_RATE = 48.5;

type ParsedOrder = {
  processedAt: string;
  originalAmount: number;
  displayDate: string;
  line: number;
};

export default function ImportOrdersPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [rows, setRows] = useState<ParsedOrder[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "parsing" | "ready" | "importing" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [customerName, setCustomerName] = useState("CSV Import");
  const [exchangeRate, setExchangeRate] = useState(String(DEFAULT_EXCHANGE_RATE));
  const [venue, setVenue] = useState("CICCIO");

  if (session?.user.role !== "ADMIN") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
        You need administrator access to import orders.
      </div>
    );
  }

  const parsedRate = Number(exchangeRate);
  const exchangeRateDisplay = Number.isNaN(parsedRate) || parsedRate <= 0 ? DEFAULT_EXCHANGE_RATE : parsedRate;

  const resetState = () => {
    setRows([]);
    setErrors([]);
    setStatus("idle");
    setMessage("");
  };

  const parseCsv = async (file: File) => {
    resetState();
    setStatus("parsing");

    try {
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length === 0) {
        setErrors(["The uploaded file is empty."]);
        setStatus("error");
        return;
      }

      const parsedRows: ParsedOrder[] = [];
      const parseErrors: string[] = [];

      const hasHeader =
        lines[0].toLowerCase().includes("date") || lines[0].toLowerCase().includes("egp");

      const dataLines = hasHeader ? lines.slice(1) : lines;

      dataLines.forEach((line, index) => {
        const [rawDate, rawAmount] = line.split(",").map((value) => value?.trim() ?? "");

        if (!rawDate || !rawAmount) {
          parseErrors.push(`Line ${index + 1}: Missing date or EGP value.`);
          return;
        }

        const date = new Date(rawDate);
        if (Number.isNaN(date.getTime())) {
          parseErrors.push(`Line ${index + 1}: Invalid date "${rawDate}".`);
          return;
        }

        const sanitizedAmount = Number(rawAmount.replace(/[^\d.-]/g, ""));
        if (Number.isNaN(sanitizedAmount)) {
          parseErrors.push(`Line ${index + 1}: Invalid EGP value "${rawAmount}".`);
          return;
        }

        parsedRows.push({
          processedAt: date.toISOString(),
          originalAmount: sanitizedAmount,
          displayDate: formatDateTime(date),
          line: index + 1
        });
      });

      if (parseErrors.length > 0) {
        setErrors(parseErrors);
        setStatus("error");
        return;
      }

      setRows(parsedRows);
      setStatus("ready");
    } catch (error) {
      console.error(error);
      setErrors(["We couldn&apos;t read the file. Please try again with a valid CSV."]);
      setStatus("error");
    }
  };

  const handleImport = async () => {
    if (!rows.length) {
      return;
    }

    setStatus("importing");
    setMessage("");

    const trimmedCustomer = customerName.trim() || "CSV Import";
    const trimmedVenue = venue.trim() || "CICCIO";
    const rateNumber = Number(exchangeRate);

    if (Number.isNaN(rateNumber) || rateNumber <= 0) {
      setStatus("error");
      setErrors(["Please provide a valid USD/EGP exchange rate greater than zero."]);
      return;
    }

    try {
      const response = await fetch("/api/import/csv", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          customerName: trimmedCustomer,
          venue: trimmedVenue,
          exchangeRate: rateNumber,
          orders: rows.map((row) => ({
            processedAt: row.processedAt,
            originalAmount: row.originalAmount
          }))
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? "Import failed");
      }

      const payload = await response.json();
      setStatus("success");
      setMessage(`Imported ${payload.imported} orders successfully.`);
      setRows([]);
      setTimeout(() => {
        router.push("/orders");
        router.refresh();
      }, 1500);
    } catch (error) {
      console.error(error);
      setStatus("error");
      setErrors([
        error instanceof Error
          ? error.message
          : "Unexpected error while importing. Please try again."
      ]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Import orders from CSV</h1>
        <p className="mt-2 text-sm text-slate-500">
          Upload a CSV file with two columns: <strong>Date</strong> and <strong>EGP Value</strong>.
          Example row: <code>2025-09-11 02:37:16 +0300,15000</code>.
        </p>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            Customer name
            <input
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="CSV Import"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            Venue
            <select
              value={venue}
              onChange={(event) => setVenue(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
            >
              <option value="CICCIO">CICCIO</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            USD/EGP rate
            <input
              type="number"
              step="0.01"
              min="0"
              value={exchangeRate}
              onChange={(event) => setExchangeRate(event.target.value)}
              placeholder="48.5"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
            />
          </label>
        </div>

        <label className="flex flex-col gap-3 text-sm font-semibold text-slate-700">
          Select CSV file
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                parseCsv(file);
              }
            }}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
          />
        </label>

        {(status === "ready" || status === "importing") && (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Preview ({rows.length} rows)</p>
              <p>First 5 rows shown below. Selected USD/EGP rate: {exchangeRateDisplay.toFixed(2)}.</p>
            </div>
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">Line</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">EGP Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rows.slice(0, 5).map((row) => (
                  <tr key={`${row.line}-${row.processedAt}`}>
                    <td className="px-4 py-2 text-slate-500">{row.line}</td>
                    <td className="px-4 py-2 text-slate-700">{row.displayDate}</td>
                    <td className="px-4 py-2 font-semibold text-slate-900">
                      EGP {row.originalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                {rows.length > 5 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-center text-xs text-slate-400">
                      … {rows.length - 5} more rows not shown
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <button
              type="button"
              onClick={handleImport}
              disabled={status === "importing"}
              className="inline-flex items-center gap-2 rounded-xl bg-synvora-primary px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-synvora-primary/90 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {status === "importing" ? "Importing…" : "Import orders"}
            </button>
          </div>
        )}

        {errors.length > 0 && (
          <div className="mt-4 space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
            <p className="font-semibold">We couldn&apos;t parse the file:</p>
            <ul className="list-disc pl-5">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {status === "success" && message && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-600">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
