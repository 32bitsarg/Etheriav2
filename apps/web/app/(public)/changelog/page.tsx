import { changelogReleases } from "@/data/changelogData";
import Link from "next/link";

export default function ChangelogPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-16 text-center">
        <h1 className="text-4xl font-bold text-white">Changelog</h1>
        <p className="mt-3 text-stone-400">
          Historia de cambios de Conquest of Etheria
        </p>
      </div>

      <div className="space-y-8">
        {changelogReleases.map((release) => (
          <article
            key={release.version}
            className="rounded-2xl border border-stone-800 bg-stone-900/50 p-6 sm:p-8"
          >
            <div className="mb-6 flex flex-wrap items-center gap-4">
              <span className="rounded-lg bg-amber-500 px-3 py-1 text-sm font-bold text-stone-950">
                v{release.version}
              </span>
              <h2 className="text-xl font-bold text-white">
                {release.name}
              </h2>
              <span className="ml-auto text-sm text-stone-500">{release.date}</span>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {release.sections.slice(0, 3).map((section) => (
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

            <Link
              href={`/changelog/${release.version}`}
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-amber-400 hover:text-amber-300"
            >
              Ver todos los cambios →
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
