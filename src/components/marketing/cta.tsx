"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const benefits = [
  "No setup fees or hidden charges",
  "14-day free trial included",
  "Cancel anytime, no questions asked",
  "Dedicated onboarding support"
];

export function CTA() {
  return (
    <section className="relative py-20 sm:py-32 overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-synvora-primary via-synvora-accent to-synvora-primary">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
      </div>

      {/* Animated shapes */}
      <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-white/10 blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-white/10 blur-3xl animate-pulse delay-1000" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl animate-fade-in-up">
            Ready to start selling globally?
          </h2>
          <p className="mt-6 text-xl text-white/90 leading-relaxed animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            Join thousands of merchants who trust Synvora to power their e-commerce business.
            Start your free trial today—no credit card required.
          </p>

          {/* Benefits list */}
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 text-left max-w-2xl mx-auto">
            {benefits.map((benefit, index) => (
              <div
                key={benefit}
                className="flex items-center gap-3 text-white/90 animate-fade-in-up"
                style={{ animationDelay: `${(index + 2) * 100}ms` }}
              >
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                <span className="text-base">{benefit}</span>
              </div>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:justify-center sm:gap-6 animate-fade-in-up" style={{ animationDelay: "600ms" }}>
            <Link
              href="/admin/login"
              className="group inline-flex items-center justify-center rounded-xl bg-white px-8 py-4 text-base font-semibold text-synvora-primary shadow-xl shadow-black/20 transition-all hover:shadow-2xl hover:shadow-black/30 hover:-translate-y-0.5"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              href="#features"
              className="group inline-flex items-center justify-center rounded-xl border-2 border-white/30 bg-white/10 backdrop-blur-sm px-8 py-4 text-base font-semibold text-white transition-all hover:bg-white/20 hover:border-white/50 hover:-translate-y-0.5"
            >
              Learn More
            </Link>
          </div>

          {/* Trust line */}
          <p className="mt-8 text-sm text-white/70 animate-fade-in-up" style={{ animationDelay: "700ms" }}>
            Trusted by 1000+ merchants • Processing $50M+ in orders annually
          </p>
        </div>
      </div>
    </section>
  );
}
