"use client";

import Link from "next/link";
import { landingContent } from "@/config/landingContent";

export function LandingNavbar() {
  const { gameName } = landingContent;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-etheria-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-lg font-bold text-[#f1e2bd] tracking-wide">
          {gameName}
        </Link>
        <div className="flex items-center gap-8">
          <Link href="/changelog" className="text-[13px] font-medium text-etheria-text-muted hover:text-etheria-gold-soft transition-colors">
            Changelog
          </Link>
          <Link href="/login" className="text-[13px] font-medium text-etheria-text-muted hover:text-etheria-gold-soft transition-colors">
            Iniciar Sesión
          </Link>
          <Link
            href="/registro"
            className="rounded-lg border border-etheria-border-gold/60 bg-etheria-gold/10 px-4 py-2 text-[13px] font-medium text-etheria-gold-soft hover:bg-etheria-gold/15 transition-colors"
          >
            Jugar Ahora
          </Link>
        </div>
      </div>
    </nav>
  );
}
