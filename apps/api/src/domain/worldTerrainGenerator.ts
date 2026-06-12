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

function smoothstep(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10); // quintic for smoother transitions
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function valueNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smoothstep(x - ix);
  const fy = smoothstep(y - iy);
  return lerp(
    lerp(hash(ix, iy, seed), hash(ix + 1, iy, seed), fx),
    lerp(hash(ix, iy + 1, seed), hash(ix + 1, iy + 1, seed), fx),
    fy
  );
}

// ── FRACTAL BROWNIAN MOTION ───────────────────────────────────────────────────

function fbm(x: number, y: number, seed: number, octaves: number, lacunarity = 2.0, gain = 0.5): number {
  let v = 0, amp = 0.5, freq = 1.0, max = 0;
  for (let i = 0; i < octaves; i++) {
    v += valueNoise(x * freq, y * freq, seed + i * 1997) * amp;
    max += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return v / max;
}

// ── DOMAIN WARPING (Inigo Quilez two-level) ───────────────────────────────────

function warpedNoise(x: number, y: number, seed: number): number {
  const s1 = seed;
  const s2 = seed + 7919;
  const s3 = seed + 15731;
  const s4 = seed + 24137;

  // First warp layer
  const qx = fbm(x + 0.0,  y + 0.0,  s1, 5);
  const qy = fbm(x + 5.2,  y + 1.3,  s2, 5);

  // Second warp layer — amplified displacement for more drama
  const rx = fbm(x + 4.0 * qx + 1.7, y + 4.0 * qy + 9.2, s3, 4);
  const ry = fbm(x + 4.0 * qx + 8.3, y + 4.0 * qy + 2.8, s4, 4);

  return fbm(x + 3.5 * rx, y + 3.5 * ry, seed + 31337, 6);
}

// ── DISTANCE FUNCTIONS ────────────────────────────────────────────────────────

// Square bump — fills corners unlike circular masks, creates varied peninsula shapes
function squareBump(nx: number, ny: number): number {
  return 1.0 - (1.0 - nx * nx) * (1.0 - ny * ny);
}

// Radial gradient with slight squish to avoid perfect circle
function radialGradient(nx: number, ny: number, squish = 1.15): number {
  return Math.sqrt(nx * nx * squish + ny * ny / squish) * 2.0;
}

// ── TERRAIN GENERATION ────────────────────────────────────────────────────────

export function generateTerrain(seed: number, cols: number, rows: number): TerrainKind[] {
  const cells: TerrainKind[] = new Array(cols * rows);
  const rng = mulberry32(seed);

  // Unique seeds per layer — prevents correlation
  const elevSeed  = (seed * 1009 + 7)    | 0;
  const moistSeed = (seed * 2003 + 13)   | 0;
  const tempSeed  = (seed * 3001 + 17)   | 0;
  const warpSeed  = (seed * 4007 + 23)   | 0;
  const ridgeSeed = (seed * 5003 + 31)   | 0;

  // World-space scale — lower = larger features
  const SCALE = 3.2;

  // How much the island mask blends vs pure noise (0=all noise, 1=all mask)
  // 0.55 = noise dominates enough to create peninsulas and small satellite islands
  const MASK_BLEND = 0.52;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Normalized coords [-1..1]
      const nx = (col / cols) * 2 - 1;
      const ny = (row / rows) * 2 - 1;

      // Warped elevation — domain warping is the core improvement
      const wx = (col / cols) * SCALE;
      const wy = (row / rows) * SCALE;
      const elevation = warpedNoise(wx, wy, elevSeed);

      // Moisture (offset heavily to decorrelate from elevation)
      const moisture = fbm(wx + 13.7, wy + 8.3, moistSeed, 5);

      // Temperature (latitude-ish gradient + noise — colder at edges)
      const latitudeFactor = 1.0 - Math.abs(ny) * 0.6;
      const tempNoise = fbm(wx + 4.5, wy + 22.1, tempSeed, 3) * 0.4;
      const temperature = latitudeFactor * 0.6 + tempNoise;

      // Ridge noise for mountain ranges (absolute value of noise creates ridges)
      const ridgeRaw = fbm(wx * 1.5, wy * 1.5, ridgeSeed, 4);
      const ridge = 1.0 - Math.abs(ridgeRaw * 2 - 1); // peaks at 0.5 of raw

      // ── Island mask ──────────────────────────────────────────────────────
      // Blend square bump + asymmetric radial for irregular continent shapes
      const d1 = squareBump(nx, ny);
      const d2 = radialGradient(nx * 0.9, ny * 1.1); // slight horizontal stretch
      // Mix the two distance functions using warp noise for asymmetry
      const warpMix = fbm(wx * 0.5, wy * 0.5, warpSeed, 3) * 0.5 + 0.25;
      const dist = lerp(d1, Math.min(d2, 1), warpMix);

      // Apply island mask — blends noise with distance field
      const maskedElevation = lerp(elevation, 1.0 - dist, MASK_BLEND);

      // Boost ridge areas into mountains
      const finalElevation = maskedElevation + ridge * 0.12 * Math.max(0, maskedElevation - 0.35);

      // ── Biome classification ──────────────────────────────────────────────
      let kind: TerrainKind;

      if (finalElevation < 0.30) {
        kind = "WATER";
      } else if (finalElevation < 0.38) {
        kind = "COAST";
      } else if (finalElevation > 0.74) {
        // High elevation — mountains or snow
        kind = "MOUNTAIN";
      } else if (finalElevation > 0.60) {
        // Mid-high — forest on wet mountains, otherwise high plains
        kind = moisture > 0.45 ? "FOREST" : "MOUNTAIN";
      } else {
        // Mid elevation — biome based on moisture + temperature
        if (moisture > 0.68) {
          kind = "FOREST";
        } else if (moisture > 0.52 && temperature > 0.45) {
          kind = "FOREST";
        } else {
          kind = "PLAINS";
        }
      }

      cells[row * cols + col] = kind;
    }
  }

  // ── Post-process: smooth isolated specks ─────────────────────────────────
  // Any WATER tile surrounded by 6+ land neighbors becomes COAST
  // Any MOUNTAIN tile surrounded by 6+ non-mountain becomes PLAINS
  const smoothed = cells.slice();
  for (let row = 1; row < rows - 1; row++) {
    for (let col = 1; col < cols - 1; col++) {
      const i = row * cols + col;
      const kind = cells[i];

      if (kind === "WATER") {
        // Count land neighbors in 3x3
        let landCount = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const n = cells[(row + dr) * cols + (col + dc)];
            if (n !== "WATER") landCount++;
          }
        }
        if (landCount >= 6) smoothed[i] = "COAST";
      } else if (kind === "MOUNTAIN") {
        let nonMountain = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const n = cells[(row + dr) * cols + (col + dc)];
            if (n !== "MOUNTAIN") nonMountain++;
          }
        }
        if (nonMountain >= 7) smoothed[i] = "PLAINS";
      }
    }
  }

  // ── Post-process: carve organic roads ────────────────────────────────────
  // Roads follow noise-displaced paths instead of perfectly straight lines
  const centerCol = Math.floor(cols / 2);
  const centerRow = Math.floor(rows / 2);
  const roadStart = Math.floor(cols * 0.12);
  const roadEnd = Math.floor(cols * 0.88);

  for (let col = roadStart; col < roadEnd; col++) {
    // Displace road row with low-freq noise for organic look
    const t = col / cols;
    const disp = Math.round((rng() - 0.5) * 3 * Math.sin(t * Math.PI)); // taper at ends
    for (let dr = -1; dr <= 1; dr++) {
      const r = centerRow + dr + disp;
      if (r >= 0 && r < rows) {
        const k = smoothed[r * cols + col];
        if (k !== "WATER" && k !== "MOUNTAIN") smoothed[r * cols + col] = "ROAD";
      }
    }
  }
  for (let row = Math.floor(rows * 0.12); row < Math.floor(rows * 0.88); row++) {
    const t = row / rows;
    const disp = Math.round((rng() - 0.5) * 3 * Math.sin(t * Math.PI));
    for (let dc = -1; dc <= 1; dc++) {
      const c = centerCol + dc + disp;
      if (c >= 0 && c < cols) {
        const k = smoothed[row * cols + c];
        if (k !== "WATER" && k !== "MOUNTAIN") smoothed[row * cols + c] = "ROAD";
      }
    }
  }

  // Small breaks in road so it doesn't look perfectly carved
  for (let i = 0; i < smoothed.length; i++) {
    if (smoothed[i] === "ROAD" && rng() < 0.06) smoothed[i] = "PLAINS";
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
