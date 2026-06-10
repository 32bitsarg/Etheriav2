// Makes the opaque nav icons transparent: flood-fills the near-white background
// from the image borders, downsizes to 256px and regenerates .png + .webp.
// Usage: node scripts/fix-nav-icons.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'public', 'assets', 'ui', 'nav-icons');
const THRESHOLD = 222; // r,g,b all above this = background candidate

async function keyOutBackground(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  const isBg = (i) => data[i] >= THRESHOLD && data[i + 1] >= THRESHOLD && data[i + 2] >= THRESHOLD;

  // BFS flood fill from all border pixels so white *inside* the artwork survives
  const visited = new Uint8Array(w * h);
  const queue = [];
  for (let x = 0; x < w; x++) { queue.push(x, (h - 1) * w + x); }
  for (let y = 0; y < h; y++) { queue.push(y * w, y * w + w - 1); }
  while (queue.length) {
    const p = queue.pop();
    if (visited[p]) continue;
    visited[p] = 1;
    const i = p * c;
    if (!isBg(i)) continue;
    data[i + 3] = 0;
    const x = p % w, y = (p / w) | 0;
    if (x > 0) queue.push(p - 1);
    if (x < w - 1) queue.push(p + 1);
    if (y > 0) queue.push(p - w);
    if (y < h - 1) queue.push(p + w);
  }

  const base = sharp(data, { raw: { width: w, height: h, channels: c } })
    .resize(256, 256, { fit: 'inside' });
  await base.clone().png({ compressionLevel: 9, palette: true }).toFile(file + '.tmp.png');
  await base.clone().webp({ quality: 90 }).toFile(file.replace(/\.png$/, '.webp') + '.tmp.webp');
  fs.renameSync(file + '.tmp.png', file);
  fs.renameSync(file.replace(/\.png$/, '.webp') + '.tmp.webp', file.replace(/\.png$/, '.webp'));
}

(async () => {
  for (const f of fs.readdirSync(DIR)) {
    if (!f.endsWith('.png')) continue;
    const file = path.join(DIR, f);
    const meta = await sharp(file).metadata();
    const stats = await sharp(file).stats();
    if (meta.hasAlpha && !stats.isOpaque) { console.log(`skip ${f} (already transparent)`); continue; }
    await keyOutBackground(file);
    console.log(`fixed ${f} → transparent 256px png+webp`);
  }
})();
