import Link from "next/link";
import { Mail } from "lucide-react";
import { SynvoraLogo } from "@/components/ui/logo";

const links = {
  product: [
    { name: "Why Synvora", href: "#features" },
    { name: "How it Works", href: "#how-it-works" },
    { name: "Request access", href: "mailto:hello@synvora.us" },
  ],
  account: [
    { name: "Sign in", href: "/admin/login" },
    { name: "Contact us", href: "mailto:hello@synvora.us" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-white/5">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2 space-y-5">
            <Link href="/">
              <SynvoraLogo size={32} dark />
            </Link>
            <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
              The platform for businesses that sell globally and get paid in hard currency — with full transparency and no surprises.
            </p>
            <a
              href="mailto:hello@synvora.us"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#1D9BF0] hover:text-[#1D9BF0]/80 transition-colors"
            >
              <Mail className="h-4 w-4" />
              hello@synvora.us
            </a>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Product</h3>
            <ul className="mt-4 space-y-3">
              {links.product.map((item) => (
                <li key={item.name}>
                  <a href={item.href} className="text-sm text-slate-500 hover:text-white transition-colors">
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Account</h3>
            <ul className="mt-4 space-y-3">
              {links.account.map((item) => (
                <li key={item.name}>
                  <a href={item.href} className="text-sm text-slate-500 hover:text-white transition-colors">
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 border-t border-white/5 pt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="text-xs text-slate-600">
            &copy; {new Date().getFullYear()} Synvora. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="mailto:hello@synvora.us" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
              Privacy & Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
