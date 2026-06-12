import type { TerrainKind } from "./worldTerrainConfigData.js";

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

// ── VALUE NOISE ───────────────────────────────────────────────────────────────

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
    lerp(hash(ix, iy, seed),     hash(ix + 1, iy, seed),     fx),
    lerp(hash(ix, iy + 1, seed), hash(ix + 1, iy + 1, seed), fx),
    fy
  );
}

// ── FRACTAL BROWNIAN MOTION ───────────────────────────────────────────────────

function fbm(x: number, y: number, seed: number, octaves: number): number {
  let v = 0, amp = 0.5, freq = 1.0, max = 0;
  for (let i = 0; i < octaves; i++) {
    v   += valueNoise(x * freq, y * freq, seed + i * 1997) * amp;
    max += amp;
    amp  *= 0.5;
    freq *= 2.0;
  }
  return v / max;
}

// ── DOMAIN WARPING ────────────────────────────────────────────────────────────
// Two-level warp (Inigo Quilez) — creates organic, non-circular coastlines.
// NOTE: warp is applied to raw noise BEFORE redistribution, so it only
// affects the spatial SHAPE of biomes, not their proportions.

function warpedNoise(x: number, y: number, seed: number): number {
  const s1 = seed, s2 = seed + 7919, s3 = seed + 15731, s4 = seed + 24137;
  const qx = fbm(x,           y,           s1, 5);
  const qy = fbm(x + 5.2,     y + 1.3,     s2, 5);
  const rx = fbm(x + 4.0*qx + 1.7, y + 4.0*qy + 9.2, s3, 4);
  const ry = fbm(x + 4.0*qx + 8.3, y + 4.0*qy + 2.8, s4, 4);
  return fbm(x + 3.0*rx, y + 3.0*ry, seed + 31337, 6);
}

// ── RANK-PERCENTILE REDISTRIBUTION ───────────────────────────────────────────
// Maps any noise distribution to a perfectly uniform [0,1].
// This guarantees exact biome proportions regardless of seed or warp params.

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

export function generateTerrain(seed: number, cols: number, rows: number): TerrainKind[] {
  const N = cols * rows;
  const rng = mulberry32(seed);

  const elevSeed  = (seed * 1009 + 7)   | 0;
  const moistSeed = (seed * 3001 + 17)  | 0;

  // Scale: how many noise units span the full map. Higher = more features.
  const SCALE = 3.5;

  // ── Step 1: Raw noise ─────────────────────────────────────────────────────
  const elevRaw  = new Float32Array(N);
  const moistRaw = new Float32Array(N);

  for (let i = 0; i < N; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const wx = (col / cols) * SCALE;
    const wy = (row / rows) * SCALE;
    elevRaw[i]  = warpedNoise(wx, wy, elevSeed);
    // Moisture: plain fbm, heavily offset to decorrelate from elevation
    moistRaw[i] = fbm(wx + 73.1, wy + 19.7, moistSeed, 5);
  }

  // ── Step 2: Rank redistribution → perfectly uniform [0,1] ─────────────────
  const elev  = rankPercentile(elevRaw);
  const moist = rankPercentile(moistRaw);

  // ── Step 3: Island mask on elevation ──────────────────────────────────────
  // Soft elliptical falloff that pushes only the outer ~30% toward water.
  // Power of 0.6 makes the transition very gradual so there's no hard border.
  for (let i = 0; i < N; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const dx = (col / cols - 0.5) * 2; // [-1, 1]
    const dy = (row / rows - 0.5) * 2;
    const dist = Math.pow(dx * dx + dy * dy, 0.6); // 0 at center, ~1 at corners
    const island = Math.max(0, 1 - dist * 0.88);   // only outer ~12% hits 0
    elev[i] *= island;
  }

  // ── Step 4: Second rank pass after island mask ────────────────────────────
  // Redistribution re-centers the masked elevation so thresholds are stable.
  const elev2 = rankPercentile(elev);

  // ── Step 5: Whittaker biome classification ────────────────────────────────
  // Thresholds are percentiles of the UNIFORM distribution, so they directly
  // control the fraction of tiles for each biome. No seed luck needed.
  //
  //  elev2 < 0.35          → WATER     (~35% of map)
  //  elev2 < 0.43          → COAST     (~8%)
  //  elev2 ≥ 0.85          → MOUNTAIN  (~15%)
  //  else, moist < 0.45    → PLAINS    (~22%)
  //  else                  → FOREST    (~20%)

  const cells: TerrainKind[] = new Array(N);

  for (let i = 0; i < N; i++) {
    const e = elev2[i];
    const m = moist[i];

    if (e < 0.35) {
      cells[i] = "WATER";
    } else if (e < 0.43) {
      cells[i] = "COAST";
    } else if (e >= 0.85) {
      cells[i] = "MOUNTAIN";
    } else if (m < 0.45) {
      cells[i] = "PLAINS";
    } else {
      cells[i] = "FOREST";
    }
  }

  // ── Step 6: Smooth isolated specks ───────────────────────────────────────
  // Any WATER tile surrounded by 6+ land neighbors → COAST (fills tiny water holes)
  // Any MOUNTAIN tile surrounded by 7 non-mountain → PLAINS (removes orphan peaks)
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

  // ── Step 7: Organic roads (1 tile wide, noise-displaced) ─────────────────
  const centerCol = Math.floor(cols / 2);
  const centerRow = Math.floor(rows / 2);

  for (let col = Math.floor(cols * 0.10); col < Math.floor(cols * 0.90); col++) {
    const t = (col - cols * 0.10) / (cols * 0.80);
    const disp = Math.round((rng() - 0.5) * 4 * Math.sin(t * Math.PI));
    const r = centerRow + disp;
    if (r >= 0 && r < rows) {
      const k = smoothed[r * cols + col];
      if (k !== "WATER" && k !== "MOUNTAIN" && rng() > 0.14) {
        smoothed[r * cols + col] = "ROAD";
      }
    }
  }

  for (let row = Math.floor(rows * 0.10); row < Math.floor(rows * 0.90); row++) {
    const t = (row - rows * 0.10) / (rows * 0.80);
    const disp = Math.round((rng() - 0.5) * 4 * Math.sin(t * Math.PI));
    const c = centerCol + disp;
    if (c >= 0 && c < cols) {
      const k = smoothed[row * cols + c];
      if (k !== "WATER" && k !== "MOUNTAIN" && rng() > 0.14) {
        smoothed[row * cols + c] = "ROAD";
      }
    }
  }

  return smoothed;
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
