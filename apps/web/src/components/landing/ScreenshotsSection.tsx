"use client";

import { landingContent } from "@/config/landingContent";

export function ScreenshotsSection() {
  const { screenshotsTitle, screenshotsSubtitle, screenshots } = landingContent;

  return (
    <section id="screenshots" className="relative px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl font-bold text-[#f1e2bd] sm:text-4xl">
            {screenshotsTitle}
          </h2>
          <p className="mt-3 text-sm text-etheria-text-muted">{screenshotsSubtitle}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {screenshots.map((shot, i) => (
            <div
              key={i}
              className="group relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-etheria-panel/30 via-etheria-bg/50 to-etheria-panel/30" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="rounded-2xl bg-white/[0.04] p-4 text-3xl opacity-50">🖼️</div>
                <span className="text-sm text-etheria-text-dim">{shot.caption}</span>
              </div>
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 to-transparent p-6 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="text-sm font-medium text-white/90">{shot.caption}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
