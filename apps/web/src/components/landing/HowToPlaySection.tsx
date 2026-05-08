"use client";

import Link from "next/link";
import { useI18n } from "@/i18n";
import { UsersIcon, CastleIcon, SwordIcon } from "./MedievalIcons";

const icons = {
  register: <UsersIcon className="w-6 h-6" />,
  build: <CastleIcon className="w-6 h-6" />,
  conquer: <SwordIcon className="w-6 h-6" />,
};

export function HowToPlaySection() {
  const { t } = useI18n();

  const steps = [
    {
      icon: icons.register,
      title: t("howToPlay.steps.0.title"),
      description: t("howToPlay.steps.0.description"),
    },
    {
      icon: icons.build,
      title: t("howToPlay.steps.1.title"),
      description: t("howToPlay.steps.1.description"),
    },
    {
      icon: icons.conquer,
      title: t("howToPlay.steps.2.title"),
      description: t("howToPlay.steps.2.description"),
    },
  ];

  return (
    <section className="relative overflow-hidden px-6 py-20">
      {/* Thematic background */}
      <div className="absolute inset-0 bg-[url('/assets/backgrounds/village-isometric-base.png')] bg-cover bg-center opacity-[0.04]" />
      <div className="absolute inset-0 bg-gradient-to-b from-white via-amber-50/30 to-white" />

      <div className="relative mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <div className="mx-auto mb-3 flex items-center justify-center gap-2">
            <div className="h-px w-8 bg-amber-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <div className="h-px w-8 bg-amber-400" />
          </div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.05em] text-amber-600">
            {t("howToPlay.subtitle")}
          </p>
          <h2
            className="mt-2 text-3xl font-bold tracking-[-0.02em] text-stone-900 sm:text-4xl"
            style={{ fontFamily: "Inter, system-ui, sans-serif", lineHeight: 1.15 }}
          >
            {t("howToPlay.title")}
          </h2>
        </div>

        {/* Steps with connecting line */}
        <div className="relative grid gap-8 sm:grid-cols-3">
          {/* Connecting line (desktop) */}
          <div className="absolute top-6 left-[16.6%] right-[16.6%] h-px bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 hidden sm:block" />

          {steps.map((step, i) => (
            <div key={i} className="relative text-center">
              {/* Step number badge */}
              <div className="relative mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-amber-200 bg-white text-amber-700 shadow-sm shadow-amber-100/50">
                {step.icon}
                <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                  {i + 1}
                </div>
              </div>
              <h3
                className="mb-2 text-[16px] font-semibold text-stone-900"
                style={{ fontFamily: "Inter, system-ui, sans-serif", lineHeight: 1.2 }}
              >
                {step.title}
              </h3>
              <p
                className="text-[14px] text-stone-500"
                style={{ fontFamily: "Inter, system-ui, sans-serif", lineHeight: 1.5 }}
              >
                {step.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/registro"
            className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-8 py-3 text-[16px] font-semibold text-white hover:bg-amber-600 transition-colors shadow-sm shadow-amber-500/20"
          >
            {t("cta.button")}
          </Link>
        </div>
      </div>
    </section>
  );
}
