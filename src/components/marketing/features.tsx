import {
  RefreshCw,
  Building2,
  DollarSign,
  ClipboardCheck,
  Lock,
  BarChart2,
} from "lucide-react";

const features = [
  {
    icon: RefreshCw,
    title: "Shopify Order Sync",
    description:
      "Connect multiple Shopify stores and pull orders automatically. New orders land in your review queue — no manual exports or CSV imports.",
  },
  {
    icon: DollarSign,
    title: "Automatic EGP Pricing",
    description:
      "Set your product prices in Egyptian Pounds. Synvora fetches live USD/EGP and AED/EGP exchange rates and calculates each order's EGP value automatically.",
  },
  {
    icon: ClipboardCheck,
    title: "Import Queue",
    description:
      "Every incoming Shopify order passes through a review queue before it enters your system. Approve or ignore — you stay in control of what gets imported.",
  },
  {
    icon: Building2,
    title: "Multi-Venue Management",
    description:
      "Run multiple venues or locations from one account. Assign stores and orders to specific venues, with separate product catalogs and pricing per venue.",
  },
  {
    icon: Lock,
    title: "Encrypted Credentials",
    description:
      "Shopify API tokens are encrypted at rest using AES-256. Your credentials are never stored in plaintext — security is built into the data layer, not bolted on.",
  },
  {
    icon: BarChart2,
    title: "Order Tracking",
    description:
      "Track order status, financial status, and fulfillment across all stores and venues in a single unified dashboard with filtering and search.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#0A5AFF]">
            Platform features
          </p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Everything you need to manage Shopify orders locally
          </h2>
          <p className="mt-5 text-lg text-slate-500">
            Purpose-built for merchants in MENA who sell through Shopify but need to operate in local currency.
          </p>
        </div>

        {/* Grid */}
        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group relative flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-8 transition-all hover:border-[#0A5AFF]/20 hover:bg-white hover:shadow-lg hover:shadow-slate-900/5 hover:-translate-y-0.5"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#0A5AFF]/8 text-[#0A5AFF]">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-sm text-slate-500 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
