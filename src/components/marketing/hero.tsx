"use client";

import Link from "next/link";
import { ArrowRight, TrendingUp, DollarSign, Globe } from "lucide-react";

const mockOrders = [
  { number: "#1042", customer: "Nour K.", amount: "$201.40", status: "Paid", color: "bg-emerald-500/20 text-emerald-400" },
  { number: "#1041", customer: "Omar F.", amount: "$514.00", status: "Paid", color: "bg-emerald-500/20 text-emerald-400" },
  { number: "#1040", customer: "Salma A.", amount: "$298.50", status: "Pending", color: "bg-amber-500/20 text-amber-400" },
  { number: "#1039", customer: "Karim H.", amount: "$400.20", status: "Paid", color: "bg-emerald-500/20 text-emerald-400" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-slate-950">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-72 w-[600px] bg-[#0A5AFF]/20 blur-[96px] rounded-full" />

      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-36">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-12 items-center">

          {/* Left — copy */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300 mb-8">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0A5AFF]" />
              Invite-only · Now accepting partners
            </div>

            <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl leading-[1.08]">
              Get paid in USD.{" "}
              <span className="text-[#1D9BF0]">Sell to the world.</span>
            </h1>

            <p className="mt-6 text-lg text-slate-400 leading-relaxed max-w-lg">
              Synvora enables businesses to accept international payments and receive hard-currency payouts — with full visibility into every order and every dirham earned.
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

            <div className="mt-12 grid grid-cols-3 gap-6 border-t border-white/10 pt-8">
              {[
                { icon: DollarSign, label: "Payout currencies", value: "USD · AED" },
                { icon: Globe,      label: "Market reach",      value: "International" },
                { icon: TrendingUp, label: "Payouts included",  value: "2 / month free" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label}>
                  <Icon className="h-4 w-4 text-[#1D9BF0] mb-2" />
                  <div className="text-sm font-semibold text-white">{value}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Portal mockup */}
          <div className="relative">
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
                    portal.synvora.us
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Balance card */}
                <div className="rounded-xl bg-[#0A5AFF]/15 border border-[#0A5AFF]/20 px-5 py-4">
                  <div className="text-xs font-medium text-[#1D9BF0] uppercase tracking-wide">Pending Balance</div>
                  <div className="text-3xl font-bold text-white mt-1">$2,847.60</div>
                  <div className="text-xs text-slate-400 mt-1">Next payout · Feb 15</div>
                </div>

                {/* Orders */}
                <div className="rounded-xl border border-white/5 overflow-hidden">
                  <div className="bg-white/5 px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Recent orders
                  </div>
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-white/5">
                      {mockOrders.map((order) => (
                        <tr key={order.number} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-2.5 font-mono font-medium text-slate-300">{order.number}</td>
                          <td className="px-4 py-2.5 text-slate-400">{order.customer}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-white">{order.amount}</td>
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
              </div>
            </div>

            {/* Floating card — payout sent */}
            <div className="absolute -top-4 -right-4 hidden xl:flex items-center gap-2.5 rounded-xl bg-white shadow-xl shadow-black/20 border border-slate-100 px-4 py-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-900">Payout sent</div>
                <div className="text-xs text-slate-500">$2,450.00 · USD</div>
              </div>
            </div>

            {/* Floating card — this month */}
            <div className="absolute -bottom-4 -left-4 hidden xl:block rounded-xl bg-white shadow-xl shadow-black/20 border border-slate-100 px-4 py-3">
              <div className="text-xs text-slate-500">This month</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">$4,210.00</div>
              <div className="text-xs text-emerald-600 font-medium mt-0.5">↑ 18% vs last month</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
