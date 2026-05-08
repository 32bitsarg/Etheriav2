"use client";

import { useI18n } from "@/i18n";
import { FlameIcon, CoinIcon, BannerIcon } from "./MedievalIcons";

const icons = [
  <FlameIcon key="flame" className="w-8 h-8" />,
  <CoinIcon key="coin" className="w-8 h-8" />,
  <BannerIcon key="banner" className="w-8 h-8" />,
];

export function SocialProofSection() {
  const { t } = useI18n();

  return (
    <section className="relative overflow-hidden px-6 py-20">
      {/* Thematic background */}
      <div className="absolute inset-0 bg-[url('/assets/backgrounds/world-map-ground.png')] bg-cover bg-center opacity-[0.03]" />
      <div className="absolute inset-0 bg-gradient-to-r from-amber-50/40 via-white to-amber-50/40" />

      <div className="relative mx-auto max-w-4xl">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-3 flex items-center justify-center gap-2">
            <div className="h-px w-8 bg-amber-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <div className="h-px w-8 bg-amber-400" />
          </div>
          <h2
            className="text-3xl font-bold tracking-[-0.02em] text-stone-900"
            style={{ fontFamily: "Inter, system-ui, sans-serif", lineHeight: 1.15 }}
          >
            {t("socialProof.title")}
          </h2>
          <p
            className="mt-2 text-[16px] text-stone-500"
            style={{ fontFamily: "Inter, system-ui, sans-serif", lineHeight: 1.5 }}
          >
            {t("socialProof.subtitle")}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { value: "50,000+", label: t("socialProof.stats.0.label") },
            { value: "12,000+", label: t("socialProof.stats.1.label") },
            { value: "98%", label: t("socialProof.stats.2.label") },
          ].map((stat, i) => (
            <div
              key={i}
              className="group relative overflow-hidden rounded-2xl border border-stone-200 bg-white py-8 text-center transition-all duration-300 hover:border-amber-300/50 hover:shadow-lg hover:shadow-amber-100/30"
            >
              {/* Icon */}
              <div className="mb-3 flex items-center justify-center text-amber-600 opacity-60 transition-opacity group-hover:opacity-100">
                {icons[i]}
              </div>
              <div
                className="text-3xl font-bold text-stone-900"
                style={{ fontFamily: "Inter, system-ui, sans-serif", letterSpacing: "-0.02em" }}
              >
                {stat.value}
              </div>
              <div className="mt-1 text-[14px] text-stone-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
