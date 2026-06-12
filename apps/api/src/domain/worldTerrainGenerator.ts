import type { TerrainKind } from "./worldTerrainConfigData.js";

// Seeded pseudo-random number generator (mulberry32)
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Simple value noise: hash (x, y, seed) → [0,1]
function valueNoise(x: number, y: number, seed: number): number {
  const n = x + y * 57 + seed * 131;
  const m = (n << 13) ^ n;
  return (1 - ((m * (m * m * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824) * 0.5 + 0.5;
}

// Smooth interpolation
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function interpolate(a: number, b: number, t: number): number {
  return a + smoothstep(t) * (b - a);
}

// Bilinear noise (smooth value noise)
function smoothNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;

  const a = valueNoise(ix, iy, seed);
  const b = valueNoise(ix + 1, iy, seed);
  const c = valueNoise(ix, iy + 1, seed);
  const d = valueNoise(ix + 1, iy + 1, seed);

  return interpolate(interpolate(a, b, fx), interpolate(c, d, fx), fy);
}

// Multi-octave fractal noise
function fractalNoise(x: number, y: number, seed: number, octaves = 5): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += smoothNoise(x * frequency, y * frequency, seed + i * 997) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / maxValue;
}

/**
 * Generate a procedural terrain grid.
 * Returns an array of TerrainKind with length cols * rows (row-major order).
 */
export function generateTerrain(seed: number, cols: number, rows: number): TerrainKind[] {
  const cells: TerrainKind[] = new Array(cols * rows);
  const rng = mulberry32(seed);

  // Two separate noise layers: elevation and moisture
  const elevSeed = (seed * 1009 + 7) | 0;
  const moistSeed = (seed * 2003 + 13) | 0;

  // Scale: how many noise units per row/col
  const scale = 4.0; // lower = larger features

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const nx = (col / cols) * scale;
      const ny = (row / rows) * scale;

      const elevation = fractalNoise(nx, ny, elevSeed, 5);
      const moisture = fractalNoise(nx + 100, ny + 100, moistSeed, 4);

      // Distance from center (circular landmass)
      const dx = (col / cols) - 0.5;
      const dy = (row / rows) - 0.5;
      const distFromCenter = Math.sqrt(dx * dx + dy * dy) * 2; // 0 at center, 1 at corners

      // Apply island mask: push edges toward water
      const islandFactor = Math.max(0, 1 - distFromCenter * 1.1);
      const adjustedElevation = elevation * islandFactor;

      let kind: TerrainKind;

      if (adjustedElevation < 0.18) {
        kind = "WATER";
      } else if (adjustedElevation < 0.24) {
        kind = "COAST";
      } else if (adjustedElevation > 0.72) {
        kind = "MOUNTAIN";
      } else if (moisture > 0.62 && adjustedElevation > 0.3) {
        kind = "FOREST";
      } else {
        kind = "PLAINS";
      }

      cells[row * cols + col] = kind;
    }
  }

  // Post-process: carve roads from center outward in 4 directions
  const centerCol = Math.floor(cols / 2);
  const centerRow = Math.floor(rows / 2);

  // Horizontal road (center row ±2)
  for (let col = Math.floor(cols * 0.15); col < Math.floor(cols * 0.85); col++) {
    for (let dr = -1; dr <= 1; dr++) {
      const r = centerRow + dr;
      if (r >= 0 && r < rows) {
        const kind = cells[r * cols + col];
        if (kind !== "WATER" && kind !== "MOUNTAIN") cells[r * cols + col] = "ROAD";
      }
    }
  }

  // Vertical road (center col ±1)
  for (let row = Math.floor(rows * 0.15); row < Math.floor(rows * 0.85); row++) {
    for (let dc = -1; dc <= 1; dc++) {
      const c = centerCol + dc;
      if (c >= 0 && c < cols) {
        const kind = cells[row * cols + c];
        if (kind !== "WATER" && kind !== "MOUNTAIN") cells[row * cols + c] = "ROAD";
      }
    }
  }

  // Small random variation on road tiles using rng (prevents perfectly straight roads)
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] === "ROAD" && rng() < 0.08) {
      cells[i] = "PLAINS";
    }
  }

  return cells;
}

/** RLE-compress a terrain array for efficient storage/transfer */
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

/** Decompress RLE terrain data */
export function rleDecode(rle: Array<[TerrainKind, number]>): TerrainKind[] {
  const result: TerrainKind[] = [];
  for (const [kind, count] of rle) {
    for (let i = 0; i < count; i++) result.push(kind);
  }
  return result;
}
