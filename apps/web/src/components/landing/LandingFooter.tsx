"use client";

import Link from "next/link";
import { landingContent } from "@/config/landingContent";

export function LandingFooter() {
  const { footer } = landingContent;

  return (
    <footer className="border-t border-stone-800 bg-[#0c0a09] px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="text-center sm:text-left">
            <p className="text-sm font-semibold text-white">{footer.brand}</p>
            <p className="mt-1 text-xs text-stone-500">{footer.tagline}</p>
          </div>

          <div className="flex items-center gap-6">
            {footer.links.map((link, i) => (
              <Link
                key={i}
                href={link.href}
                className="text-sm text-stone-400 hover:text-amber-400 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-stone-800 pt-6 sm:flex-row">
          <p className="text-xs text-stone-600">{footer.copyright}</p>
          <p className="text-xs text-amber-600">{footer.developer}</p>
        </div>
      </div>
    </footer>
  );
}
