"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { SynvoraLogo } from "@/components/ui/logo";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-synvora-surface" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-synvora-surface px-4">
        <div className="w-full max-w-sm rounded-2xl border border-synvora-border bg-white p-8 shadow-sm text-center">
          <p className="text-sm font-medium text-rose-600">Invalid reset link.</p>
          <Link href="/admin/login" className="mt-4 inline-block text-sm text-synvora-primary hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-synvora-surface px-4">
        <div className="w-full max-w-sm rounded-2xl border border-synvora-border bg-white p-8 shadow-sm text-center space-y-4">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-synvora-text">Password updated</p>
            <p className="mt-1 text-sm text-synvora-text-secondary">You can now sign in with your new password.</p>
          </div>
          <Link
            href="/admin/login"
            className="inline-flex items-center justify-center rounded-lg bg-synvora-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-synvora-primary/90"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Something went wrong.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-synvora-surface px-4 py-12">
      <div className="flex w-full max-w-sm flex-col gap-8 rounded-2xl border border-synvora-border bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <SynvoraLogo size={44} showWordmark={false} />
          <div>
            <p className="text-xl font-semibold text-synvora-text">Set new password</p>
            <p className="mt-0.5 text-sm text-synvora-text-secondary">Choose a strong password for your account.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
            New password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-synvora-border bg-white px-3 py-2 text-sm text-synvora-text shadow-sm placeholder:text-synvora-text-secondary/50 focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
              placeholder="At least 8 characters"
              required
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
            Confirm password
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="rounded-lg border border-synvora-border bg-white px-3 py-2 text-sm text-synvora-text shadow-sm placeholder:text-synvora-text-secondary/50 focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
              placeholder="Repeat your password"
              required
            />
          </label>

          {error && (
            <div className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 inline-flex items-center justify-center rounded-lg bg-synvora-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-synvora-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>

        <Link href="/admin/login" className="text-center text-xs text-synvora-text-secondary hover:text-synvora-primary">
          ← Back to sign in
        </Link>
      </div>
    </div>
  );
}
