import type { TerrainKind } from "./worldTerrainConfigData.js";
import { generateHeightmap } from "./azgaarHeightmap.js";

// ── PRNG (used for moisture + rivers) ────────────────────────────────────────

function mulberry32(seed: number) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── VALUE NOISE (for moisture) ────────────────────────────────────────────────

function hash(x: number, y: number, seed: number): number {
  const n = (x * 1619 + y * 31337 + seed * 1013) | 0;
  const m = (n ^ (n << 13)) ^ n;
  return (1 - ((m * (m * m * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824) * 0.5 + 0.5;
}

function quintic(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function valueNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = quintic(x - ix), fy = quintic(y - iy);
  return lerp(
    lerp(hash(ix, iy, seed), hash(ix + 1, iy, seed), fx),
    lerp(hash(ix, iy + 1, seed), hash(ix + 1, iy + 1, seed), fx),
    fy
  );
}

function fbm(x: number, y: number, seed: number, octaves: number): number {
  let v = 0, amp = 0.5, freq = 1.0, max = 0;
  for (let i = 0; i < octaves; i++) {
    v += valueNoise(x * freq, y * freq, seed + i * 1997) * amp;
    max += amp;
    amp *= 0.5;
    freq *= 2.0;
  }
  return v / max;
}

// ── RANK-PERCENTILE (guarantees uniform biome distribution) ──────────────────

function rankPercentile(arr: Float32Array): Float32Array {
  const n = arr.length;
  const indices = new Uint32Array(n);
  for (let i = 0; i < n; i++) indices[i] = i;
  indices.sort((a, b) => arr[a] - arr[b]);
  const result = new Float32Array(n);
  for (let rank = 0; rank < n; rank++) result[indices[rank]] = rank / (n - 1);
  return result;
}

// ── TERRAIN GENERATION ────────────────────────────────────────────────────────

export type TerrainData = { cells: TerrainKind[]; heights: Uint8Array };

export function generateTerrainData(seed: number, cols: number, rows: number): TerrainData {
  const N = cols * rows;
  const rng = mulberry32(seed + 77777);

  // ── Step 1: Azgaar heightmap ──────────────────────────────────────────────
  const hg = generateHeightmap(seed, cols, rows);

  // ── Step 2: Balance land/water ratio ──────────────────────────────────────
  // Target: 40–60% land. Adjust with Add ops (iterative).
  for (let attempt = 0; attempt < 12; attempt++) {
    let landCount = 0;
    for (let i = 0; i < N; i++) if (hg.h[i] >= 20) landCount++;
    const ratio = landCount / N;
    if (ratio >= 0.38 && ratio <= 0.62) break;
    const delta = ratio < 0.38 ? 3 : -3;
    for (let i = 0; i < N; i++) hg.h[i] = Math.min(100, Math.max(0, hg.h[i] + delta));
  }

  // ── Step 3: Moisture via FBM ──────────────────────────────────────────────
  const moistSeed = (seed * 3001 + 17) | 0;
  const SCALE = 3.5;
  const moistRaw = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    moistRaw[i] = fbm((col / cols) * SCALE + 73.1, (row / rows) * SCALE + 19.7, moistSeed, 5);
  }
  const moist = rankPercentile(moistRaw);

  // ── Step 4: Biome classification ──────────────────────────────────────────
  const cells: TerrainKind[] = new Array(N);
  for (let i = 0; i < N; i++) {
    const h = hg.h[i];
    const m = moist[i];
    if (h < 20) cells[i] = "WATER";
    else if (h < 24) cells[i] = "COAST";
    else if (h >= 72) cells[i] = "MOUNTAIN";
    else if (m > 0.55) cells[i] = "FOREST";
    else cells[i] = "PLAINS";
  }

  // ── Step 5: Rivers (greedy descent to sea) ────────────────────────────────
  // Find sources at high elevation, well-separated, then descend to water.
  const highTiles: number[] = [];
  for (let i = 0; i < N; i++) {
    if (hg.h[i] >= 60 && cells[i] === "MOUNTAIN") highTiles.push(i);
  }
  // Shuffle and pick 6 well-separated sources
  for (let i = highTiles.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [highTiles[i], highTiles[j]] = [highTiles[j], highTiles[i]];
  }
  const sources: number[] = [];
  for (const candidate of highTiles) {
    const col = candidate % cols;
    const row = Math.floor(candidate / cols);
    const tooClose = sources.some(s => {
      const sc = s % cols;
      const sr = Math.floor(s / cols);
      return Math.abs(sc - col) + Math.abs(sr - row) < 25;
    });
    if (!tooClose) sources.push(candidate);
    if (sources.length >= 6) break;
  }
  for (const src of sources) {
    let cur = src;
    const path = new Set<number>();
    for (let step = 0; step < cols + rows; step++) {
      if (hg.h[cur] < 20) break; // reached water
      path.add(cur);
      // Find steepest downhill neighbor
      let best = cur;
      let bestH = hg.h[cur];
      const col = cur % cols;
      const row = Math.floor(cur / cols);
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const nc = col + dc, nr = row + dr;
          if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
          const ni = nr * cols + nc;
          if (!path.has(ni) && hg.h[ni] < bestH) { bestH = hg.h[ni]; best = ni; }
        }
      }
      if (best === cur) break; // local minimum — stop
      cur = best;
    }
    // Mark river path as WATER
    for (const ri of path) {
      if (cells[ri] !== "WATER") cells[ri] = "WATER";
    }
  }

  // ── Step 6: Smooth isolated specks ────────────────────────────────────────
  const smoothed = cells.slice();
  for (let row = 1; row < rows - 1; row++) {
    for (let col = 1; col < cols - 1; col++) {
      const i = row * cols + col;
      const kind = cells[i];
      if (kind === "WATER") {
        let land = 0;
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++)
            if ((dr || dc) && cells[(row + dr) * cols + (col + dc)] !== "WATER") land++;
        if (land >= 6) smoothed[i] = "COAST";
      } else if (kind === "MOUNTAIN") {
        let other = 0;
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++)
            if ((dr || dc) && cells[(row + dr) * cols + (col + dc)] !== "MOUNTAIN") other++;
        if (other >= 7) smoothed[i] = "PLAINS";
      }
    }
  }

  // ── Step 7: Pack heights into Uint8 ───────────────────────────────────────
  const heights = new Uint8Array(N);
  for (let i = 0; i < N; i++) heights[i] = Math.round(Math.min(100, Math.max(0, hg.h[i])));

  return { cells: smoothed, heights };
}

// Compatibility wrapper (returns only cells)
export function generateTerrain(seed: number, cols: number, rows: number): TerrainKind[] {
  return generateTerrainData(seed, cols, rows).cells;
}

// ── RLE ───────────────────────────────────────────────────────────────────────

export function rleEncode(cells: TerrainKind[]): Array<[TerrainKind, number]> {
  const result: Array<[TerrainKind, number]> = [];
  let i = 0;
  while (i < cells.length) {
    const kind = cells[i];
    let count = 1;
    while (i + count < cells.length && cells[i + count] === kind) count++;
    result.push([kind, count]);
    i += count;
  }
  return result;
}

export function rleDecode(rle: Array<[TerrainKind, number]>): TerrainKind[] {
  const result: TerrainKind[] = [];
  for (const [kind, count] of rle) {
    for (let i = 0; i < count; i++) result.push(kind);
  }
  return result;
}
