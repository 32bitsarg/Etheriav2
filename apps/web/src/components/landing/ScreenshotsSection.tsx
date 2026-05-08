"use client";

import { useI18n } from "@/i18n";

export function ScreenshotsSection() {
  const { t } = useI18n();

  const screenshots = [
    {
      src: "/assets/landing/conquest-of-etheria/strategy-world-map.png",
      caption: t("screenshots.items.0.caption"),
    },
    {
      src: "/assets/landing/conquest-of-etheria/village-growth-hud.png",
      caption: t("screenshots.items.1.caption"),
    },
    {
      src: "/assets/landing/conquest-of-etheria/world-events-feed.png",
      caption: t("screenshots.items.2.caption"),
    },
  ];

  return (
    <section id="screenshots" className="relative overflow-hidden px-6 py-20">
      {/* Thematic background */}
      <div className="absolute inset-0 bg-[url('/assets/backgrounds/world-map-tile.png')] opacity-[0.03]" />
      <div className="absolute inset-0 bg-gradient-to-b from-white via-stone-50/30 to-white" />

      <div className="relative mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <div className="mx-auto mb-3 flex items-center justify-center gap-2">
            <div className="h-px w-8 bg-amber-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <div className="h-px w-8 bg-amber-400" />
          </div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.05em] text-amber-600">
            {t("screenshots.subtitle")}
          </p>
          <h2
            className="mt-2 text-3xl font-bold tracking-[-0.02em] text-stone-900 sm:text-4xl"
            style={{ fontFamily: "Inter, system-ui, sans-serif", lineHeight: 1.15 }}
          >
            {t("screenshots.title")}
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {screenshots.map((screenshot, i) => (
            <div
              key={i}
              className="group relative overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm shadow-stone-100/50 transition-all duration-300 hover:shadow-lg hover:shadow-stone-200/50 hover:border-amber-300/50"
            >
              {/* Screenshot image */}
              <div className="relative overflow-hidden">
                <img
                  src={screenshot.src}
                  alt={screenshot.caption}
                  className="w-full h-auto transition-transform duration-500 group-hover:scale-[1.03]"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-sm font-medium text-white">{screenshot.caption}</p>
                  </div>
                </div>
              </div>

              {/* Caption below */}
              <div className="p-4">
                <p className="text-sm font-medium text-stone-700">{screenshot.caption}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
