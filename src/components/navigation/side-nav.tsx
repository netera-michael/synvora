"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import { ClipboardList, Package, BarChart3, Users, Settings, Upload } from "lucide-react";
import type { Route } from "next";

type NavItem = {
  href: Route;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/products", label: "Products", icon: Package },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/settings/import", label: "Import CSV", icon: Upload }
];

export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-none border-r border-slate-200 bg-white pb-16 lg:block">
      <nav className="flex h-full flex-col gap-2 p-4">
        <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Manage</p>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-synvora-primary/10 text-synvora-primary"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        <div className="mt-auto rounded-xl bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Workflow tips</p>
          <p className="mt-1 text-xs text-slate-500">
            Organize Synvora orders by tagging them with fulfillment priority to streamline pick and pack.
          </p>
        </div>
      </nav>
    </aside>
  );
}
