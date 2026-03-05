import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";

export function CTA() {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden bg-[#0A5AFF]">
      {/* Subtle dot grid */}
      <div className="absolute inset-0 bg-[radial-gradient(circle,#ffffff18_1px,transparent_1px)] bg-[size:28px_28px]" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#0847cc] via-transparent to-[#1D9BF0]/30" />

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Ready to simplify your order operations?
        </h2>
        <p className="mt-5 text-lg text-white/80 leading-relaxed max-w-2xl mx-auto">
          Synvora is currently available by invitation. Reach out and we&apos;ll get you set up — usually within 24 hours.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a
            href="mailto:hello@synvora.us"
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-[#0A5AFF] shadow-xl shadow-black/20 transition-all hover:shadow-2xl hover:-translate-y-px"
          >
            <Mail className="h-4 w-4" />
            hello@synvora.us
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
          <Link
            href="/admin/login"
            className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/10 backdrop-blur-sm px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/20 hover:-translate-y-px"
          >
            Sign in to your account
          </Link>
        </div>

        <p className="mt-8 text-sm text-white/50">
          No commitment required. We&apos;ll walk you through setup personally.
        </p>
      </div>
    </section>
  );
}
