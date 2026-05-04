"use client";

import Link from "next/link";
import { landingContent } from "@/config/landingContent";

export function HeroSection() {
  const { gameName, tagline, heroSubtitle, ctaPlay, ctaLearnMore, stats } = landingContent;

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-950/20 via-transparent to-transparent" />
      
      <div className="relative z-10 max-w-4xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="text-xs font-semibold uppercase tracking-widest text-amber-300">
            Estrategia en Tiempo Real
          </span>
        </div>

        <h1 className="font-display text-6xl font-bold tracking-tight text-white sm:text-7xl md:text-8xl">
          {gameName}
        </h1>
        
        <p className="mt-6 text-2xl font-medium text-amber-200 sm:text-3xl">
          {tagline}
        </p>
        
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-stone-400">
          {heroSubtitle}
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/registro"
            className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-8 py-4 text-sm font-bold text-white shadow-lg shadow-amber-900/20 hover:bg-amber-500 transition-colors"
          >
            {ctaPlay}
          </Link>
          <a
            href="#features"
            className="inline-flex items-center justify-center rounded-xl border border-stone-700 bg-stone-800/50 px-8 py-4 text-sm font-semibold text-stone-300 hover:bg-stone-800 hover:text-white transition-colors"
          >
            {ctaLearnMore}
          </a>
        </div>
      </div>

      <div className="relative z-10 mt-20 grid w-full max-w-3xl grid-cols-2 gap-8 sm:grid-cols-4">
        {stats.map((stat, i) => (
          <div key={i} className="text-center">
            <div className="text-4xl font-bold text-amber-400">{stat.value}</div>
            <div className="mt-1 text-sm font-medium uppercase tracking-wider text-stone-500">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
