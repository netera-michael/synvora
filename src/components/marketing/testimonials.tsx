import { ShoppingBag, Banknote, ArrowLeftRight } from "lucide-react";

const integrations = [
  {
    name: "Shopify",
    description: "Connect any Shopify store. Synvora uses the Shopify Admin API to pull orders, products, and customer data on demand.",
    icon: ShoppingBag,
    color: "bg-[#96BF48]/10 text-[#5a8a00] border-[#96BF48]/20",
    badge: "Connected",
  },
  {
    name: "Mercury Bank",
    description: "Match bank transactions from Mercury directly against your imported orders for reconciliation and payout tracking.",
    icon: Banknote,
    color: "bg-violet-50 text-violet-700 border-violet-200",
    badge: "Connected",
  },
  {
    name: "Exchange Rate API",
    description: "Live USD/EGP and AED/EGP exchange rates fetched automatically and cached — so your EGP amounts are always accurate.",
    icon: ArrowLeftRight,
    color: "bg-sky-50 text-sky-700 border-sky-200",
    badge: "Auto-updated",
  },
];

export function Testimonials() {
  return (
    <section id="integrations" className="py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#0A5AFF]">
            Integrations
          </p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Connects to the tools you already use
          </h2>
          <p className="mt-5 text-lg text-slate-500">
            Synvora doesn't replace your stack — it sits on top of it, pulling in data so you don't have to.
          </p>
        </div>

        {/* Integration cards */}
        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-3">
          {integrations.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.name}
                className="flex flex-col gap-5 rounded-2xl border border-slate-100 bg-slate-50/50 p-8"
              >
                <div className="flex items-start justify-between">
                  <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border ${item.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {item.badge}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{item.name}</h3>
                  <p className="mt-2 text-sm text-slate-500 leading-relaxed">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom note */}
        <p className="mt-10 text-center text-sm text-slate-400">
          More integrations in progress. Have a specific request?{" "}
          <a href="mailto:hello@synvora.us" className="font-medium text-[#0A5AFF] hover:underline">
            Let us know.
          </a>
        </p>
      </div>
    </section>
  );
}
