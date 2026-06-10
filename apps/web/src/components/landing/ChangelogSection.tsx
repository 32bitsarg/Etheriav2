"use client";

import Link from "next/link";
import { changelogReleases } from "@/data/changelogData";
import { useI18n } from "@/i18n";

const DISPLAY_FONT = "var(--font-fredoka, Fredoka, system-ui, sans-serif)";

export function ChangelogSection() {
  const { t } = useI18n();

  const publicReleases = changelogReleases
    .map((release) => ({
      ...release,
      sections: release.sections.filter((section) => section.audience !== "internal"),
    }))
    .filter((release) => release.sections.length > 0);

  const latest = publicReleases[0];
  if (!latest) return null;

  return (
    <section id="changelog" className="px-6 py-16" style={{ background: "#fafaf9" }}>
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="inline-block rounded-full bg-teal-100 px-3.5 py-1 text-[13px] font-semibold text-teal-700" style={{ fontFamily: DISPLAY_FONT }}>
            {t("changelog.title")}
          </span>
          <h2 className="mt-4 text-4xl font-bold text-[#2c2118] sm:text-5xl" style={{ fontFamily: DISPLAY_FONT }}>
            {t("landing.latestUpdate")}
          </h2>
          <p className="mt-3 text-[16px] text-[#6f6052]">
            {t("landing.etheriaGrows")}
          </p>
        </div>

        <div className="mx-auto max-w-3xl rounded-[2rem] border border-stone-200 bg-white p-6 sm:p-10 shadow-[0_18px_40px_-16px_rgba(60,40,20,.28)]">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="rounded-xl bg-amber-500 px-4 py-1.5 text-sm font-bold text-white shadow-sm">
              v{latest.version}
            </span>
            <h3 className="text-2xl font-bold text-[#2c2118]" style={{ fontFamily: DISPLAY_FONT }}>
              {t(latest.nameKey)}
            </h3>
            <span className="ml-auto text-sm text-stone-400">{latest.date}</span>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {latest.sections.map((section) => {
              const displayCount = 4;
              const extra = section.itemKeys.length - displayCount;
              return (
                <div key={section.heading}>
                  <h4 className="mb-2.5 text-[12px] font-bold uppercase tracking-[0.08em] text-amber-600">
                    {t(`changelog.headings.${section.heading}`)}
                  </h4>
                  <ul className="space-y-1.5">
                    {section.itemKeys.slice(0, displayCount).map((itemKey, i) => (
                      <li key={i} className="flex gap-2 text-[13px] text-stone-600">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                        <span className="line-clamp-2">{t(itemKey)}</span>
                      </li>
                    ))}
                    {extra > 0 && (
                      <li className="text-[12px] text-amber-600 font-medium pl-4">
                        {t("landing.moreItems").replace("{count}", String(extra))}
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-5 border-t border-stone-100 flex justify-between items-center">
            <Link
              href="/changelog"
              className="inline-flex items-center gap-2 text-[14px] font-semibold text-amber-600 hover:text-amber-700 transition-colors"
            >
              {t("changelog.viewAll")}
            </Link>
            <Link
              href="/registro"
              className="rounded-full bg-amber-500 px-5 py-2 text-[13px] font-semibold text-white hover:bg-amber-600 transition-colors shadow-sm"
            >
              {t("landing.startPlaying")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
