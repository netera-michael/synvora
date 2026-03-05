"use client";

import { signOut } from "next-auth/react";
import { Menu, Search, Bell, LogOut } from "lucide-react";
import type { Session } from "next-auth";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { Route } from "next";

type TopBarProps = {
  session: Session;
  onToggleSidebar?: () => void;
};

export function TopBar({ session, onToggleSidebar }: TopBarProps) {
  const [searchValue, setSearchValue] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const current = searchParams.get("search") ?? "";
    setSearchValue(current);
  }, [searchParams]);

  const applySearch = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = value.trim();

    if (trimmed) {
      params.set("search", trimmed);
      params.delete("page");
    } else {
      params.delete("search");
      params.delete("page");
    }

    const qs = params.toString();
    const target = qs ? `${pathname}?${qs}` : pathname;
    router.replace(target as Route);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applySearch(searchValue);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchValue(value);
  };

  const handleBlur = () => {
    if (!searchValue.trim() && searchParams.get("search")) {
      applySearch("");
    }
  };

  const [notificationCount, setNotificationCount] = useState(0); // Initially no notifications

  return (
    <header className="flex h-16 items-center justify-between border-b border-synvora-border bg-white px-4 lg:px-8 print:hidden">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-synvora-border text-synvora-text-secondary transition hover:bg-synvora-surface-hover hover:text-synvora-text lg:hidden"
          onClick={onToggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden items-center gap-3 lg:flex">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-synvora-primary text-sm font-semibold text-white shadow-sm">
            S
          </div>
          <div>
            <p className="text-sm font-semibold text-synvora-text">Synvora</p>
            <p className="text-xs text-synvora-text-secondary">Admin</p>
          </div>
        </div>
      </div>

      <div className="flex max-w-md flex-1 items-center gap-3 px-4">
        <form className="relative flex w-full items-center" onSubmit={handleSubmit}>
          <Search className="absolute left-3 h-4 w-4 text-synvora-text-secondary" />
          <input
            className="w-full rounded-lg border border-synvora-border bg-synvora-surface py-2 pl-10 pr-3 text-sm text-synvora-text shadow-inner focus:border-synvora-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-synvora-primary"
            placeholder="Search orders, customers, drafts"
            value={searchValue}
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </form>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-synvora-text-secondary transition hover:bg-synvora-surface-hover hover:text-synvora-text"
          onClick={() => {
            // TODO: notification panel
          }}
        >
          <Bell className="h-4 w-4" />
          {notificationCount > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
          )}
        </button>
        <div className="h-6 w-px bg-synvora-border" />
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-synvora-text-secondary transition hover:bg-synvora-surface-hover hover:text-synvora-text"
        >
          <span className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-md bg-synvora-primary text-xs font-bold text-white">
            {session.user.name?.[0]?.toUpperCase() ?? "S"}
          </span>
          <span className="hidden max-w-[120px] truncate sm:block">{session.user.name ?? session.user.email}</span>
          <LogOut className="h-3.5 w-3.5 opacity-50 transition group-hover:opacity-100" />
        </button>
      </div>
    </header>
  );
}
