import "server-only";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";

export interface ChangelogRelease {
  version: string;
  name: string;
  date: string;
  sections: { heading: string; items: string[] }[];
  bodyRaw: string;
}

function findChangelogPath(): string | null {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const p = join(dir, "CHANGELOG.md");
    if (existsSync(p)) return p;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function parseMarkdownList(lines: string[], startIndex: number): { items: string[]; nextIndex: number } {
  const items: string[] = [];
  let i = startIndex;
  let currentItem = "";

  while (i < lines.length) {
    const line = lines[i];
    if (line.match(/^\s*-\s+/)) {
      if (currentItem) items.push(currentItem.trim());
      currentItem = line.replace(/^\s*-\s+/, "");
      i++;
    } else if (line.match(/^\s{2,}/) && currentItem) {
      currentItem += " " + line.trim();
      i++;
    } else {
      break;
    }
  }

  if (currentItem) items.push(currentItem.trim());
  return { items, nextIndex: i };
}

export function parseChangelog(md: string): ChangelogRelease[] {
  const releases: ChangelogRelease[] = [];
  const lines = md.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const match = line.match(/^##\s+\[(\d+\.\d+\.\d+(?:-[\w.]+)?)\]\s+-\s+(.+?)\s+-\s+(\d{4}-\d{2}-\d{2})\s*$/);
    if (match) {
      const [, version, name, date] = match;
      const sections: { heading: string; items: string[] }[] = [];
      i++;
      const bodyStart = i;

      while (i < lines.length && !lines[i].match(/^##\s+\[/)) {
        const sectionMatch = lines[i].match(/^###\s+(.+)$/);
        if (sectionMatch) {
          const heading = sectionMatch[1];
          i++;
          const { items, nextIndex } = parseMarkdownList(lines, i);
          if (items.length > 0) {
            sections.push({ heading, items });
          }
          i = nextIndex;
        } else {
          i++;
        }
      }

      const bodyRaw = lines.slice(bodyStart, i).join("\n").trim();
      releases.push({ version, name, date, sections, bodyRaw });
    } else {
      i++;
    }
  }

  return releases;
}

export function getChangelogReleases(): ChangelogRelease[] {
  const path = findChangelogPath();
  if (!path) {
    console.warn("[changelog] CHANGELOG.md not found");
    return [];
  }
  try {
    const md = readFileSync(path, "utf-8");
    return parseChangelog(md);
  } catch (e) {
    console.warn("[changelog] Failed to read CHANGELOG.md:", e);
    return [];
  }
}

export function getLatestRelease(): ChangelogRelease | null {
  const releases = getChangelogReleases();
  return releases[0] ?? null;
}
