"use client";

import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { useState } from "react";

export function Hero() {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-synvora.surface via-white to-white">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-synvora-primary/5 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-synvora-accent/5 blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Left column - Text content */}
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center rounded-full bg-synvora-primary/10 px-4 py-1.5 text-sm font-medium text-synvora-primary mb-6">
              <span className="mr-2 h-2 w-2 rounded-full bg-synvora-primary animate-pulse" />
              White-label Shopify Platform
            </div>

            <h1 className="text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
              Sell anywhere with{" "}
              <span className="bg-gradient-to-r from-synvora-primary to-synvora-accent bg-clip-text text-transparent">
                Synvora
              </span>
            </h1>

            <p className="mt-6 text-xl text-slate-600 leading-relaxed">
              Access Shopify&apos;s powerful commerce platform in regions without native payment support.
              Manage your store, track orders, and grow your business—all under your brand.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:gap-6">
              <Link
                href="/admin/login"
                className="group inline-flex items-center justify-center rounded-xl bg-synvora-primary px-8 py-4 text-base font-semibold text-white shadow-lg shadow-synvora-primary/30 transition-all hover:bg-synvora-primary/90 hover:shadow-xl hover:shadow-synvora-primary/40 hover:-translate-y-0.5"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>

              <button
                onClick={() => setIsVideoPlaying(true)}
                className="group inline-flex items-center justify-center rounded-xl border-2 border-slate-200 bg-white px-8 py-4 text-base font-semibold text-slate-900 transition-all hover:border-synvora-primary hover:text-synvora-primary hover:-translate-y-0.5"
              >
                <Play className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" />
                Watch Demo
              </button>
            </div>

            {/* Trust indicators */}
            <div className="mt-12 flex flex-wrap items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-8 w-8 rounded-full border-2 border-white bg-gradient-to-br from-synvora-primary to-synvora-accent"
                    />
                  ))}
                </div>
                <span className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">1000+</span> merchants trust us
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex text-yellow-400">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <svg key={i} className="h-5 w-5 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm font-semibold text-slate-900">4.9/5</span>
              </div>
            </div>
          </div>

          {/* Right column - Visual */}
          <div className="relative animate-fade-in-right">
            {/* Dashboard preview mockup */}
            <div className="relative rounded-2xl bg-white shadow-2xl shadow-slate-900/10 ring-1 ring-slate-900/5 overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 flex items-center gap-2 border-b border-slate-200">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="bg-white rounded px-3 py-1 text-xs text-slate-600 border border-slate-200">
                    admin.synvora.us
                  </div>
                </div>
              </div>

              {/* Mock dashboard content */}
              <div className="p-6 bg-gradient-to-br from-slate-50 to-white">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-8 w-32 bg-gradient-to-r from-synvora-primary to-synvora-accent rounded animate-pulse" />
                    <div className="h-8 w-24 bg-slate-200 rounded animate-pulse delay-300" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm animate-fade-in"
                        style={{ animationDelay: `${i * 100}ms` }}
                      >
                        <div className="h-4 w-20 bg-slate-200 rounded mb-2" />
                        <div className="h-8 w-24 bg-synvora-primary/20 rounded" />
                      </div>
                    ))}
                  </div>

                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 animate-fade-in" style={{ animationDelay: `${i * 150}ms` }}>
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-synvora-primary/20 to-synvora-accent/20" />
                        <div className="flex-1 space-y-1">
                          <div className="h-3 w-32 bg-slate-200 rounded" />
                          <div className="h-2 w-24 bg-slate-100 rounded" />
                        </div>
                        <div className="h-6 w-16 bg-green-100 rounded" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badges */}
            <div className="absolute -top-6 -left-6 bg-white rounded-xl shadow-lg shadow-slate-900/10 px-4 py-3 border border-slate-200 animate-float">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-semibold text-slate-900">Orders Syncing</span>
              </div>
            </div>

            <div className="absolute -bottom-6 -right-6 bg-white rounded-xl shadow-lg shadow-slate-900/10 px-4 py-3 border border-slate-200 animate-float delay-1000">
              <div className="text-sm text-slate-600">Revenue</div>
              <div className="text-2xl font-bold text-synvora-primary">+32%</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
