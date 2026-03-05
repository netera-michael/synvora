"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import type { Session } from "next-auth";
import { SideNav } from "@/components/navigation/side-nav";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { cn } from "@/lib/utils";

type DashboardShellProps = {
  session: Session;
  children: React.ReactNode;
};

export function DashboardShell({ session, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-synvora-surface text-synvora-text">
      {/* Mobile-only top bar — just hamburger + logo */}
      <div className="flex h-14 items-center gap-3 border-b border-synvora-border bg-white px-4 lg:hidden print:hidden">
        <button
          type="button"
          aria-label="Open sidebar"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-synvora-border text-synvora-text-secondary transition hover:bg-synvora-surface-hover hover:text-synvora-text"
          onClick={() => setSidebarOpen((prev) => !prev)}
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-synvora-primary text-xs font-bold text-white">
            S
          </div>
          <span className="text-sm font-semibold text-synvora-text">Synvora</span>
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-3.5rem)] lg:min-h-screen">
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-40 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
        >
          <SideNav session={session} />
        </div>
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar"
            className="fixed inset-0 z-30 bg-synvora-text/40 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <main className="flex-1 overflow-x-hidden px-4 py-6 lg:px-8">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
