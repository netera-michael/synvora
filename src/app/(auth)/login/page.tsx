"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-synvora.surface" />}>
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
      router.push("/orders");
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
    <div className="flex min-h-screen items-center justify-center bg-synvora.surface px-4 py-12">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-10 shadow-xl shadow-slate-200/40">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-synvora-primary text-white font-semibold">
              S
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900">Synvora</p>
              <p className="text-sm text-slate-500">Unified Commerce Operations</p>
            </div>
          </div>
          <h1 className="mt-6 text-2xl font-semibold text-slate-900">Sign in to your dashboard</h1>
          <p className="mt-2 text-sm text-slate-500">
            Use the admin credentials provided during setup. You can manage users later.
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Email
            <input
              type="email"
              value={formState.email}
              onChange={(event) => setFormState((state) => ({ ...state, email: event.target.value }))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
              placeholder="admin@synvora.com"
              required
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            Password
            <input
              type="password"
              value={formState.password}
              onChange={(event) => setFormState((state) => ({ ...state, password: event.target.value }))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-synvora-primary focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
              placeholder="••••••••"
              required
            />
          </label>

          <button
            type="submit"
            disabled={formState.loading}
            className="mt-2 inline-flex items-center justify-center rounded-lg bg-synvora-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-synvora-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-synvora-primary disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {formState.loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {(formState.message || error) && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
            {formState.message || "Authentication error. Check your credentials."}
          </p>
        )}

        <p className="text-center text-xs text-slate-400">
          Need help? Contact your Synvora administrator to reset your access.
        </p>
      </div>
    </div>
  );
}
