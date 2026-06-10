"use client";

import Link from "next/link";
import { getPublicReleases } from "@/lib/changelogPublic";
import { SECTION_STYLES, formatRelativeDate } from "@/components/changelog/changelogUi";
import { useI18n } from "@/i18n";

export default function ChangelogPage() {
  const { t, locale } = useI18n();
  const publicReleases = getPublicReleases();

  const translateHeading = (heading: string) => {
    const key = `changelog.headings.${heading}`;
    const translated = t(key);
    return translated === key ? heading : translated;
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
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

      <div className="relative">
        {/* Timeline connector */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-stone-200 max-sm:hidden" />

        <div className="space-y-10">
          {publicReleases.map((release, idx) => (
            <article key={release.version} className="relative sm:pl-10">
              <span
                className={`absolute left-0 top-2 hidden h-[15px] w-[15px] rounded-full border-2 border-white shadow-sm sm:block ${
                  idx === 0 ? "bg-amber-500" : "bg-stone-300"
                }`}
              />

              <div className="rounded-[16px] border border-stone-200 bg-white p-6 sm:p-8">
                <div className="mb-6 flex flex-wrap items-center gap-3">
                  <span className="rounded-[10px] bg-amber-500 px-3 py-1 text-sm font-semibold text-white">
                    v{release.version}
                  </span>
                  <h2
                    className="text-xl font-bold text-stone-900"
                    style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                  >
                    {t(release.nameKey)}
                  </h2>
                  <span
                    className="ml-auto text-sm text-stone-400"
                    title={release.date}
                  >
                    {formatRelativeDate(release.date, locale)}
                  </span>
                </div>

                <div className="space-y-6">
                  {release.sections.map((section) => {
                    const style = SECTION_STYLES[section.heading] ?? SECTION_STYLES.Changed;
                    return (
                      <div key={section.heading}>
                        <span
                          className={`mb-3 inline-block rounded-full px-2.5 py-0.5 text-[12px] font-bold ${style.badge}`}
                        >
                          {translateHeading(section.heading)}
                        </span>
                        <ul className="space-y-2">
                          {section.itemKeys.map((itemKey) => (
                            <li key={itemKey} className="flex gap-2 text-[14px] text-stone-600">
                              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
                              <span>{t(itemKey)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>

                <Link
                  href={`/changelog/${release.version}`}
                  className="mt-6 inline-flex items-center gap-2 text-[14px] font-semibold text-amber-600 hover:text-amber-700 transition-colors"
                >
                  {t("changelog.viewAll")}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
