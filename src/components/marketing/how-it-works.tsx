const steps = [
  {
    number: "01",
    title: "Apply and get onboarded",
    description:
      "Reach out and we will set up your account personally. No complicated forms or self-service setup — we walk you through everything in a short call.",
    detail: "Usually live within 24 hours",
  },
  {
    number: "02",
    title: "Your sales are recorded automatically",
    description:
      "Every order is tracked and logged in real time. Your portal updates the moment a sale happens — no manual entry, no spreadsheets.",
    detail: "Real-time order tracking",
  },
  {
    number: "03",
    title: "Watch your balance grow",
    description:
      "Log in anytime and see exactly what you have earned, broken down order by order. Your USD balance updates continuously as sales come in.",
    detail: "Full earnings transparency",
  },
  {
    number: "04",
    title: "Get paid — twice a month",
    description:
      "Two payouts per month are included free of charge, sent directly to your account in USD or AED. You always know the schedule in advance.",
    detail: "2 free payouts / month",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 sm:py-32 bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#1D9BF0]">
            How it works
          </p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            From your first sale to your first payout
          </h2>
          <p className="mt-5 text-lg text-slate-400">
            Simple by design. We handle the complexity so you can focus on what you do best.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-4xl">
          <div className="relative">
            <div className="absolute left-[23px] top-8 bottom-8 w-px bg-gradient-to-b from-[#0A5AFF] via-[#0A5AFF]/30 to-transparent hidden sm:block" />
            <div className="space-y-10">
              {steps.map((step) => (
                <div key={step.number} className="relative flex gap-8">
                  <div className="relative flex-shrink-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#0A5AFF]/30 bg-[#0A5AFF]/10 text-sm font-bold text-[#1D9BF0] font-mono">
                      {step.number}
                    </div>
                  </div>
                  <div className="pb-2 pt-1.5">
                    <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                    <p className="mt-2 text-base text-slate-400 leading-relaxed max-w-xl">
                      {step.description}
                    </p>
                    <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#1D9BF0]" />
                      <span className="text-xs font-medium text-slate-400">{step.detail}</span>
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
