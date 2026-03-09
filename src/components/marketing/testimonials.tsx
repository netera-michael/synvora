const stats = [
  {
    value: "USD & AED",
    label: "Payout currencies",
    description: "Receive your earnings in US dollars or UAE dirhams — stable, internationally accepted hard currencies.",
  },
  {
    value: "2×",
    label: "Free payouts monthly",
    description: "Two scheduled payouts every month, included at no extra cost. Always on time, always transparent.",
  },
  {
    value: "Real-time",
    label: "Balance updates",
    description: "Your dashboard reflects every order the moment it is recorded. No delays, no end-of-month surprises.",
  },
  {
    value: "Invite-only",
    label: "Curated access",
    description: "We work with a select group of partners to ensure every client gets personal, attentive service.",
  },
];

export function Testimonials() {
  return (
    <section id="why" className="py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#0A5AFF]">
            The Synvora difference
          </p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Built around your interests
          </h2>
          <p className="mt-5 text-lg text-slate-500">
            We built Synvora because the tools that existed weren&apos;t built with our clients&apos; real needs in mind. Transparency and reliability are not features here — they are the foundation.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((item) => (
            <div
              key={item.value}
              className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-8 text-center"
            >
              <div className="text-3xl font-bold text-[#0A5AFF]">{item.value}</div>
              <div className="text-sm font-semibold text-slate-900">{item.label}</div>
              <p className="text-xs text-slate-500 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
