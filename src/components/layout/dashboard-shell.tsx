"use client";

import { useState } from "react";
import type { Session } from "next-auth";
import { TopBar } from "@/components/navigation/top-bar";
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
      <TopBar session={session} onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
      <div className="flex min-h-[calc(100vh-4rem)]">
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
