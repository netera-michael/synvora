const steps = [
  {
    number: "01",
    title: "Connect your Shopify store",
    description:
      "Add your store domain and Shopify API credentials. Synvora supports multiple stores — connect as many as you need. Credentials are encrypted and never exposed.",
    detail: "Settings → Shopify Stores → Add Store",
  },
  {
    number: "02",
    title: "Set your product prices in EGP",
    description:
      "Map each product with a local EGP price. Synvora uses these prices — not Shopify's USD prices — to calculate the correct Egyptian Pound amount for every order.",
    detail: "Products → Add Product → Set EGP price",
  },
  {
    number: "03",
    title: "Orders sync into your queue",
    description:
      "New Shopify orders appear in your import queue automatically. Review each order, check the calculated EGP value, and approve what should enter your system.",
    detail: "Orders → Pending Imports → Review & Approve",
  },
  {
    number: "04",
    title: "Manage across all venues",
    description:
      "Imported orders are assigned to a venue and tracked in a unified dashboard. Filter by status, store, amount, or date — everything in one place.",
    detail: "Orders → All Orders → Filter & Track",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 sm:py-32 bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#1D9BF0]">
            How it works
          </p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            From Shopify to EGP in four steps
          </h2>
          <p className="mt-5 text-lg text-slate-400">
            No complex setup. No ongoing manual work. Once configured, Synvora handles the sync automatically.
          </p>
        </div>

        {/* Steps */}
        <div className="mx-auto mt-16 max-w-4xl">
          <div className="relative">
            {/* Connector line */}
            <div className="absolute left-[23px] top-8 bottom-8 w-px bg-gradient-to-b from-[#0A5AFF] via-[#0A5AFF]/30 to-transparent hidden sm:block" />

            <div className="space-y-10">
              {steps.map((step, index) => (
                <div key={step.number} className="relative flex gap-8">
                  {/* Step number */}
                  <div className="relative flex-shrink-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#0A5AFF]/30 bg-[#0A5AFF]/10 text-sm font-bold text-[#1D9BF0] font-mono">
                      {step.number}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="pb-2 pt-1.5">
                    <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                    <p className="mt-2 text-base text-slate-400 leading-relaxed max-w-xl">
                      {step.description}
                    </p>
                    <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5">
                      <code className="text-xs font-mono text-slate-400">{step.detail}</code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
