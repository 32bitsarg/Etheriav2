"use client";

import Link from "next/link";
import { landingContent } from "@/config/landingContent";

export function HeroSection() {
  const { gameName, tagline, heroSubtitle, ctaPlay, ctaLearnMore } = landingContent;

  return (
    <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden px-6">
      {/* Ambient gradient orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/4 h-[500px] w-[500px] rounded-full bg-etheria-gold/[0.03] blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-etheria-emerald/[0.03] blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-2xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-etheria-gold animate-pulse" />
          <span className="text-[11px] uppercase tracking-[0.2em] text-etheria-text-muted">
            Estrategia en Tiempo Real
          </span>
        </div>

        <h1 className="font-display text-6xl font-bold leading-[1.1] text-[#f1e2bd] sm:text-7xl">
          {gameName}
        </h1>
        <p className="mt-5 font-display text-xl text-etheria-gold/80 sm:text-2xl">
          {tagline}
        </p>
        <p className="mt-6 text-base leading-relaxed text-etheria-text-muted/80 sm:text-lg max-w-xl mx-auto">
          {heroSubtitle}
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/registro"
            className="inline-flex items-center gap-2 rounded-xl border border-etheria-border-gold/60 bg-etheria-gold/10 px-8 py-3 text-sm font-semibold text-etheria-gold-soft hover:bg-etheria-gold/15 transition-all"
          >
            {ctaPlay}
          </Link>
          <a
            href="#features"
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-8 py-3 text-sm font-medium text-etheria-text-muted hover:bg-white/[0.05] transition-all"
          >
            {ctaLearnMore}
          </a>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-etheria-bg to-transparent" />
    </section>
  );
}
