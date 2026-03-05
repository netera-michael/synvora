"use client";

import Link from "next/link";
import { ArrowRight, ShoppingBag, TrendingUp, Clock } from "lucide-react";

const mockOrders = [
  { number: "#1042", customer: "Nour Khalil", egp: "EGP 4,820", usd: "$98.40", status: "Paid", color: "bg-emerald-100 text-emerald-700" },
  { number: "#1041", customer: "Omar Farouk", egp: "EGP 12,300", usd: "$251.00", status: "Paid", color: "bg-emerald-100 text-emerald-700" },
  { number: "#1040", customer: "Salma Adel", egp: "EGP 7,150", usd: "$145.90", status: "Pending", color: "bg-amber-100 text-amber-700" },
  { number: "#1039", customer: "Karim Hassan", egp: "EGP 9,600", usd: "$195.90", status: "Paid", color: "bg-emerald-100 text-emerald-700" },
  { number: "#1038", customer: "Dina Mostafa", egp: "EGP 3,430", usd: "$70.00", status: "Refunded", color: "bg-slate-100 text-slate-600" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-slate-950">
      {/* Subtle grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:48px_48px]" />
      {/* Blue glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-72 w-[600px] bg-[#0A5AFF]/20 blur-[96px] rounded-full" />

      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-36">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-12 items-center">

          {/* Left — copy */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300 mb-8">
              <span className="h-1.5 w-1.5 rounded-full bg-[#1D9BF0]" />
              Built for Shopify merchants in MENA
            </div>

            <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl leading-[1.08]">
              Sell globally.{" "}
              <span className="text-[#1D9BF0]">Manage locally.</span>
            </h1>

            <p className="mt-6 text-lg text-slate-400 leading-relaxed max-w-lg">
              Synvora connects your Shopify stores to a single dashboard — syncing orders, converting currencies, and calculating EGP prices automatically. No spreadsheets, no manual work.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href="mailto:hello@synvora.us"
                className="group inline-flex items-center justify-center rounded-xl bg-[#0A5AFF] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#0A5AFF]/30 transition-all hover:bg-[#0847cc] hover:-translate-y-px"
              >
                Request access
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/admin/login"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-7 py-3.5 text-sm font-semibold text-slate-300 transition-all hover:bg-white/10 hover:text-white hover:-translate-y-px"
              >
                Sign in
              </Link>
            </div>

            {/* Quick stats — only real ones */}
            <div className="mt-12 grid grid-cols-3 gap-6 border-t border-white/10 pt-8">
              {[
                { icon: ShoppingBag, label: "Shopify stores", value: "Multi-store" },
                { icon: TrendingUp, label: "Currency support", value: "USD · AED · EGP" },
                { icon: Clock, label: "Order sync", value: "Real-time" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label}>
                  <Icon className="h-4 w-4 text-[#1D9BF0] mb-2" />
                  <div className="text-sm font-semibold text-white">{value}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Dashboard mockup */}
          <div className="relative">
            {/* Browser chrome */}
            <div className="rounded-2xl bg-slate-900 border border-white/10 shadow-2xl shadow-black/60 overflow-hidden">
              {/* Title bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-slate-800/50">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-slate-700" />
                  <div className="h-3 w-3 rounded-full bg-slate-700" />
                  <div className="h-3 w-3 rounded-full bg-slate-700" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="flex items-center gap-1.5 rounded-md bg-slate-700/50 px-3 py-1 text-xs text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    admin.synvora.us/orders
                  </div>
                </div>
              </div>

              {/* Dashboard content */}
              <div className="p-5 space-y-4">
                {/* Top bar */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-slate-400 uppercase tracking-wide">Orders · Venue Cairo</div>
                    <div className="text-lg font-semibold text-white mt-0.5">5 recent orders</div>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg bg-[#0A5AFF]/20 border border-[#0A5AFF]/30 px-3 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#1D9BF0] animate-pulse" />
                    <span className="text-xs font-medium text-[#1D9BF0]">Live</span>
                  </div>
                </div>

                {/* Orders table */}
                <div className="rounded-xl border border-white/5 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-white/5 text-slate-500 text-left">
                        <th className="px-4 py-2.5 font-medium">Order</th>
                        <th className="px-4 py-2.5 font-medium">Customer</th>
                        <th className="px-4 py-2.5 font-medium text-right">EGP</th>
                        <th className="px-4 py-2.5 font-medium text-right">USD</th>
                        <th className="px-4 py-2.5 font-medium text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {mockOrders.map((order) => (
                        <tr key={order.number} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-2.5 font-mono font-medium text-slate-300">{order.number}</td>
                          <td className="px-4 py-2.5 text-slate-400">{order.customer}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-white">{order.egp}</td>
                          <td className="px-4 py-2.5 text-right text-slate-500">{order.usd}</td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${order.color}`}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Exchange rate bar */}
                <div className="flex items-center justify-between rounded-lg bg-white/5 border border-white/5 px-4 py-2.5">
                  <span className="text-xs text-slate-400">Live exchange rate</span>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="text-slate-300">1 USD = <span className="text-white font-semibold">49.02 EGP</span></span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-300">1 AED = <span className="text-white font-semibold">13.35 EGP</span></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating card — Shopify sync */}
            <div className="absolute -top-4 -right-4 hidden xl:flex items-center gap-2.5 rounded-xl bg-white shadow-xl shadow-black/20 border border-slate-100 px-4 py-3">
              <div className="h-8 w-8 rounded-lg bg-[#96BF48] flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-900">Shopify synced</div>
                <div className="text-xs text-slate-500">3 stores connected</div>
              </div>
            </div>

            {/* Floating card — auto calc */}
            <div className="absolute -bottom-4 -left-4 hidden xl:block rounded-xl bg-white shadow-xl shadow-black/20 border border-slate-100 px-4 py-3">
              <div className="text-xs text-slate-500">Auto-calculated</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">EGP 33,900</div>
              <div className="text-xs text-emerald-600 font-medium mt-0.5">↑ from 3 orders today</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
