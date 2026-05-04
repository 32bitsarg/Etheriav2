import { notFound } from "next/navigation";
import Link from "next/link";
import { getChangelogReleases } from "@/lib/changelogParser";

interface Props {
  params: Promise<{ version: string }>;
}

export async function generateStaticParams() {
  const releases = getChangelogReleases();
  return releases.map((r) => ({ version: r.version }));
}

export default async function ChangelogVersionPage({ params }: Props) {
  const { version } = await params;
  const releases = getChangelogReleases();
  const release = releases.find((r) => r.version === version);

  if (!release) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/changelog"
        className="text-sm text-etheria-text-muted hover:text-etheria-gold-soft transition-colors"
      >
        ← Volver al Changelog
      </Link>

      <article className="mt-8">
        <header className="border-b border-etheria-border pb-6">
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="font-display text-3xl font-bold text-etheria-gold-soft">
              {release.version}
            </h1>
            <span className="text-lg text-etheria-text">— {release.name}</span>
          </div>
          <time className="mt-2 block text-sm text-etheria-text-dim">{release.date}</time>
        </header>

        <div className="mt-8 space-y-8">
          {release.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-sm uppercase tracking-wider text-etheria-gold/60">
                {section.heading}
              </h2>
              <ul className="mt-3 space-y-3">
                {section.items.map((item, i) => (
                  <li key={i} className="flex gap-3 text-sm text-etheria-text-muted">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-etheria-gold/40" />
                    <span className="leading-relaxed">{item}</span>
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
