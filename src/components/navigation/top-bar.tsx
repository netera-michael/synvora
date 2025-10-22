"use client";

import { signOut } from "next-auth/react";
import { Menu, Search, Bell } from "lucide-react";
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

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-8 print:hidden">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-synvora-primary hover:text-synvora-primary lg:hidden"
          onClick={onToggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden items-center gap-3 lg:flex">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-synvora-primary text-sm font-semibold text-white shadow-sm">
            S
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Synvora</p>
            <p className="text-xs text-slate-500">Admin</p>
          </div>
        </div>
      </div>

      <div className="flex max-w-md flex-1 items-center gap-3 px-4">
        <form className="relative flex w-full items-center" onSubmit={handleSubmit}>
          <Search className="absolute left-3 h-4 w-4 text-slate-400" />
          <input
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-sm text-slate-700 shadow-inner focus:border-synvora-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-synvora-primary/30"
            placeholder="Search orders, customers, drafts"
            value={searchValue}
            onChange={handleChange}
            onBlur={handleBlur}
          />
        </form>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-synvora-primary hover:text-synvora-primary"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute -right-1 -top-1 inline-flex h-2.5 w-2.5 rounded-full bg-rose-500"></span>
        </button>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-synvora-primary hover:text-synvora-primary"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-synvora-primary/10 text-xs font-semibold text-synvora-primary">
            {session.user.name?.[0]?.toUpperCase() ?? "S"}
          </span>
          <span>{session.user.name ?? session.user.email}</span>
        </button>
      </div>
    </header>
  );
}
