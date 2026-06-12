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
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = quintic(x - ix);
  const fy = quintic(y - iy);
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

  const qx = fbm(x,        y,        s1, 5);
  const qy = fbm(x + 5.2,  y + 1.3,  s2, 5);
  const rx = fbm(x + 4.0 * qx + 1.7, y + 4.0 * qy + 9.2, s3, 4);
  const ry = fbm(x + 4.0 * qx + 8.3, y + 4.0 * qy + 2.8, s4, 4);

  return fbm(x + 3.5 * rx, y + 3.5 * ry, seed + 31337, 6);
}

// ── TERRAIN GENERATION ────────────────────────────────────────────────────────

export function generateTerrain(seed: number, cols: number, rows: number): TerrainKind[] {
  const rng = mulberry32(seed);

  // Per-layer seeds — prevent correlation
  const contSeed  = (seed * 1009 + 7)    | 0;  // continental low-freq shape
  const detSeed   = (seed * 2003 + 13)   | 0;  // warped detail
  const moistSeed = (seed * 3001 + 17)   | 0;  // moisture
  const tempSeed  = (seed * 4007 + 23)   | 0;  // temperature
  const ridgeSeed = (seed * 5003 + 31)   | 0;  // mountain ridges

  // Continental scale — low frequency determines macro land shape
  const CONT_SCALE   = 1.8;  // large features
  const DETAIL_SCALE = 3.5;  // fine detail (domain warped)
  const MOIST_SCALE  = 2.8;
  const TEMP_SCALE   = 2.0;
  const RIDGE_SCALE  = 2.6;

  // Edge falloff: push outermost 14% to ocean
  const MARGIN = 0.14;
  const marginCols = Math.floor(cols * MARGIN);
  const marginRows = Math.floor(rows * MARGIN);

  const cells: TerrainKind[] = new Array(cols * rows);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {

      // ── Elevation ─────────────────────────────────────────────────────
      const cx = (col / cols) * CONT_SCALE;
      const cy = (row / rows) * CONT_SCALE;
      const dx = (col / cols) * DETAIL_SCALE;
      const dy = (row / rows) * DETAIL_SCALE;

      // Continental noise: low frequency, determines overall land masses
      const continental = fbm(cx, cy, contSeed, 4);

      // Warped detail: high frequency domain-warped for organic coasts
      const detail = warpedNoise(dx, dy, detSeed);

      // Blend: continental drives the macro shape, detail adds variety
      let elevation = 0.55 * continental + 0.45 * detail;

      // ── Edge falloff (ocean border) ────────────────────────────────────
      // Only affects the outer MARGIN of the map — pulls toward 0 (WATER)
      const edgeX = Math.min(col, cols - 1 - col) / marginCols;
      const edgeY = Math.min(row, rows - 1 - row) / marginRows;
      const edgeFactor = Math.min(edgeX, edgeY, 1.0);
      const smoothEdge = edgeFactor * edgeFactor * (3 - 2 * edgeFactor); // smoothstep
      elevation = elevation * smoothEdge;

      // ── Ridge boost for mountain chains ───────────────────────────────
      if (elevation > 0.52) {
        const rx = (col / cols) * RIDGE_SCALE;
        const ry = (row / rows) * RIDGE_SCALE;
        const ridgeRaw = fbm(rx, ry, ridgeSeed, 3);
        const ridge = 1.0 - Math.abs(2 * ridgeRaw - 1); // peaks at 0.5
        elevation += ridge * 0.11 * Math.max(0, elevation - 0.52);
      }

      // ── Moisture + temperature ─────────────────────────────────────────
      const mx = (col / cols) * MOIST_SCALE;
      const my = (row / rows) * MOIST_SCALE;
      const moisture = fbm(mx + 17.3, my + 4.1, moistSeed, 5);

      const tx = (col / cols) * TEMP_SCALE;
      const ty = (row / rows) * TEMP_SCALE;
      const tempNoise = fbm(tx + 3.7, ty + 11.5, tempSeed, 3);
      // Temperature: warmer toward equator (center row), cooler toward poles
      const latitude = Math.abs((row / rows) - 0.5) * 2; // 0=equator, 1=pole
      const temperature = (1 - latitude * 0.5) * 0.7 + tempNoise * 0.3;

      // ── Biome classification ───────────────────────────────────────────
      let kind: TerrainKind;

      if (elevation < 0.36) {
        kind = "WATER";
      } else if (elevation < 0.43) {
        kind = "COAST";
      } else if (elevation > 0.76) {
        kind = "MOUNTAIN";
      } else if (elevation > 0.62) {
        // High mid elevation
        if (moisture > 0.52) kind = "FOREST";
        else kind = "MOUNTAIN";
      } else {
        // Mid elevation — moisture + temperature determine biome
        if (moisture > 0.65) {
          kind = "FOREST";
        } else if (moisture > 0.50 && temperature > 0.52) {
          kind = "FOREST";
        } else {
          kind = "PLAINS";
        }
      }

      cells[row * cols + col] = kind;
    }
  }

  // ── Post-process: remove isolated specks ─────────────────────────────────
  const smoothed = cells.slice();
  for (let row = 1; row < rows - 1; row++) {
    for (let col = 1; col < cols - 1; col++) {
      const i = row * cols + col;
      const kind = cells[i];

      if (kind === "WATER") {
        let landCount = 0;
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++)
            if ((dr || dc) && cells[(row + dr) * cols + (col + dc)] !== "WATER") landCount++;
        if (landCount >= 6) smoothed[i] = "COAST";
      } else if (kind === "MOUNTAIN") {
        let nonMountain = 0;
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++)
            if ((dr || dc) && cells[(row + dr) * cols + (col + dc)] !== "MOUNTAIN") nonMountain++;
        if (nonMountain >= 7) smoothed[i] = "PLAINS";
      }
    }
  }

  // ── Post-process: organic roads (1 tile wide, noise-displaced) ───────────
  // Roads only placed on existing land — skip WATER and MOUNTAIN
  const centerCol = Math.floor(cols / 2);
  const centerRow = Math.floor(rows / 2);

  // Horizontal road
  for (let col = Math.floor(cols * 0.10); col < Math.floor(cols * 0.90); col++) {
    const t = (col - cols * 0.10) / (cols * 0.80);
    // Smooth displacement: more wiggly in the middle, anchored at ends
    const maxDisp = 3;
    const disp = Math.round((rng() - 0.5) * maxDisp * Math.sin(t * Math.PI));
    const r = centerRow + disp;
    if (r >= 1 && r < rows - 1) {
      const k = smoothed[r * cols + col];
      if (k !== "WATER" && k !== "MOUNTAIN" && rng() > 0.12) {
        smoothed[r * cols + col] = "ROAD";
      }
    }
  }

  // Vertical road
  for (let row = Math.floor(rows * 0.10); row < Math.floor(rows * 0.90); row++) {
    const t = (row - rows * 0.10) / (rows * 0.80);
    const maxDisp = 3;
    const disp = Math.round((rng() - 0.5) * maxDisp * Math.sin(t * Math.PI));
    const c = centerCol + disp;
    if (c >= 1 && c < cols - 1) {
      const k = smoothed[row * cols + c];
      if (k !== "WATER" && k !== "MOUNTAIN" && rng() > 0.12) {
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
