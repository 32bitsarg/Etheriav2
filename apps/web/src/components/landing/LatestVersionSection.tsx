"use client";

import { getLatestRelease } from "@/data/changelogData";
import Link from "next/link";
import { useI18n } from "@/i18n";

export function LatestVersionSection() {
  const { t } = useI18n();
  const release = getLatestRelease();

  if (!release) return null;

  const translateHeading = (heading: string) => {
    const key = `changelog.headings.${heading}`;
    const translated = t(key);
    return translated === key ? heading : translated;
  };

  const topSections = release.sections
    .filter((s) => s.audience !== "internal")
    .slice(0, 3);

  return (
    <section className="relative overflow-hidden px-6 py-20">
      {/* Thematic background */}
      <div className="absolute inset-0 bg-[url('/assets/backgrounds/village-isometric-base.png')] bg-cover bg-center opacity-[0.04]" />
      <div className="absolute inset-0 bg-gradient-to-b from-white via-amber-50/20 to-white" />

      <div className="relative mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <div className="mx-auto mb-3 flex items-center justify-center gap-2">
            <div className="h-px w-8 bg-amber-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <div className="h-px w-8 bg-amber-400" />
          </div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.05em] text-amber-600">
            {t("latestVersion.title")}
          </p>
          <h2
            className="mt-2 text-3xl font-bold tracking-[-0.02em] text-stone-900 sm:text-4xl"
            style={{ fontFamily: "Inter, system-ui, sans-serif", lineHeight: 1.15 }}
          >
            {t(release.nameKey)}
          </h2>
        </div>

        <div className="grid gap-8 lg:grid-cols-2 items-start">
          {/* Image */}
          <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-lg shadow-stone-100/50">
            <img
              src="/assets/landing/conquest-of-etheria/changelog-latest-update.png"
              alt={t(release.nameKey)}
              className="w-full h-auto"
            />
          </div>

          {/* Content */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-amber-500 px-3 py-1 text-sm font-semibold text-white shadow-sm shadow-amber-500/20">
                v{release.version}
              </span>
              <span className="text-sm text-stone-400">{release.date}</span>
            </div>

            <div className="space-y-5">
              {topSections.map((section) => (
                <div key={section.heading}>
                  <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.05em] text-amber-600">
                    {translateHeading(section.heading)}
                  </h3>
                  <ul className="space-y-2">
                    {section.itemKeys.slice(0, 4).map((itemKey, i) => (
                      <li key={i} className="flex gap-3 text-[14px] text-stone-600">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                        <span>{t(itemKey)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <Link
              href={`/changelog/${release.version}`}
              className="inline-flex items-center gap-2 text-[14px] font-semibold text-amber-600 hover:text-amber-700 transition-colors"
            >
              {t("latestVersion.viewDetails")}
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
