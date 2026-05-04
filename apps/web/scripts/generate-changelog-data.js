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
            // End of section: next ### or ## or blank line followed by ###
            if (l.match(/^#{2,3}\s/)) break;
            
            // New list item (any level of indentation, followed by dash and space)
            const itemMatch = l.match(/^(\s*)-\s+(.+)$/);
            if (itemMatch) {
              if (currentItem) items.push(currentItem.trim());
              currentItem = itemMatch[2];
              i++;
            } else if (l.match(/^\s{2,}/) && currentItem) {
              // Indented continuation line
              currentItem += ' ' + l.trim();
              i++;
            } else if (l.trim() === '') {
              // Blank line - might be end of item or just spacing
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

      releases.push({ version, name, date, sections });
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

const output = `// Auto-generated from CHANGELOG.md
// Do not edit manually. Run \`npm run generate:changelog\` to regenerate.

export interface ChangelogRelease {
  version: string;
  name: string;
  date: string;
  sections: { heading: string; items: string[] }[];
}

export const changelogReleases: ChangelogRelease[] = ${JSON.stringify(releases, null, 2)};

export function getLatestRelease(): ChangelogRelease | null {
  return changelogReleases[0] ?? null;
}
`;

const outPath = path.join(__dirname, '..', 'src', 'data', 'changelogData.ts');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, output);

console.log(`✓ Generated ${outPath}`);
