"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const navigation = [
  { name: "Features", href: "#features" },
  { name: "How it Works", href: "#how-it-works" },
  { name: "Testimonials", href: "#testimonials" },
  { name: "Pricing", href: "#pricing" }
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50 shadow-sm">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-synvora-primary to-synvora-accent text-white font-bold transition-transform group-hover:scale-110">
                S
              </div>
              <span className="text-xl font-bold text-slate-900">Synvora</span>
            </Link>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex md:items-center md:gap-8">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-sm font-medium text-slate-700 hover:text-synvora-primary transition-colors"
              >
                {item.name}
              </a>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="flex items-center gap-4">
            <Link
              href="/admin/login"
              className="hidden sm:inline-flex text-sm font-medium text-slate-700 hover:text-synvora-primary transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/admin/login"
              className="inline-flex items-center justify-center rounded-lg bg-synvora-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-synvora-primary/90 hover:shadow-md"
            >
              Get Started
            </Link>

            {/* Mobile menu button */}
            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center rounded-lg p-2 text-slate-700 hover:bg-slate-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Open menu</span>
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-200 mt-2 animate-fade-in">
            <div className="space-y-1">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-100 hover:text-synvora-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </a>
              ))}
              <Link
                href="/admin/login"
                className="block rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-100 hover:text-synvora-primary transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
