"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import { ClipboardList, Package, BarChart3, Users, Settings, Upload } from "lucide-react";
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
  adminOnly?: boolean;
};

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Manage",
    items: [
      { href: "/admin/orders", label: "Orders", icon: ClipboardList },
      { href: "/admin/products", label: "Products", icon: Package },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/admin/customers", label: "Customers", icon: Users },
      { href: "/admin/settings", label: "Admin Settings", icon: Settings },
      { href: "/admin/settings/import", label: "Import CSV", icon: Upload },
      { href: "/admin/settings/user", label: "My Account", icon: Settings }
    ]
  },
  {
    title: "Finance",
    items: [{ href: "/admin/finance/payouts", label: "Payouts", icon: BarChart3 }]
  }
];

const ADMIN_ONLY_PATHS = new Set<Route>(["/admin/settings", "/admin/settings/import"]);

type SideNavProps = {
  session: Session;
};

export function SideNav({ session }: SideNavProps) {
  const pathname = usePathname();
  const isAdmin = session.user.role === "ADMIN";

  const groups = NAV_GROUPS.map((group) => {
    const items = group.items.filter((item) => {
      // Only hide items that are specifically for admins
      // Show the user settings page to all users
      if (item.href === "/settings/user") {
        return true; // Always show user settings
      }
      // Otherwise, only show admin-only paths to admins
      return isAdmin || !ADMIN_ONLY_PATHS.has(item.href);
    });
    return { ...group, items };
  });

  return (
    <aside className="hidden w-64 flex-none border-r border-slate-200 bg-white pb-16 lg:block">
      <nav className="flex h-full flex-col gap-6 p-4">
        {groups.map((group) => (
          <div key={group.title} className="flex flex-col gap-2">
            <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {group.title}
            </p>
            {group.items.map((item) => {
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
          </div>
        ))}
      </nav>
    </aside>
  );
}
