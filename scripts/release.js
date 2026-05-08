#!/usr/bin/env node
/**
 * Release script for Etheria
 * Usage: node scripts/release.js [patch|minor|major]
 */

const fs = require("fs");
const path = require("path");

const VERSION_NAMES = [
  { version: "0.0.1", name: "La Fundación de Etheria" },
  { version: "0.0.2", name: "Las Primeras Guerras" },
  { version: "0.0.3", name: "La Forja de Armas" },
  { version: "0.0.4", name: "La Diplomacia de los Reinos" },
  { version: "0.1.0", name: "La Resistencia del Invierno" },
  { version: "0.1.1", name: "La Puerta de Etheria" },
  { version: "0.2.0", name: "El Mapa Viviente" },
  { version: "0.2.1", name: "El Taller de Colas" },
  { version: "0.2.2", name: "El Mercado de los Reinos" },
  { version: "0.2.3", name: "El Eco de las Batallas" },
  { version: "0.3.0", name: "Las Ruinas Olvidadas" },
  { version: "0.4.0", name: "El Pacto de Sangre" },
  { version: "0.5.0", name: "La Edad de los Héroes" },
  { version: "1.0.0", name: "La Era de los Imperios" },
];

function getVersionInfo(version) {
  return VERSION_NAMES.find((v) => v.version === version) || { version, name: "Unknown Era" };
}

function bumpVersion(current, type) {
  const [major, minor, patch] = current.split(".").map(Number);
  if (type === "major") return `${major + 1}.0.0`;
  if (type === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function updatePackageJson(version) {
  const rootPackage = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const oldVersion = rootPackage.version;
  rootPackage.version = version;
  fs.writeFileSync("package.json", JSON.stringify(rootPackage, null, 2) + "\n");
  return oldVersion;
}

function updateChangelog(version, name, type) {
  const changelogPath = "CHANGELOG.md";
  let content = fs.readFileSync(changelogPath, "utf8");

  const today = new Date().toISOString().split("T")[0];
  const header = `## [${version}] - ${name} - ${today}`;

  const newSection = `## [Unreleased]

### Planned

---

${header}

> *"${getEpigraph(version)}"*

### ${type === "patch" ? "Fixed" : "Added"}

`;

  content = content.replace("## [Unreleased]\n", newSection);

  // Add new compare link at bottom
  const newLink = `[${version}]: https://github.com/yourusername/etheria/releases/tag/v${version}`;
  content = content.replace(
    "[unreleased]:",
    `${newLink}\n[unreleased]:`
  );

  fs.writeFileSync(changelogPath, content);
}

function getEpigraph(version) {
  const epigraphs = {
    "0.0.1": "En el principio, solo existía el Vacío...",
    "0.0.2": "Ningún imperio se construye solo...",
    "0.0.3": "La paz es solo el preludio de la guerra...",
    "0.1.0": "Los muros temblaron ante el primer golpe...",
    "1.0.0": "Y así, en la ceniza de mil batallas, nació un nuevo mundo...",
  };
  return epigraphs[version] || "Un nuevo capítulo comienza...";
}

function updateReadme(version, name) {
  const readmePath = "README.md";
  let content = fs.readFileSync(readmePath, "utf8");
  content = content.replace(/\*\*.*v\d+\.\d+\.\d+.*\*\*/, `**${name} v${version}**`);
  content = content.replace(
    /\| 0\.0\.1 \| \*\*.*\*\* \|.*\|/,
    `| ${version} | **${name}** | ${new Date().toISOString().split("T")[0]} |`
  );
  fs.writeFileSync(readmePath, content);
}

// Main
const bumpType = process.argv[2] || "patch";
const currentPackage = JSON.parse(fs.readFileSync("package.json", "utf8"));
const currentVersion = currentPackage.version;
const newVersion = bumpVersion(currentVersion, bumpType);
const versionInfo = getVersionInfo(newVersion);

console.log(`\n⚔️  Etheria Release Script\n`);
console.log(`Current:  v${currentVersion}`);
console.log(`New:      v${newVersion} - ${versionInfo.name}\n`);

if (process.argv.includes("--dry-run")) {
  console.log("🏁 Dry run - no changes made.");
  process.exit(0);
}

updatePackageJson(newVersion);
updateChangelog(newVersion, versionInfo.name, bumpType);
updateReadme(newVersion, versionInfo.name);

console.log(`✅ Updated:`);
console.log(`   - package.json → v${newVersion}`);
console.log(`   - CHANGELOG.md → ${versionInfo.name}`);
console.log(`   - README.md → ${versionInfo.name}`);
console.log(`\n🚀 Next steps:`);
console.log(`   git add .`);
console.log(`   git commit -m "release: ${newVersion} - ${versionInfo.name}"`);
console.log(`   git tag v${newVersion}`);
console.log(`   git push origin main --tags`);
console.log();
