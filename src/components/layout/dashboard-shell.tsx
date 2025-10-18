"use client";

import { useState } from "react";
import type { Session } from "next-auth";
import { TopBar } from "@/components/navigation/top-bar";
import { SideNav } from "@/components/navigation/side-nav";
import { cn } from "@/lib/utils";

type DashboardShellProps = {
  session: Session;
  children: React.ReactNode;
};

export function DashboardShell({ session, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-synvora.surface text-slate-900">
      <TopBar session={session} onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
      <div className="flex">
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out lg:static lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
        >
          <SideNav />
        </div>
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar"
            className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
