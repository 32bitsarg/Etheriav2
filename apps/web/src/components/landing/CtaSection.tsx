"use client";

import Link from "next/link";
import { useI18n } from "@/i18n";
import { CrownIcon } from "./MedievalIcons";

export function CtaSection() {
  const { t } = useI18n();

  return (
    <section className="relative overflow-hidden px-6 py-20">
      {/* Thematic background */}
      <div className="absolute inset-0 bg-[url('/assets/backgrounds/world-map.png')] bg-cover bg-center opacity-[0.05]" />
      <div className="absolute inset-0 bg-gradient-to-b from-white via-amber-50/20 to-white" />

      <div className="relative mx-auto max-w-xl">
        <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/50 via-white to-amber-50/30 px-8 py-12 text-center shadow-xl shadow-amber-100/30">
          {/* Crown icon */}
          <div className="mb-4 flex items-center justify-center">
            <CrownIcon className="w-10 h-10" />
          </div>

          <h2
            className="text-3xl font-bold tracking-[-0.02em] text-stone-900 sm:text-4xl"
            style={{ fontFamily: "Inter, system-ui, sans-serif", lineHeight: 1.15 }}
          >
            {t("cta.title")}
          </h2>
          <p
            className="mx-auto mt-3 max-w-sm text-[16px] text-stone-500"
            style={{ fontFamily: "Inter, system-ui, sans-serif", lineHeight: 1.6 }}
          >
            {t("cta.subtitle")}
          </p>
          <div className="mt-8">
            <Link
              href="/registro"
              className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-10 py-3 text-[16px] font-semibold text-white hover:bg-amber-600 transition-colors shadow-sm shadow-amber-500/20"
            >
              {t("cta.button")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
