"use client";

import { landingContent } from "@/config/landingContent";

export function ScreenshotsSection() {
  const { screenshotsTitle, screenshotsSubtitle, screenshots } = landingContent;

  return (
    <section id="screenshots" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            {screenshotsTitle}
          </h2>
          <p className="mt-3 text-stone-400">{screenshotsSubtitle}</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {screenshots.map((shot, i) => (
            <div
              key={i}
              className="group relative aspect-[16/10] overflow-hidden rounded-2xl border border-stone-800 bg-stone-900/50"
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="rounded-2xl bg-stone-800 p-4 text-3xl text-stone-600">🖼️</div>
                <span className="text-sm text-stone-600">{shot.caption}</span>
              </div>
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/80 to-transparent p-6 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="text-sm font-medium text-white">{shot.caption}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
