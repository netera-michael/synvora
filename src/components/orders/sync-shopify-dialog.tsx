"use client";

import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { CloudDownload, X } from "lucide-react";

type SyncShopifyDialogProps = {
  open: boolean;
  onClose: () => void;
  onSyncComplete: () => void;
};

export function SyncShopifyDialog({ open, onClose, onSyncComplete }: SyncShopifyDialogProps) {
  const [formState, setFormState] = useState({
    storeDomain: "",
    accessToken: "",
    sinceId: "",
    message: "",
    status: "idle" as "idle" | "loading" | "success" | "error"
  });

  const close = () => {
    setFormState({
      storeDomain: "",
      accessToken: "",
      sinceId: "",
      message: "",
      status: "idle"
    });
    onClose();
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormState((current) => ({ ...current, status: "loading", message: "" }));

    const response = await fetch("/api/shopify/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        storeDomain: formState.storeDomain,
        accessToken: formState.accessToken,
        sinceId: formState.sinceId || undefined
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Failed to sync" }));
      setFormState((current) => ({
        ...current,
        status: "error",
        message: error.message ?? "Failed to sync from Shopify"
      }));
      return;
    }

    const payload = await response.json();
    setFormState((current) => ({
      ...current,
      status: "success",
      message: `Imported ${payload.imported} orders.`
    }));
    onSyncComplete();
  };

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={close}>
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
            <Dialog.Panel className="w-full max-w-lg rounded-3xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div>
                  <Dialog.Title className="text-lg font-semibold text-slate-900">
                    Sync Shopify orders
                  </Dialog.Title>
                  <Dialog.Description className="text-sm text-slate-500">
                    Provide your store domain and Admin API access token to pull in the latest data.
                  </Dialog.Description>
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={onSubmit} className="px-6 py-6">
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  Store domain
                  <input
                    type="text"
                    placeholder="your-store.myshopify.com"
                    value={formState.storeDomain}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, storeDomain: event.target.value }))
                    }
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                    required
                  />
                </label>

                <label className="mt-4 flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  Admin API access token
                  <input
                    type="password"
                    placeholder="shpat_..."
                    value={formState.accessToken}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, accessToken: event.target.value }))
                    }
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                    required
                  />
                  <span className="text-xs font-normal text-slate-400">
                    Create a Private App with read_orders scope and paste the Admin API token here. The
                    token is stored encrypted in Synvora.
                  </span>
                </label>

                <label className="mt-4 flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  Since ID (optional)
                  <input
                    type="text"
                    placeholder="Only import orders after this Shopify ID"
                    value={formState.sinceId}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, sinceId: event.target.value }))
                    }
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
                  />
                </label>

                {formState.message && (
                  <p
                    className={
                      formState.status === "success"
                        ? "mt-4 rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-600"
                        : "mt-4 rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-600"
                    }
                  >
                    {formState.message}
                  </p>
                )}

                <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formState.status === "loading"}
                    className="inline-flex items-center gap-2 rounded-xl bg-synvora-primary px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-synvora-primary/90 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <CloudDownload className="h-4 w-4" />
                    {formState.status === "loading" ? "Syncing..." : "Sync orders"}
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
