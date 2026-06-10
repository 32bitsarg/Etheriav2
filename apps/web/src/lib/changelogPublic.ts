import { changelogReleases, type ChangelogRelease } from "@/data/changelogData";

/**
 * Releases with internal sections and internal items stripped out.
 * Single source of truth for everything player-facing (landing, /changelog,
 * whats-new modal in /play).
 */
export function getPublicReleases(): ChangelogRelease[] {
  return changelogReleases
    .map((release) => ({
      ...release,
      sections: release.sections
        .filter((section) => section.audience !== "internal")
        .map((section) => ({
          ...section,
          itemKeys: section.itemKeys.filter(
            (itemKey) => !section.internalItemKeys?.includes(itemKey)
          ),
        }))
        .filter((section) => section.itemKeys.length > 0),
    }))
    .filter((release) => release.sections.length > 0);
}

export function getPublicRelease(version: string): ChangelogRelease | null {
  return getPublicReleases().find((r) => r.version === version) ?? null;
}
