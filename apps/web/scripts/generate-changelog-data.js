const fs = require('fs');
const path = require('path');

// Find CHANGELOG.md from project root
const projectRoot = path.join(__dirname, '..', '..', '..');
const changelogPath = path.join(projectRoot, 'CHANGELOG.md');

if (!fs.existsSync(changelogPath)) {
  console.error(`CHANGELOG.md not found at ${changelogPath}`);
  process.exit(1);
}

const md = fs.readFileSync(changelogPath, 'utf-8');
const lines = md.split(/\r?\n/);

function parseChangelog(lines) {
  const releases = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    // Match: ## [0.1.0] - Name - 2026-05-04
    const match = line.match(/^##\s+\[(\d+\.\d+\.\d+(?:-[\w.]+)?)\]\s+-\s+(.+?)\s+-\s+(\d{4}-\d{2}-\d{2})\s*$/);
    if (match) {
      const [, version, name, date] = match;
      // Convert version to i18n-safe key: 0.5.0 → v0_5_0
      const versionKey = 'v' + version.replace(/\./g, '_');
      const sections = [];
      i++;

      while (i < lines.length && !lines[i].match(/^##\s+\[/)) {
        const sectionMatch = lines[i].match(/^###\s+(.+)$/);
        if (sectionMatch) {
          const heading = sectionMatch[1];
          i++;
          const items = [];
          let currentItem = '';

          while (i < lines.length) {
            const l = lines[i];
            if (l.match(/^#{2,3}\s/)) break;
            
            const itemMatch = l.match(/^(\s*)-\s+(.+)$/);
            if (itemMatch) {
              if (currentItem) items.push(currentItem.trim());
              currentItem = itemMatch[2];
              i++;
            } else if (l.match(/^\s{2,}/) && currentItem) {
              currentItem += ' ' + l.trim();
              i++;
            } else if (l.trim() === '') {
              i++;
            } else {
              break;
            }
          }

          if (currentItem) items.push(currentItem.trim());
          if (items.length > 0) {
            sections.push({ heading, items });
          }
        } else {
          i++;
        }
      }

      releases.push({ version, versionKey, name, date, sections });
    } else {
      i++;
    }
  }

  return releases;
}

const releases = parseChangelog(lines);

console.log(`Parsed ${releases.length} releases`);
releases.forEach(r => {
  console.log(`  ${r.version}: ${r.sections.length} sections, ${r.sections.reduce((a, s) => a + s.items.length, 0)} items`);
});

// Generate changelogData.ts with i18n keys
function isInternalItem(sectionHeading, item) {
  if (sectionHeading === 'Technical') return true;
  if (/\*\*\[(?:INFRA|API|INTERNAL|TECH)\]/i.test(item)) return true;
  if (/\[(?:INFRA|API|INTERNAL|TECH)\]/i.test(item)) return true;
  if (/(endpoint|environment|env var|schema|query|worker|payload|typescript|build time|ssg|http-only|CITY_QUEUE_|apps\/|src\/|\.ts)/i.test(item)) return true;
  return false;
}

function generateDataFile(releases) {
  const sectionsCode = releases.map(r => {
    const secs = r.sections.map(s => {
      const keys = s.items.map((_, idx) => `          "changelog.items.${r.versionKey}.${s.heading.toLowerCase()}.${idx}"`);
      const internalKeys = s.items
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => isInternalItem(s.heading, item))
        .map(({ idx }) => `          "changelog.items.${r.versionKey}.${s.heading.toLowerCase()}.${idx}"`);
      const audience = s.heading === 'Technical' ? '\n        audience: "internal",' : '';
      const internalItemKeys = internalKeys.length > 0 ? `,
        internalItemKeys: [
${internalKeys.join(',\n')}
        ]` : '';
      return `      {
        heading: "${s.heading}",${audience}
        itemKeys: [
${keys.join(',\n')}
        ]${internalItemKeys},
      }`;
    });
    return `  {
    version: "${r.version}",
    nameKey: "changelog.releases.${r.versionKey}",
    date: "${r.date}",
    sections: [
${secs.join(',\n')}
    ],
  }`;
  });

  return `// Auto-generated from CHANGELOG.md
// Do not edit manually. Run \`npm run generate:changelog\` to regenerate.

export interface ChangelogSection {
  heading: string;
  itemKeys: string[];
  internalItemKeys?: string[];
  audience?: "public" | "internal";
}

export interface ChangelogRelease {
  version: string;
  nameKey: string;
  date: string;
  sections: ChangelogSection[];
}

export const changelogReleases: ChangelogRelease[] = [
${sectionsCode.join(',\n')}
];

export function getLatestRelease(): ChangelogRelease | null {
  return changelogReleases[0] ?? null;
}
`;
}

// Generate i18n JSON snippets for reference
function generateI18nSnippets(releases, lang) {
  const items = {};
  releases.forEach(r => {
    const verItems = {};
    r.sections.forEach(s => {
      const sectionKey = s.heading.toLowerCase();
      verItems[sectionKey] = s.items;
    });
    items[r.versionKey] = verItems;
  });
  return { releases: releases.reduce((acc, r) => { acc[r.versionKey] = r.name; return acc; }, {}), items };
}

const outPath = path.join(__dirname, '..', 'src', 'data', 'changelogData.ts');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, generateDataFile(releases));

console.log(`✓ Generated ${outPath}`);
console.log('\nTip: Add translations to en.json and es.json under "changelog" key.');
console.log('Release names: changelog.releases.<version>');
console.log('Items: changelog.items.<version>.<section>.<index>');
