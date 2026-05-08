"use client";

import { useI18n } from "@/i18n";
import { ScrollIcon } from "./MedievalIcons";

export function LoreSection() {
  const { t } = useI18n();

  return (
    <section id="lore" className="relative overflow-hidden px-6 py-20">
      {/* Thematic background */}
      <div className="absolute inset-0 bg-[url('/assets/backgrounds/world-map-ground.png')] bg-cover bg-center opacity-[0.03]" />
      <div className="absolute inset-0 bg-gradient-to-b from-white via-stone-50/50 to-white" />

      <div className="relative mx-auto max-w-2xl">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-3 flex items-center justify-center gap-2">
            <div className="h-px w-8 bg-amber-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <div className="h-px w-8 bg-amber-400" />
          </div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.05em] text-amber-600">
            {t("lore.subtitle")}
          </p>
          <h2
            className="mt-2 text-3xl font-bold tracking-[-0.02em] text-stone-900 sm:text-4xl"
            style={{ fontFamily: "Inter, system-ui, sans-serif", lineHeight: 1.15 }}
          >
            {t("lore.title")}
          </h2>
        </div>

        {/* Parchment-style card */}
        <div className="relative rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/40 via-white to-amber-50/30 p-6 shadow-lg shadow-amber-100/30 sm:p-8">
          {/* Decorative corner ornaments */}
          <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-amber-300/40 rounded-tl" />
          <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-amber-300/40 rounded-tr" />
          <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-amber-300/40 rounded-bl" />
          <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-amber-300/40 rounded-br" />

          {/* Scroll icon header */}
          <div className="mb-4 flex items-center justify-center">
            <ScrollIcon className="w-8 h-8 opacity-60" />
          </div>

          <div className="space-y-4">
            {[
              t("lore.paragraphs.0"),
              t("lore.paragraphs.1"),
            ].map((paragraph, i) => (
              <p
                key={i}
                className="text-[16px] text-stone-600 leading-relaxed"
                style={{ fontFamily: "Inter, system-ui, sans-serif", lineHeight: 1.7 }}
              >
                {paragraph}
              </p>
            ))}
          </div>

          {/* Decorative divider */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <div className="h-px w-12 bg-amber-300/40" />
            <div className="w-1 h-1 rounded-full bg-amber-400/60" />
            <div className="h-px w-12 bg-amber-300/40" />
          </div>
        </div>
      </div>
    </section>
  );
}
