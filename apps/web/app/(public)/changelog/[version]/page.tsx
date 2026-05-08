import { notFound } from "next/navigation";
import Link from "next/link";
import { changelogReleases } from "@/data/changelogData";
import { ChangelogDetailClient } from "@/components/changelog/ChangelogDetailClient";

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

  return <ChangelogDetailClient release={release} />;
}
