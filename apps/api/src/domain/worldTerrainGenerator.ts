import type { TerrainKind } from "./worldTerrainConfigData.js";
import { generateHeightmap } from "./azgaarHeightmap.js";

// ── PRNG ─────────────────────────────────────────────────────────────────────

function mulberry32(seed: number) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── VALUE NOISE (for moisture FBM) ───────────────────────────────────────────

function hash(x: number, y: number, seed: number): number {
  const n = (x * 1619 + y * 31337 + seed * 1013) | 0;
  const m = (n ^ (n << 13)) ^ n;
  return (1 - ((m * (m * m * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824) * 0.5 + 0.5;
}

function quintic(t: number): number { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(a: number, b: number, t: number): number { return a + t * (b - a); }

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
    max += amp; amp *= 0.5; freq *= 2.0;
  }
  return v / max;
}

// ── RANK-PERCENTILE ──────────────────────────────────────────────────────────

function rankPercentile(arr: Float32Array): Float32Array {
  const n = arr.length;
  const indices = new Uint32Array(n);
  for (let i = 0; i < n; i++) indices[i] = i;
  indices.sort((a, b) => arr[a] - arr[b]);
  const result = new Float32Array(n);
  for (let rank = 0; rank < n; rank++) result[indices[rank]] = rank / (n - 1);
  return result;
}

// ── DEPRESSION FILLING (Azgaar preprocessing for rivers) ─────────────────────
// Raises each land cell that is lower than all its neighbors by a tiny amount,
// so greedy descent always finds a downhill path to water. Iterative.
function fillDepressions(h: Float32Array, cols: number, rows: number, iterations = 5) {
  for (let it = 0; it < iterations; it++) {
    let changed = false;
    for (let row = 1; row < rows - 1; row++) {
      for (let col = 1; col < cols - 1; col++) {
        const i = row * cols + col;
        if (h[i] < 20) continue; // skip water
        let minNb = h[i];
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (!dr && !dc) continue;
            const nb = (row + dr) * cols + (col + dc);
            if (h[nb] < minNb) minNb = h[nb];
          }
        }
        if (minNb >= h[i] && h[i] > 20) {
          // Depression: raise just above minimum neighbor
          h[i] = minNb + 0.15;
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
}

// ── FLUX-BASED RIVERS (Azgaar-style precipitation accumulation) ──────────────
// Each land cell accumulates precipitation flux from higher neighbors.
// Cells processed high→low; flux transferred to the lowest neighbor.
// River tiles form where accumulated flux exceeds MIN_FLUX.
// Rivers widen toward the mouth (higher flux = wider river).
function traceFluxRivers(
  h: Float32Array,
  cells: TerrainKind[],
  cols: number,
  rows: number,
  rng: () => number
): void {
  const N = cols * rows;
  // Precipitation: slightly randomized per cell so rivers are organic
  const prec = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    if (h[i] >= 20) prec[i] = 0.8 + rng() * 0.4; // land gets rain
  }

  // Sort land cells high→low
  const landCells: number[] = [];
  for (let i = 0; i < N; i++) if (h[i] >= 20) landCells.push(i);
  landCells.sort((a, b) => h[b] - h[a]);

  const flux = new Float32Array(N);
  // Seed flux with precipitation
  for (const i of landCells) flux[i] = prec[i];

  // Accumulate flux downhill — 4-directional only (NSEW) to avoid diagonal rivers
  for (const i of landCells) {
    const col = i % cols, row = Math.floor(i / cols);
    let bestNb = -1, bestH = h[i];
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]] as const) {
      const nc = col + dc, nr = row + dr;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      const nb = nr * cols + nc;
      if (h[nb] < bestH) { bestH = h[nb]; bestNb = nb; }
    }
    if (bestNb >= 0) flux[bestNb] += flux[i];
  }

  // MIN_FLUX threshold — percent of max flux so rivers scale correctly regardless of grid size.
  // Use top 1.5% of land-flux cells as rivers; widest 0.3% become WATER.
  const landFluxValues = landCells.map(i => flux[i]).filter(f => f > 0);
  landFluxValues.sort((a, b) => a - b);
  const pct985 = landFluxValues[Math.floor(landFluxValues.length * 0.985)] ?? 999999;
  const pct997 = landFluxValues[Math.floor(landFluxValues.length * 0.997)] ?? 999999;

  for (let i = 0; i < N; i++) {
    if (h[i] < 20 || h[i] >= 72) continue;
    if (flux[i] >= pct997) {
      cells[i] = "WATER"; // wide river mouths
    } else if (flux[i] >= pct985) {
      cells[i] = "COAST"; // narrow tributaries shown as coastal color
    }
  }
}

// ── TERRAIN GENERATION ────────────────────────────────────────────────────────

export type TerrainData = { cells: TerrainKind[]; heights: Uint8Array };

export function generateTerrainData(seed: number, cols: number, rows: number): TerrainData {
  const N = cols * rows;
  const rng = mulberry32(seed + 77777);

  // ── Step 1: Azgaar heightmap ──────────────────────────────────────────────
  const hg = generateHeightmap(seed, cols, rows);

  // ── Step 2: Balance land/water ratio ──────────────────────────────────────
  // Target: 82–92% land (continent map).
  for (let attempt = 0; attempt < 20; attempt++) {
    let landCount = 0;
    for (let i = 0; i < N; i++) if (hg.h[i] >= 20) landCount++;
    const ratio = landCount / N;
    if (ratio >= 0.82 && ratio <= 0.92) break;
    const delta = ratio < 0.82 ? 3 : -3;
    for (let i = 0; i < N; i++) hg.h[i] = Math.min(100, Math.max(0, hg.h[i] + delta));
  }

  // ── Step 2b: Guarantee inland lakes ──────────────────────────────────────
  {
    const minLakes = 2;
    const visited = new Uint8Array(N);
    let lakeCount = 0;
    for (let i = 0; i < N; i++) {
      if (hg.h[i] >= 20 || visited[i]) continue;
      const q: number[] = [i];
      visited[i] = 1;
      let touchesBorder = false;
      const component: number[] = [];
      while (q.length) {
        const ci = q.pop()!;
        const cc = ci % cols, cr = Math.floor(ci / cols);
        if (cc === 0 || cr === 0 || cc === cols - 1 || cr === rows - 1) touchesBorder = true;
        component.push(ci);
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (!dr && !dc) continue;
            const nc = cc + dc, nr = cr + dr;
            if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
            const ni = nr * cols + nc;
            if (!visited[ni] && hg.h[ni] < 20) { visited[ni] = 1; q.push(ni); }
          }
        }
      }
      if (!touchesBorder && component.length >= 4) lakeCount++;
    }
    const existingLakeCenters: Array<[number, number]> = [];
    if (lakeCount < minLakes) {
      const toCarve = minLakes - lakeCount;
      const border = Math.floor(Math.min(cols, rows) * 0.1);
      for (let attempt = 0; attempt < toCarve * 60 && existingLakeCenters.length < toCarve; attempt++) {
        const lc = border + Math.floor(rng() * (cols - border * 2));
        const lr = border + Math.floor(rng() * (rows - border * 2));
        const tooClose = existingLakeCenters.some(([ec, er]) =>
          Math.abs(ec - lc) + Math.abs(er - lr) < Math.floor(Math.min(cols, rows) * 0.15)
        );
        if (tooClose) continue;
        const startI = lr * cols + lc;
        const targetH = 10 + Math.floor(rng() * 6);
        const blobSize = Math.floor(N / 8000) + 10 + Math.floor(rng() * 20); // scale with grid
        const q2: number[] = [startI];
        const seen = new Set<number>([startI]);
        let carved = 0;
        while (q2.length && carved < blobSize) {
          const ci = q2.shift()!;
          hg.h[ci] = Math.min(hg.h[ci], targetH);
          carved++;
          const cc = ci % cols, cr = Math.floor(ci / cols);
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (!dr && !dc) continue;
              const nc = cc + dc, nr = cr + dr;
              if (nc <= 0 || nr <= 0 || nc >= cols - 1 || nr >= rows - 1) continue;
              const ni = nr * cols + nc;
              if (!seen.has(ni)) { seen.add(ni); q2.push(ni); }
            }
          }
        }
        existingLakeCenters.push([lc, lr]);
      }
    }
  }

  // ── Step 3: Depression filling (Azgaar preprocessing for rivers) ──────────
  // Must run BEFORE river tracing so flux has clear paths to water.
  fillDepressions(hg.h, cols, rows, 6);

  // ── Step 4: Moisture via FBM + water proximity ────────────────────────────
  const moistSeed = (seed * 3001 + 17) | 0;
  // Scale FBM to grid size — 4 cycles across the grid regardless of resolution
  const SCALE = 4.0;
  const moistRaw = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    moistRaw[i] = fbm((col / cols) * SCALE + 73.1, (row / rows) * SCALE + 19.7, moistSeed, 6);
  }

  // BFS water proximity (max 15 tiles → normalized 0–1)
  const waterProx = new Float32Array(N);
  {
    const MAX_DIST = 15;
    const distBuf = new Int16Array(N).fill(-1);
    const bfsQ: number[] = [];
    for (let i = 0; i < N; i++) {
      if (hg.h[i] < 20) { distBuf[i] = 0; bfsQ.push(i); }
    }
    let head = 0;
    while (head < bfsQ.length) {
      const ci = bfsQ[head++];
      const cc = ci % cols, cr = Math.floor(ci / cols);
      const d = distBuf[ci];
      if (d >= MAX_DIST) continue;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const nc = cc + dc, nr = cr + dr;
          if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
          const ni = nr * cols + nc;
          if (distBuf[ni] === -1) { distBuf[ni] = d + 1; bfsQ.push(ni); }
        }
      }
    }
    for (let i = 0; i < N; i++) {
      const d = distBuf[i] < 0 ? MAX_DIST : distBuf[i];
      waterProx[i] = 1 - Math.min(1, d / MAX_DIST);
    }
  }

  // Blend: 65% FBM + 35% water proximity, then rank-percentile
  const moistBlended = new Float32Array(N);
  for (let i = 0; i < N; i++) moistBlended[i] = moistRaw[i] * 0.65 + waterProx[i] * 0.35;
  const moist = rankPercentile(moistBlended);

  // ── Step 5: Biome classification ──────────────────────────────────────────
  // Temperature proxy: latitude (row) — north is colder.
  const cells: TerrainKind[] = new Array(N);
  for (let i = 0; i < N; i++) {
    const h = hg.h[i];
    const m = moist[i];
    const row = Math.floor(i / cols);
    const latNorm = row / (rows - 1); // 0=north, 1=south

    if (h < 20) { cells[i] = "WATER"; continue; }
    if (h < 27) { cells[i] = "COAST"; continue; }
    if (h >= 78) { cells[i] = "MOUNTAIN"; continue; }

    // High altitude frost line varies by latitude
    const frostLine = 68 - latNorm * 8; // 60–68 range
    if (h >= frostLine && m < 0.4) { cells[i] = "MOUNTAIN"; continue; }

    // Moisture + latitude → biome
    if (m > 0.62) {
      cells[i] = "FOREST";
    } else if (m > 0.35) {
      cells[i] = "PLAINS";
    } else {
      // Dry areas: plains near equator, more plains elsewhere (no desert type)
      cells[i] = "PLAINS";
    }
  }

  // ── Step 6: Flux-based rivers (Azgaar precipitation model) ───────────────
  traceFluxRivers(hg.h, cells, cols, rows, rng);

  // ── Step 7: Smooth isolated specks ───────────────────────────────────────
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
        if (land >= 7) smoothed[i] = "COAST";
      } else if (kind === "MOUNTAIN") {
        let other = 0;
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++)
            if ((dr || dc) && cells[(row + dr) * cols + (col + dc)] !== "MOUNTAIN") other++;
        if (other >= 7) smoothed[i] = "PLAINS";
      }
    }
  }

  // ── Step 8: Pack heights into Uint8 ──────────────────────────────────────
  const heights = new Uint8Array(N);
  for (let i = 0; i < N; i++) heights[i] = Math.round(Math.min(100, Math.max(0, hg.h[i])));

  return { cells: smoothed, heights };
}

// Compatibility wrapper
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
