"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-synvora-surface" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [formState, setFormState] = useState({
    email: "",
    password: "",
    loading: false,
    message: ""
  });

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormState((state) => ({ ...state, loading: true, message: "" }));

    const result = await signIn("credentials", {
      email: formState.email,
      password: formState.password,
      redirect: false
    });

    if (result?.ok) {
      router.push("/admin/orders");
      router.refresh();
      return;
    }

    setFormState((state) => ({
      ...state,
      loading: false,
      message: "Invalid credentials. Try again."
    }));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-synvora-surface px-4 py-12">
      <div className="flex w-full max-w-sm flex-col gap-8 rounded-2xl border border-synvora-border bg-white p-8 shadow-sm">
        {/* Brand */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-synvora-primary text-lg font-bold text-white shadow-sm">
            S
          </div>
          <div>
            <p className="text-xl font-semibold text-synvora-text">Synvora</p>
            <p className="mt-0.5 text-sm text-synvora-text-secondary">Sign in to your account</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
            Email address
            <input
              type="email"
              value={formState.email}
              onChange={(event) => setFormState((state) => ({ ...state, email: event.target.value }))}
              className="rounded-lg border border-synvora-border bg-white px-3 py-2 text-sm text-synvora-text shadow-sm placeholder:text-synvora-text-secondary/50 focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
            Password
            <input
              type="password"
              value={formState.password}
              onChange={(event) => setFormState((state) => ({ ...state, password: event.target.value }))}
              className="rounded-lg border border-synvora-border bg-white px-3 py-2 text-sm text-synvora-text shadow-sm placeholder:text-synvora-text-secondary/50 focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
              placeholder="••••••••"
              required
            />
          </label>

          {(formState.message || error) && (
            <div className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {formState.message || "Authentication error. Check your credentials."}
            </div>
          )}

          <button
            type="submit"
            disabled={formState.loading}
            className="mt-1 inline-flex items-center justify-center rounded-lg bg-synvora-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-synvora-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {formState.loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-xs text-synvora-text-secondary">
          Need access? Contact your Synvora administrator.
        </p>
      </div>
    </div>
  );
}
