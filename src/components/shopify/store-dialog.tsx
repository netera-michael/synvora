"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { X, Loader2 } from "lucide-react";
import { APIInstructions } from "./api-instructions";

type Venue = {
  id: number;
  name: string;
  slug: string;
};

type StoreDialogProps = {
  open: boolean;
  onClose: () => void;
  store?: {
    id: number;
    storeDomain: string;
    nickname: string | null;
    venue: {
      id: number;
      name: string;
    };
  } | null;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function StoreDialog({ open, onClose, store }: StoreDialogProps) {
  const [formData, setFormData] = useState({
    storeDomain: "",
    accessToken: "",
    nickname: "",
    venueId: ""
  });
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);

  const { data: venuesData } = useSWR<{ venues: Venue[] }>("/api/venues", fetcher);

  // Reset form when dialog opens/closes or store changes
  useEffect(() => {
    if (open && store) {
      setFormData({
        storeDomain: store.storeDomain,
        accessToken: "", // Don't show existing token for security
        nickname: store.nickname || "",
        venueId: String(store.venue.id)
      });
    } else if (open) {
      setFormData({
        storeDomain: "",
        accessToken: "",
        nickname: "",
        venueId: venuesData?.venues[0]?.id ? String(venuesData.venues[0].id) : ""
      });
    }
    setError("");
  }, [open, store, venuesData]);

  const handleTestConnection = async () => {
    if (!formData.storeDomain || !formData.accessToken) {
      setError("Please enter store domain and access token");
      return;
    }

    setTesting(true);
    setError("");

    try {
      const response = await fetch("/api/shopify/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeDomain: formData.storeDomain,
          accessToken: formData.accessToken
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ ${data.message}`);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Failed to test connection");
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.storeDomain || !formData.accessToken || !formData.venueId) {
      setError("Please fill in all required fields");
      return;
    }

    setSaving(true);

    try {
      const url = store ? `/api/shopify-stores/${store.id}` : "/api/shopify-stores";
      const method = store ? "PATCH" : "POST";

      const payload: any = {
        storeDomain: formData.storeDomain,
        venueId: parseInt(formData.venueId, 10)
      };

      if (formData.nickname) {
        payload.nickname = formData.nickname;
      }

      // Only include access token if it's provided (for updates, it's optional)
      if (formData.accessToken) {
        payload.accessToken = formData.accessToken;
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        onClose();
      } else {
        setError(data.message || "Failed to save store");
      }
    } catch (err) {
      setError("Failed to save store");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-slate-900">
            {store ? "Edit Shopify Store" : "Add Shopify Store"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Store Domain */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Store Domain <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.storeDomain}
              onChange={(e) => setFormData({ ...formData, storeDomain: e.target.value })}
              placeholder="your-store.myshopify.com"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
              required
            />
          </div>

          {/* Access Token */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Admin API Access Token <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={formData.accessToken}
              onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
              placeholder="shpat_..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
              required={!store}
            />
            {store && (
              <p className="mt-1 text-xs text-slate-500">
                Leave blank to keep existing token
              </p>
            )}
          </div>

          {/* Help Button */}
          <button
            type="button"
            onClick={() => setShowInstructions(!showInstructions)}
            className="text-sm text-synvora-primary hover:underline"
          >
            {showInstructions ? "Hide" : "How to get API credentials?"}
          </button>

          {showInstructions && <APIInstructions />}

          {/* Nickname */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nickname (optional)
            </label>
            <input
              type="text"
              value={formData.nickname}
              onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
              placeholder="My Main Store"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
            />
          </div>

          {/* Venue */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Venue <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.venueId}
              onChange={(e) => setFormData({ ...formData, venueId: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
              required
            >
              <option value="">Select venue</option>
              {venuesData?.venues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.name}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-4 pt-4">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !formData.storeDomain || !formData.accessToken}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test Connection"
              )}
            </button>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-synvora-primary px-4 py-2 text-sm font-semibold text-white hover:bg-synvora-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  store ? "Update Store" : "Add Store"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
