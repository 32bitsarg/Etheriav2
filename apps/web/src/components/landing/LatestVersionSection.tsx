import { getLatestRelease } from "@/data/changelogData";
import Link from "next/link";
import { landingContent } from "@/config/landingContent";

export function LatestVersionSection() {
  const release = getLatestRelease();
  const { latestVersionTitle, latestVersionSubtitle } = landingContent;

  if (!release) return null;

  const topSections = release.sections.slice(0, 3);

  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-white">{latestVersionTitle}</h2>
          <p className="mt-2 text-stone-400">{latestVersionSubtitle}</p>
        </div>

        <Link href={`/changelog/${release.version}`} className="group block">
          <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/40 to-stone-950 p-8 transition-all hover:border-amber-500/40">
            <div className="mb-6 flex flex-wrap items-center gap-4">
              <span className="rounded-lg bg-amber-500 px-3 py-1 text-sm font-bold text-stone-950">
                v{release.version}
              </span>
              <span className="text-xl font-bold text-white">{release.name}</span>
              <span className="ml-auto text-sm text-stone-500">{release.date}</span>
            </div>

            <div className="grid gap-8 sm:grid-cols-3">
              {topSections.map((section) => (
                <div key={section.heading}>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-amber-400">
                    {section.heading}
                  </h3>
                  <ul className="space-y-2">
                    {section.items.slice(0, 3).map((item, i) => (
                      <li key={i} className="flex gap-2 text-sm text-stone-300">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                        <span className="line-clamp-2">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-amber-400 group-hover:text-amber-300">
              Ver detalles completos →
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
