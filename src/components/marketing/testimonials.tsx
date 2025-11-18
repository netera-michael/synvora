"use client";

import { Star } from "lucide-react";

const testimonials = [
  {
    content: "Synvora transformed how we manage our e-commerce business. The platform is seamless, and we can finally accept payments in our region without limitations.",
    author: "Sarah Johnson",
    role: "CEO, Fashion Forward",
    avatar: "gradient-1",
    rating: 5
  },
  {
    content: "The white-label solution was exactly what we needed. Our customers think it's our own platform, while we leverage enterprise-grade infrastructure behind the scenes.",
    author: "Michael Chen",
    role: "Founder, Tech Gadgets Hub",
    avatar: "gradient-2",
    rating: 5
  },
  {
    content: "Outstanding support and reliability. We've processed thousands of orders through Synvora, and the analytics help us make smarter business decisions every day.",
    author: "Aisha Rahman",
    role: "Operations Manager, Global Artisans",
    avatar: "gradient-3",
    rating: 5
  }
];

const stats = [
  { value: "1000+", label: "Active Merchants" },
  { value: "$50M+", label: "Orders Processed" },
  { value: "99.9%", label: "Uptime" },
  { value: "24/7", label: "Support" }
];

export function Testimonials() {
  return (
    <section className="relative py-20 sm:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Stats bar */}
        <div className="mx-auto max-w-5xl animate-fade-in-up">
          <div className="rounded-2xl bg-gradient-to-br from-synvora-primary to-synvora-accent p-8 shadow-2xl shadow-synvora-primary/20">
            <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
              {stats.map((stat, index) => (
                <div
                  key={stat.label}
                  className="text-center animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="text-4xl font-bold text-white sm:text-5xl">
                    {stat.value}
                  </div>
                  <div className="mt-2 text-sm text-white/80 font-medium">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center mt-20 animate-fade-in-up">
          <h2 className="text-base font-semibold text-synvora-primary">Testimonials</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Loved by merchants worldwide
          </p>
          <p className="mt-6 text-lg text-slate-600">
            See what our customers have to say about their experience with Synvora.
          </p>
        </div>

        {/* Testimonials grid */}
        <div className="mx-auto mt-16 max-w-7xl sm:mt-20">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <div
                key={testimonial.author}
                className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:shadow-xl hover:shadow-slate-900/5 hover:-translate-y-1 animate-fade-in-up"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {/* Quote mark */}
                <div className="absolute -top-4 -right-4 text-8xl text-synvora-primary/5 font-serif">
                  &ldquo;
                </div>

                <div className="relative">
                  {/* Rating */}
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>

                  {/* Content */}
                  <p className="text-base text-slate-700 leading-relaxed">
                    &ldquo;{testimonial.content}&rdquo;
                  </p>

                  {/* Author */}
                  <div className="mt-6 flex items-center gap-3">
                    <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${
                      index === 0 ? 'from-blue-500 to-cyan-500' :
                      index === 1 ? 'from-purple-500 to-pink-500' :
                      'from-green-500 to-emerald-500'
                    } flex items-center justify-center text-white font-bold text-lg`}>
                      {testimonial.author.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">
                        {testimonial.author}
                      </div>
                      <div className="text-sm text-slate-600">
                        {testimonial.role}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust badges */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-8 opacity-60 animate-fade-in-up">
          {["Stripe", "PayPal", "AWS", "Cloudflare"].map((brand) => (
            <div
              key={brand}
              className="text-xl font-bold text-slate-400"
            >
              {brand}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
