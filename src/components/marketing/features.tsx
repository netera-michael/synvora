"use client";

import { ShoppingCart, CreditCard, Globe2, BarChart3, Shield, Zap } from "lucide-react";

const features = [
  {
    icon: ShoppingCart,
    title: "Complete Order Management",
    description: "Seamlessly manage orders from creation to fulfillment with our intuitive dashboard.",
    color: "from-blue-500 to-cyan-500"
  },
  {
    icon: CreditCard,
    title: "Payment Processing",
    description: "Accept payments in regions where Shopify Payments isn't available—all under your brand.",
    color: "from-purple-500 to-pink-500"
  },
  {
    icon: Globe2,
    title: "Shopify Synchronization",
    description: "Real-time sync with Shopify stores. Import orders, products, and customer data automatically.",
    color: "from-green-500 to-emerald-500"
  },
  {
    icon: BarChart3,
    title: "Analytics & Reporting",
    description: "Track revenue, monitor performance, and make data-driven decisions with powerful insights.",
    color: "from-orange-500 to-red-500"
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-level security with encrypted data, role-based access, and compliance certifications.",
    color: "from-indigo-500 to-purple-500"
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Built on modern infrastructure for instant page loads and real-time updates.",
    color: "from-yellow-500 to-orange-500"
  }
];

export function Features() {
  return (
    <section className="relative py-20 sm:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center animate-fade-in-up">
          <h2 className="text-base font-semibold text-synvora-primary">Everything you need</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Built for modern commerce
          </p>
          <p className="mt-6 text-lg text-slate-600">
            All the tools you need to run and grow your online business, powered by Shopify's infrastructure.
          </p>
        </div>

        {/* Features grid */}
        <div className="mx-auto mt-16 max-w-7xl sm:mt-20 lg:mt-24">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-xl hover:shadow-slate-900/5 hover:-translate-y-1 animate-fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Gradient background on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-synvora-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                  <div className="relative">
                    {/* Icon */}
                    <div className={`inline-flex rounded-xl bg-gradient-to-br ${feature.color} p-3 shadow-lg`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>

                    {/* Content */}
                    <h3 className="mt-6 text-xl font-semibold text-slate-900">
                      {feature.title}
                    </h3>
                    <p className="mt-3 text-base text-slate-600 leading-relaxed">
                      {feature.description}
                    </p>

                    {/* Decorative element */}
                    <div className={`mt-6 h-1 w-12 rounded-full bg-gradient-to-r ${feature.color} transform scale-x-0 transition-transform group-hover:scale-x-100`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center animate-fade-in-up">
          <a
            href="#"
            className="inline-flex items-center text-sm font-semibold text-synvora-primary hover:text-synvora-primary/80 transition-colors"
          >
            View all features
            <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
