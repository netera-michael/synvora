"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import { ClipboardList, Clock, Package, BarChart3, Users, Settings, Upload, Store, CreditCard, UserCircle } from "lucide-react";
import type { Route } from "next";
import type { Session } from "next-auth";

type NavItem = {
  href: Route;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Main",
    items: [
      { href: "/admin/orders", label: "Orders", icon: ClipboardList },
      { href: "/admin/orders/pending" as any, label: "Pending Imports", icon: Clock },
      { href: "/admin/products", label: "Products", icon: Package },
      { href: "/admin/customers", label: "Customers", icon: Users },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    ]
  },
  {
    title: "Finance",
    items: [{ href: "/admin/finance/payouts", label: "Payouts", icon: CreditCard }]
  },
  {
    title: "Settings",
    items: [
      { href: "/admin/settings", label: "Admin Settings", icon: Settings },
      { href: "/admin/settings/shopify-stores", label: "Shopify Stores", icon: Store },
      { href: "/admin/settings/import", label: "Import CSV", icon: Upload },
      { href: "/admin/settings/user", label: "My Account", icon: UserCircle },
    ]
  }
];

const ADMIN_ONLY_PATHS = new Set<Route>([
  "/admin/orders/pending",
  "/admin/products",
  "/admin/settings",
  "/admin/settings/import",
  "/admin/settings/shopify-stores"
]);

type SideNavProps = {
  session: Session;
};

export function SideNav({ session }: SideNavProps) {
  const pathname = usePathname();
  const isAdmin = session.user.role === "ADMIN";

  const groups = NAV_GROUPS.map((group) => {
    const items = group.items.filter((item) => {
      if (item.href === "/admin/settings/user") return true;
      return isAdmin || !ADMIN_ONLY_PATHS.has(item.href);
    });
    return { ...group, items };
  }).filter((group) => group.items.length > 0);

  return (
    <aside className="flex h-full w-64 flex-none flex-col border-r border-synvora-border bg-white">
      {/* Brand header */}
      <div className="flex h-16 flex-none items-center gap-3 border-b border-synvora-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-synvora-primary text-sm font-bold text-white shadow-sm">
          S
        </div>
        <div>
          <p className="text-sm font-semibold text-synvora-text leading-none">Synvora</p>
          <p className="mt-0.5 text-xs text-synvora-text-secondary leading-none">{isAdmin ? "Admin" : "Client Portal"}</p>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 pb-8">
        {groups.map((group) => (
          <div key={group.title} className="flex flex-col gap-0.5">
            <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-synvora-text-secondary/70">
              {group.title}
            </p>
            {group.items.map((item) => {
              const isActive =
                item.href === "/admin/orders"
                  ? pathname === "/admin/orders"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-synvora-primary/10 text-synvora-primary"
                      : "text-synvora-text-secondary hover:bg-synvora-surface-hover hover:text-synvora-text"
                  )}
                >
                  <Icon className={cn("h-4 w-4 flex-none", isActive ? "text-synvora-primary" : "")} />
                  {item.label}
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-synvora-primary" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
