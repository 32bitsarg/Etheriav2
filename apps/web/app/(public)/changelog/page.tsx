import { getChangelogReleases, getLatestRelease } from "@/lib/changelogParser";
import Link from "next/link";

export default function ChangelogPage() {
  const releases = getChangelogReleases();

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-display text-4xl font-bold text-[#f1e2bd]">Changelog</h1>
      <p className="mt-2 text-etheria-text-muted">
        Historia de cambios de Conquest of Etheria.
      </p>

      <div className="mt-12 space-y-8">
        {releases.length === 0 && (
          <p className="text-etheria-text-muted">No hay versiones publicadas aún.</p>
        )}
        {releases.map((release) => (
          <article
            key={release.version}
            className="rounded-2xl border border-etheria-border bg-etheria-panel/40 p-6 backdrop-blur-sm"
          >
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 className="font-display text-xl font-bold text-etheria-gold-soft">
                {release.version}
              </h2>
              <span className="text-sm text-etheria-text-dim">— {release.name}</span>
              <span className="ml-auto text-xs text-etheria-text-dim">{release.date}</span>
            </div>

            <div className="mt-4 space-y-4">
              {release.sections.slice(0, 2).map((section) => (
                <div key={section.heading}>
                  <h3 className="text-xs uppercase tracking-wider text-etheria-gold/60">
                    {section.heading}
                  </h3>
                  <ul className="mt-2 space-y-1">
                    {section.items.slice(0, 3).map((item, i) => (
                      <li key={i} className="text-sm text-etheria-text-muted line-clamp-2">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <Link
              href={`/changelog/${release.version}`}
              className="mt-4 inline-block text-sm text-etheria-gold hover:text-etheria-gold-soft transition-colors"
            >
              Leer más →
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
