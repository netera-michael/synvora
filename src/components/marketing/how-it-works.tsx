"use client";

import { UserPlus, Link2, Rocket, TrendingUp } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Sign Up",
    description: "Create your Synvora account in minutes. No credit card required to get started.",
    image: "gradient-1"
  },
  {
    number: "02",
    icon: Link2,
    title: "Set Up Your Store",
    description: "Configure your online store with our intuitive setup wizard and start adding products.",
    image: "gradient-2"
  },
  {
    number: "03",
    icon: Rocket,
    title: "Start Selling",
    description: "Begin accepting orders and payments through our white-labeled platform.",
    image: "gradient-3"
  },
  {
    number: "04",
    icon: TrendingUp,
    title: "Grow Your Business",
    description: "Scale effortlessly with our analytics, automation, and support.",
    image: "gradient-4"
  }
];

export function HowItWorks() {
  return (
    <section className="relative py-20 sm:py-32 bg-gradient-to-b from-white to-synvora.surface">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center animate-fade-in-up">
          <h2 className="text-base font-semibold text-synvora-primary">Simple process</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            How Synvora works
          </p>
          <p className="mt-6 text-lg text-slate-600">
            Get started in four simple steps and start selling globally with confidence.
          </p>
        </div>

        {/* Steps */}
        <div className="mx-auto mt-16 max-w-5xl sm:mt-20 lg:mt-24">
          <div className="space-y-16">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isEven = index % 2 === 0;

              return (
                <div
                  key={step.number}
                  className="relative animate-fade-in-up"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <div className={`grid gap-8 lg:grid-cols-2 lg:gap-16 items-center ${isEven ? '' : 'lg:flex-row-reverse'}`}>
                    {/* Content */}
                    <div className={`${isEven ? '' : 'lg:order-2'} relative`}>
                      <div className="space-y-4">
                        {/* Step number badge */}
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white border-4 border-synvora-primary/20 shadow-lg">
                          <span className="text-2xl font-bold bg-gradient-to-br from-synvora-primary to-synvora-accent bg-clip-text text-transparent">
                            {step.number}
                          </span>
                        </div>

                        <div className="inline-flex rounded-xl bg-gradient-to-br from-synvora-primary to-synvora-accent p-3 shadow-lg">
                          <Icon className="h-6 w-6 text-white" />
                        </div>

                        <h3 className="text-2xl font-bold text-slate-900">
                          {step.title}
                        </h3>
                        <p className="text-lg text-slate-600 leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>

                    {/* Visual */}
                    <div className={`${isEven ? '' : 'lg:order-1'}`}>
                      <div className="relative rounded-2xl bg-gradient-to-br from-synvora-primary/10 via-synvora-accent/10 to-transparent p-8 shadow-xl border border-synvora-primary/20 overflow-hidden group">
                        {/* Animated background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-synvora-primary/5 to-synvora-accent/5 animate-pulse" />

                        <div className="relative h-48 flex items-center justify-center">
                          {/* Placeholder for images - you can replace with actual images */}
                          <div className={`h-32 w-32 rounded-full bg-gradient-to-br ${
                            index === 0 ? 'from-blue-400 to-cyan-400' :
                            index === 1 ? 'from-purple-400 to-pink-400' :
                            index === 2 ? 'from-green-400 to-emerald-400' :
                            'from-orange-400 to-red-400'
                          } shadow-2xl animate-float`}
                          style={{ animationDelay: `${index * 200}ms` }}
                          >
                            <div className="h-full w-full flex items-center justify-center">
                              <Icon className="h-16 w-16 text-white" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
