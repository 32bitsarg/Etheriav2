import { getLatestRelease } from "@/lib/changelogParser";
import Link from "next/link";
import { landingContent } from "@/config/landingContent";

export function LatestVersionSection() {
  const release = getLatestRelease();
  const { latestVersionTitle, latestVersionSubtitle } = landingContent;

  if (!release) return null;

  return (
    <section className="relative px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <div className="text-center mb-10">
          <h2 className="font-display text-2xl font-bold text-[#f1e2bd]">{latestVersionTitle}</h2>
          <p className="mt-2 text-sm text-etheria-text-muted">{latestVersionSubtitle}</p>
        </div>

        <Link href={`/changelog/${release.version}`}>
          <div className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 backdrop-blur-sm transition-all hover:border-etheria-gold/20 hover:bg-white/[0.03]">
            <div className="flex flex-wrap items-baseline gap-3 mb-4">
              <span className="rounded-lg bg-etheria-gold/10 px-3 py-1 text-xs font-semibold text-etheria-gold-soft">
                v{release.version}
              </span>
              <span className="font-display text-lg font-semibold text-[#f1e2bd]">
                {release.name}
              </span>
              <span className="ml-auto text-xs text-etheria-text-dim">{release.date}</span>
            </div>

            <div className="space-y-3">
              {release.sections.slice(0, 2).map((section) => (
                <div key={section.heading}>
                  <h3 className="text-[11px] uppercase tracking-wider text-etheria-gold/50 mb-2">
                    {section.heading}
                  </h3>
                  <ul className="space-y-1.5">
                    {section.items.slice(0, 2).map((item, i) => (
                      <li key={i} className="flex gap-2 text-sm text-etheria-text-muted/80">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-etheria-gold/40" />
                        <span className="line-clamp-1">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center gap-2 text-sm text-etheria-gold/70 group-hover:text-etheria-gold-soft transition-colors">
              Ver detalles completos
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
