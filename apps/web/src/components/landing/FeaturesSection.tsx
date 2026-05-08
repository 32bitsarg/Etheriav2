"use client";

import { useI18n } from "@/i18n";
import {
  SwordIcon,
  CastleIcon,
  GlobeIcon,
  ShieldIcon,
  ScrollIcon,
  CrownIcon,
} from "./MedievalIcons";

const icons = {
  sword: <SwordIcon className="w-7 h-7" />,
  castle: <CastleIcon className="w-7 h-7" />,
  globe: <GlobeIcon className="w-7 h-7" />,
  shield: <ShieldIcon className="w-7 h-7" />,
  scroll: <ScrollIcon className="w-7 h-7" />,
  crown: <CrownIcon className="w-7 h-7" />,
};

export function FeaturesSection() {
  const { t } = useI18n();

  const features = [
    { icon: icons.sword, title: t("features.items.0.title"), description: t("features.items.0.description") },
    { icon: icons.castle, title: t("features.items.1.title"), description: t("features.items.1.description") },
    { icon: icons.globe, title: t("features.items.2.title"), description: t("features.items.2.description") },
    { icon: icons.shield, title: t("features.items.3.title"), description: t("features.items.3.description") },
    { icon: icons.scroll, title: t("features.items.4.title"), description: t("features.items.4.description") },
    { icon: icons.crown, title: t("features.items.5.title"), description: t("features.items.5.description") },
  ];

  return (
    <section id="features" className="relative px-6 py-20">
      {/* Background */}
      <div className="absolute inset-0 bg-[url('/assets/backgrounds/world-map-tile.png')] opacity-[0.03]" />

      <div className="relative mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <div className="mx-auto mb-3 flex items-center justify-center gap-2">
            <div className="h-px w-8 bg-amber-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <div className="h-px w-8 bg-amber-400" />
          </div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.05em] text-amber-600">
            {t("features.subtitle")}
          </p>
          <h2
            className="mt-2 text-3xl font-bold tracking-[-0.02em] text-stone-900 sm:text-4xl"
            style={{ fontFamily: "Inter, system-ui, sans-serif", lineHeight: 1.15 }}
          >
            {t("features.title")}
          </h2>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Featured card - spans 2 cols on lg */}
          <div className="group relative overflow-hidden rounded-2xl border border-stone-200 bg-gradient-to-br from-amber-50/50 to-white p-6 transition-all duration-300 hover:border-amber-400/50 hover:shadow-lg hover:shadow-amber-100/50 lg:col-span-2">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 rounded-xl bg-amber-100/80 p-3 text-amber-700 transition-colors group-hover:bg-amber-200/80">
                {features[0].icon}
              </div>
              <div>
                <h3
                  className="text-lg font-semibold text-stone-900"
                  style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                >
                  {features[0].title}
                </h3>
                <p className="mt-1 text-sm text-stone-500 leading-relaxed">{features[0].description}</p>
              </div>
            </div>
          </div>

          {/* Regular card */}
          <div className="group relative overflow-hidden rounded-2xl border border-stone-200 bg-white p-6 transition-all duration-300 hover:border-amber-400/50 hover:shadow-lg hover:shadow-stone-100/50">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 rounded-xl bg-amber-100/80 p-3 text-amber-700 transition-colors group-hover:bg-amber-200/80">
                {features[1].icon}
              </div>
              <div>
                <h3
                  className="text-[16px] font-semibold text-stone-900"
                  style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                >
                  {features[1].title}
                </h3>
                <p className="mt-1 text-[14px] text-stone-500 leading-relaxed">{features[1].description}</p>
              </div>
            </div>
          </div>

          {/* Remaining cards */}
          {features.slice(2).map((feature, i) => (
            <div
              key={i}
              className="group relative overflow-hidden rounded-2xl border border-stone-200 bg-white p-6 transition-all duration-300 hover:border-amber-400/50 hover:shadow-lg hover:shadow-stone-100/50"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 rounded-xl bg-amber-100/80 p-3 text-amber-700 transition-colors group-hover:bg-amber-200/80">
                  {feature.icon}
                </div>
                <div>
                  <h3
                    className="text-[16px] font-semibold text-stone-900"
                    style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                  >
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-[14px] text-stone-500 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
