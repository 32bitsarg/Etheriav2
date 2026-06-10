// Optimizes public/assets images:
// 1. Deletes .png twins in buildings/generated when a same-name .webp exists
//    (the game only ever loads the .webp — see getBuildingTierImagePath).
// 2. Recompresses remaining .png files >150KB in place (palette, max compression)
//    when that actually shrinks them.
// Usage: node scripts/optimize-images.js [--dry-run]
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ASSETS = path.join(__dirname, '..', 'public', 'assets');
const DRY = process.argv.includes('--dry-run');
const MIN_SIZE = 150 * 1024;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

async function main() {
  const files = walk(ASSETS).filter((f) => !f.includes(`${path.sep}audio${path.sep}`));
  let freed = 0;

  // 1. Unreferenced PNG twins of generated building webps
  for (const f of files) {
    if (!f.endsWith('.png')) continue;
    if (!f.includes(`buildings${path.sep}generated`)) continue;
    const webp = f.replace(/\.png$/, '.webp');
    if (!fs.existsSync(webp)) continue;
    const size = fs.statSync(f).size;
    freed += size;
    console.log(`delete ${path.relative(ASSETS, f)} (${(size / 1024 / 1024).toFixed(1)}MB, .webp twin in use)`);
    if (!DRY) fs.unlinkSync(f);
  }

  // 2. Recompress remaining heavy PNGs in place
  for (const f of files) {
    if (!f.endsWith('.png') || !fs.existsSync(f)) continue;
    const before = fs.statSync(f).size;
    if (before < MIN_SIZE) continue;
    const buf = await sharp(f).png({ compressionLevel: 9, palette: true, quality: 90 }).toBuffer();
    if (buf.length < before * 0.9) {
      freed += before - buf.length;
      console.log(`shrink ${path.relative(ASSETS, f)}: ${(before / 1024).toFixed(0)}KB → ${(buf.length / 1024).toFixed(0)}KB`);
      if (!DRY) fs.writeFileSync(f, buf);
    }
  }

  console.log(`${DRY ? '[dry-run] would free' : 'freed'} ${(freed / 1024 / 1024).toFixed(1)}MB`);
}

main().catch((e) => { console.error(e); process.exit(1); });
