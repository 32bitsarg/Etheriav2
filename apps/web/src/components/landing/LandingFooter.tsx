"use client";

import Link from "next/link";
import { landingContent } from "@/config/landingContent";

export function LandingFooter() {
  const { footer } = landingContent;

  return (
    <footer className="border-t border-white/[0.06] bg-etheria-bg-deep/50 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="text-center sm:text-left">
            <p className="font-display text-sm font-semibold text-[#f1e2bd]">{footer.brand}</p>
            <p className="mt-1 text-xs text-etheria-text-dim">{footer.tagline}</p>
          </div>

          <div className="flex items-center gap-6">
            {footer.links.map((link, i) => (
              <Link
                key={i}
                href={link.href}
                className="text-sm text-etheria-text-muted hover:text-etheria-gold-soft transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-white/[0.04] pt-6 sm:flex-row">
          <p className="text-xs text-etheria-text-dim">{footer.copyright}</p>
          <p className="text-xs text-etheria-gold/50">{footer.developer}</p>
        </div>
      </div>
    </footer>
  );
}
