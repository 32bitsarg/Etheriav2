"use client";

import { changelogReleases } from "@/data/changelogData";
import Link from "next/link";
import { useI18n } from "@/i18n";

export default function ChangelogPage() {
  const { t, locale } = useI18n();
  const publicReleases = changelogReleases
    .map((release) => ({
      ...release,
      sections: release.sections
        .filter((section) => section.audience !== "internal")
        .map((section) => ({
          ...section,
          itemKeys: section.itemKeys.filter((itemKey) => !section.internalItemKeys?.includes(itemKey)),
        }))
        .filter((section) => section.itemKeys.length > 0),
    }))
    .filter((release) => release.sections.length > 0);

  const translateHeading = (heading: string) => {
    const key = `changelog.headings.${heading}`;
    const translated = t(key);
    return translated === key ? heading : translated;
  };

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-[14px] text-stone-500 hover:text-stone-900 transition-colors mb-8"
      >
        ← {t("changelog.backToHome")}
      </Link>

      <div className="mb-16 text-center">
        <h1
          className="text-4xl font-bold tracking-[-0.02em] text-stone-900"
          style={{ fontFamily: "Inter, system-ui, sans-serif", lineHeight: 1.1 }}
        >
          {t("changelog.title")}
        </h1>
        <p
          className="mt-3 text-[16px] text-stone-500"
          style={{ fontFamily: "Inter, system-ui, sans-serif", lineHeight: 1.5 }}
        >
          {t("changelog.subtitle")}
        </p>
      </div>

      <div className="space-y-8">
        {publicReleases.map((release) => (
          <article
            key={release.version}
            className="rounded-[16px] border border-stone-200 bg-white p-6 sm:p-8"
          >
            <div className="mb-6 flex flex-wrap items-center gap-4">
              <span className="rounded-[10px] bg-amber-500 px-3 py-1 text-sm font-semibold text-white">
                v{release.version}
              </span>
              <h2
                className="text-xl font-bold text-stone-900"
                style={{ fontFamily: "Inter, system-ui, sans-serif" }}
              >
                {t(release.nameKey)}
              </h2>
              <span className="ml-auto text-sm text-stone-400">{release.date}</span>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {release.sections
                .slice(0, 3)
                .map((section) => (
                  <div key={section.heading}>
                    <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.05em] text-amber-600">
                      {translateHeading(section.heading)}
                    </h3>
                    <ul className="space-y-2">
                      {section.itemKeys.slice(0, 3).map((itemKey, i) => (
                        <li key={i} className="flex gap-2 text-[14px] text-stone-600">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                          <span className="line-clamp-2">{t(itemKey)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>

            <Link
              href={`/changelog/${release.version}`}
              className="mt-6 inline-flex items-center gap-2 text-[14px] font-semibold text-amber-600 hover:text-amber-700 transition-colors"
            >
              {t("changelog.viewAll")}
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
