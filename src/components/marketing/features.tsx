import { DollarSign, Globe, CalendarCheck, LayoutDashboard, Eye, HeadphonesIcon } from "lucide-react";

const features = [
  {
    icon: DollarSign,
    title: "Get paid in USD or AED",
    description:
      "Receive hard-currency payouts directly — regardless of local banking restrictions. No currency headaches, no manual conversions.",
  },
  {
    icon: Globe,
    title: "Unlock international markets",
    description:
      "Open your business to buyers worldwide. Accept payments from customers in any country and stop being limited by geography.",
  },
  {
    icon: CalendarCheck,
    title: "2 free payouts per month",
    description:
      "Two scheduled payouts are included every month at no extra cost. Know exactly when to expect your money — no chasing, no surprises.",
  },
  {
    icon: Eye,
    title: "Full transparency",
    description:
      "Every order that contributes to your balance is fully itemized. See what came in, what was deducted, and what you are owed — at any time.",
  },
  {
    icon: LayoutDashboard,
    title: "Dedicated client portal",
    description:
      "Your private dashboard shows your live balance, full payout history, and order records in one clean place — accessible 24/7.",
  },
  {
    icon: HeadphonesIcon,
    title: "Hands-on onboarding",
    description:
      "We set everything up for you personally. No self-service forms, no lengthy docs — just a short onboarding call and you are live.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 sm:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#0A5AFF]">
            Why Synvora
          </p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Everything you need to get paid globally
          </h2>
          <p className="mt-5 text-lg text-slate-500">
            Built for businesses that sell internationally and need reliable, transparent payouts in hard currency.
          </p>
        </div>

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
