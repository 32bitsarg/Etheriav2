"use client";

import Link from "next/link";
import { useI18n } from "@/i18n";
import type { ChangelogRelease } from "@/data/changelogData";

interface Props {
  release: ChangelogRelease;
}

export function ChangelogDetailClient({ release }: Props) {
  const { t } = useI18n();
  const publicSections = release.sections
    .filter((section) => section.audience !== "internal")
    .map((section) => ({
      ...section,
      itemKeys: section.itemKeys.filter((itemKey) => !section.internalItemKeys?.includes(itemKey)),
    }))
    .filter((section) => section.itemKeys.length > 0);

  const translateHeading = (heading: string) => {
    const key = `changelog.headings.${heading}`;
    const translated = t(key);
    return translated === key ? heading : translated;
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/changelog"
        className="inline-flex items-center gap-2 text-[14px] text-stone-500 hover:text-stone-900 transition-colors"
      >
        {t("changelog.backToList")}
      </Link>

      <article className="mt-8">
        <header className="border-b border-stone-200 pb-8">
          <div className="flex flex-wrap items-center gap-4">
            <span className="rounded-[10px] bg-amber-500 px-3 py-1 text-sm font-semibold text-white">
              v{release.version}
            </span>
            <h1
              className="text-3xl font-bold tracking-[-0.02em] text-stone-900"
              style={{ fontFamily: "Inter, system-ui, sans-serif", lineHeight: 1.15 }}
            >
              {t(release.nameKey)}
            </h1>
          </div>
          <time className="mt-3 block text-[14px] text-stone-400">{release.date}</time>
        </header>

        <div className="mt-10 space-y-10">
          {publicSections.map((section) => (
            <section key={section.heading}>
              <h2 className="mb-5 text-[13px] font-semibold uppercase tracking-[0.05em] text-amber-600">
                {translateHeading(section.heading)}
              </h2>
              <ul className="space-y-4">
                {section.itemKeys.map((itemKey, i) => (
                  <li key={i} className="flex gap-3 text-[14px] text-stone-600">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                    <span className="leading-relaxed">{t(itemKey)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
