import { notFound } from "next/navigation";
import Link from "next/link";
import { changelogReleases } from "@/data/changelogData";

interface Props {
  params: Promise<{ version: string }>;
}

export async function generateStaticParams() {
  return changelogReleases.map((r) => ({ version: r.version }));
}

export default async function ChangelogVersionPage({ params }: Props) {
  const { version } = await params;
  const release = changelogReleases.find((r) => r.version === version);

  if (!release) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/changelog"
        className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-amber-400"
      >
        ← Volver al Changelog
      </Link>

      <article className="mt-8">
        <header className="border-b border-stone-800 pb-8">
          <div className="flex flex-wrap items-center gap-4">
            <span className="rounded-lg bg-amber-500 px-3 py-1 text-sm font-bold text-stone-950">
              v{release.version}
            </span>
            <h1 className="text-3xl font-bold text-white">
              {release.name}
            </h1>
          </div>
          <time className="mt-3 block text-sm text-stone-500">{release.date}</time>
        </header>

        <div className="mt-10 space-y-10">
          {release.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="mb-5 text-sm font-bold uppercase tracking-wider text-amber-400">
                {section.heading}
              </h2>
              <ul className="space-y-4">
                {section.items.map((item, i) => (
                  <li key={i} className="flex gap-3 text-sm text-stone-300">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
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
