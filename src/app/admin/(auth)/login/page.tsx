"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

type View = "login" | "forgot";

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
  const [view, setView] = useState<View>("login");

  const [loginState, setLoginState] = useState({ email: "", password: "", loading: false, message: "" });
  const [forgotState, setForgotState] = useState({ email: "", loading: false, message: "", sent: false });

  const onLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginState((s) => ({ ...s, loading: true, message: "" }));
    const result = await signIn("credentials", {
      email: loginState.email,
      password: loginState.password,
      redirect: false
    });
    if (result?.ok) {
      router.push("/admin/orders");
      router.refresh();
      return;
    }
    setLoginState((s) => ({ ...s, loading: false, message: "Invalid email or password." }));
  };

  const onForgot = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setForgotState((s) => ({ ...s, loading: true, message: "" }));
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotState.email })
      });
      setForgotState((s) => ({ ...s, loading: false, sent: true }));
    } catch {
      setForgotState((s) => ({ ...s, loading: false, message: "Something went wrong. Please try again." }));
    }
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
            <p className="mt-0.5 text-sm text-synvora-text-secondary">
              {view === "login" ? "Sign in to your account" : "Reset your password"}
            </p>
          </div>
        </div>

        {view === "login" ? (
          <>
            <form onSubmit={onLogin} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
                Email address
                <input
                  type="email"
                  value={loginState.email}
                  onChange={(e) => setLoginState((s) => ({ ...s, email: e.target.value }))}
                  className="rounded-lg border border-synvora-border bg-white px-3 py-2 text-sm text-synvora-text shadow-sm placeholder:text-synvora-text-secondary/50 focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                  placeholder="you@example.com"
                  required
                />
              </label>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-synvora-text">Password</span>
                  <button
                    type="button"
                    onClick={() => setView("forgot")}
                    className="text-xs text-synvora-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  value={loginState.password}
                  onChange={(e) => setLoginState((s) => ({ ...s, password: e.target.value }))}
                  className="rounded-lg border border-synvora-border bg-white px-3 py-2 text-sm text-synvora-text shadow-sm placeholder:text-synvora-text-secondary/50 focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                  placeholder="••••••••"
                  required
                />
              </div>

              {(loginState.message || error) && (
                <div className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {loginState.message || "Authentication error. Check your credentials."}
                </div>
              )}

              <button
                type="submit"
                disabled={loginState.loading}
                className="mt-1 inline-flex items-center justify-center rounded-lg bg-synvora-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-synvora-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loginState.loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <p className="text-center text-xs text-synvora-text-secondary">
              Need access? Contact your Synvora administrator.
            </p>
          </>
        ) : forgotState.sent ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-synvora-text">Check your email</p>
              <p className="mt-1 text-sm text-synvora-text-secondary">
                If an account exists for <strong>{forgotState.email}</strong>, we&apos;ve sent a reset link. It expires in 1 hour.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setView("login"); setForgotState({ email: "", loading: false, message: "", sent: false }); }}
              className="text-sm text-synvora-primary hover:underline"
            >
              ← Back to sign in
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={onForgot} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-synvora-text">
                Email address
                <input
                  type="email"
                  value={forgotState.email}
                  onChange={(e) => setForgotState((s) => ({ ...s, email: e.target.value }))}
                  className="rounded-lg border border-synvora-border bg-white px-3 py-2 text-sm text-synvora-text shadow-sm placeholder:text-synvora-text-secondary/50 focus:border-synvora-primary focus:outline-none focus:ring-1 focus:ring-synvora-primary"
                  placeholder="you@example.com"
                  required
                />
              </label>

              {forgotState.message && (
                <div className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {forgotState.message}
                </div>
              )}

              <button
                type="submit"
                disabled={forgotState.loading}
                className="mt-1 inline-flex items-center justify-center rounded-lg bg-synvora-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-synvora-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {forgotState.loading ? "Sending…" : "Send reset link"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => setView("login")}
              className="text-center text-xs text-synvora-text-secondary hover:text-synvora-primary"
            >
              ← Back to sign in
            </button>
          </>
        )}
      </div>
    </div>
  );
}
