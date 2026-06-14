// Pure render functions extracted from world.ts — no I/O, no imports, runs in worker threads.

export type TerrainKind = 'WATER' | 'COAST' | 'PLAINS' | 'FOREST' | 'MOUNTAIN' | 'HILLS' | 'DESERT' | 'SWAMP' | 'TUNDRA' | 'JUNGLE' | 'SAVANNA' | 'TAIGA' | 'SNOW';

// ─── TerrainKind ↔ numeric code mapping ──────────────────────────────────────

export const CODE_KIND: TerrainKind[] = [
  'WATER', 'COAST', 'PLAINS', 'FOREST', 'MOUNTAIN', 'HILLS',
  'DESERT', 'SWAMP', 'TUNDRA', 'JUNGLE', 'SAVANNA', 'TAIGA', 'SNOW',
] as TerrainKind[];

export const KIND_CODE: Record<string, number> = Object.fromEntries(
  CODE_KIND.map((k, i) => [k, i])
);

// ─── Math helpers ─────────────────────────────────────────────────────────────

function tileHash(col: number, row: number): number {
  const n = (col * 1619 + row * 31337) | 0;
  return ((n ^ (n << 13)) ^ n) >>> 0;
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function vhash(x: number, y: number, s: number): number {
  let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 982451653)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}

function vnoise(x: number, y: number, s: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  return vhash(ix, iy, s) * (1 - ux) * (1 - uy) + vhash(ix + 1, iy, s) * ux * (1 - uy)
    + vhash(ix, iy + 1, s) * (1 - ux) * uy + vhash(ix + 1, iy + 1, s) * ux * uy;
}

function biomeTexture(kind: string, cx: number, cy: number): number {
  switch (kind) {
    case "FOREST": {
      const canopy  = vnoise(cx * 1.4, cy * 1.4, 7);
      const lightNW = vnoise(cx * 3.0 - 0.28, cy * 3.0 - 0.28, 9);
      const micro   = vnoise(cx * 6.5, cy * 6.5, 13);
      if (canopy > 0.52) {
        const edgeFade = Math.min(1, (canopy - 0.52) / 0.20);
        return 0.84 + lightNW * 0.32 * edgeFade + micro * 0.06;
      }
      if (canopy > 0.41) return 0.66 + micro * 0.10;
      return 0.80 + micro * 0.14;
    }
    case "JUNGLE": {
      const canopy = vnoise(cx * 1.8, cy * 1.8, 23);
      const under  = vnoise(cx * 4.0, cy * 4.0, 29);
      const micro  = vnoise(cx * 8.0, cy * 8.0, 31);
      if (canopy > 0.55) return 0.72 + under * 0.20 + micro * 0.05;
      if (canopy > 0.40) return 0.58 + micro * 0.12;
      return 0.78 + micro * 0.10;
    }
    case "SAVANNA": {
      const grass = vnoise(cx * 1.2, cy * 1.2, 37);
      const tree  = vnoise(cx * 3.5, cy * 3.5, 41);
      if (tree > 0.82) return 0.72 + grass * 0.12;
      return 0.92 + grass * 0.18;
    }
    case "TAIGA": {
      const conifer = vnoise(cx * 2.2, cy * 2.2, 43);
      const snow    = vnoise(cx * 5.0, cy * 5.0, 47);
      if (conifer > 0.60) return 0.68 + snow * 0.18;
      return 0.88 + snow * 0.10;
    }
    case "DESERT":
      return 1 + Math.sin(cx * 1.7 + cy * 0.5 + vnoise(cx * 0.25, cy * 0.25, 3) * 7) * 0.055
        + (vnoise(cx * 0.8, cy * 0.8, 53) > 0.92 ? -0.12 : 0);
    case "MOUNTAIN": {
      const ridge  = vnoise(cx * 2.1, cy * 2.1, 5);
      const rock   = vnoise(cx * 5.0, cy * 5.0, 59);
      const mote   = rock > 0.78 ? 0.14 : (rock < 0.22 ? -0.10 : 0);
      return 1 + (ridge - 0.5) * 0.42 + mote;
    }
    case "HILLS": {
      const roll = vnoise(cx * 1.7, cy * 1.7, 15);
      const rock = vnoise(cx * 4.5, cy * 4.5, 61);
      const mote = rock > 0.80 ? 0.10 : 0;
      return 1 + (roll - 0.5) * 0.32 + mote;
    }
    case "SWAMP": {
      let t = 1 + (vnoise(cx * 1.1, cy * 1.1, 11) - 0.5) * 0.30;
      if (vnoise(cx * 2.5, cy * 2.5, 17) > 0.85) t *= 1.12;
      return t;
    }
    case "PLAINS": {
      const grass = vnoise(cx * 0.9, cy * 0.9, 13);
      const grove = vnoise(cx * 3.0, cy * 3.0, 67);
      if (grove > 0.85) return 0.80 + grass * 0.08;
      return 1 + (grass - 0.5) * 0.16;
    }
    case "TUNDRA":
      return 1 + (vnoise(cx * 1.0, cy * 1.0, 19) - 0.5) * 0.14;
    default:
      return 1;
  }
}

function biomeColor(kind: string, hN: number, tc: number, tr: number): [number, number, number] {
  const j = ((tileHash(tc, tr) & 15) - 7) * 0.42;
  switch (kind) {
    case "WATER": {
      const t = Math.max(0, Math.min(1, hN / 0.19));
      return [Math.round(lerp(10, 42, t) + j), Math.round(lerp(30, 88, t) + j), Math.round(lerp(72, 140, t) + j)];
    }
    case "COAST":
      return [Math.round(198 + j), Math.round(180 + j), Math.round(126 + j)];
    case "PLAINS": {
      const t = Math.max(0, Math.min(1, (hN - 0.24) / 0.48));
      return [Math.round(lerp(78, 96, t) + j), Math.round(lerp(120, 140, t) + j), Math.round(lerp(48, 60, t) + j)];
    }
    case "FOREST": {
      const t = Math.max(0, Math.min(1, (hN - 0.24) / 0.48));
      return [Math.round(lerp(30, 50, t) + j), Math.round(lerp(74, 96, t) + j), Math.round(lerp(24, 38, t) + j)];
    }
    case "MOUNTAIN": {
      const t = Math.max(0, Math.min(1, (hN - 0.72) / 0.28));
      if (t < 0.72) {
        const u = t / 0.72;
        return [Math.round(lerp(102, 144, u) + j), Math.round(lerp(90, 138, u) + j), Math.round(lerp(76, 130, u) + j)];
      }
      const u = (t - 0.72) / 0.28;
      return [Math.round(lerp(144, 232, u) + j), Math.round(lerp(138, 236, u) + j), Math.round(lerp(130, 240, u) + j)];
    }
    case "HILLS": {
      const t = Math.max(0, Math.min(1, (hN - 0.50) / 0.30));
      return [Math.round(lerp(104, 150, t) + j), Math.round(lerp(116, 138, t) + j), Math.round(lerp(64, 88, t) + j)];
    }
    case "DESERT":
      return [Math.round(212 + j), Math.round(190 + j), Math.round(134 + j)];
    case "SWAMP":
      return [Math.round(78 + j), Math.round(92 + j), Math.round(58 + j)];
    case "TUNDRA": {
      const t = Math.max(0, Math.min(1, (hN - 0.20) / 0.45));
      return [Math.round(lerp(158, 196, t) + j), Math.round(lerp(164, 202, t) + j), Math.round(lerp(150, 196, t) + j)];
    }
    case "JUNGLE": {
      const t = Math.max(0, Math.min(1, (hN - 0.24) / 0.40));
      return [Math.round(lerp(18, 36, t) + j), Math.round(lerp(68, 90, t) + j), Math.round(lerp(24, 42, t) + j)];
    }
    case "SAVANNA": {
      const t = Math.max(0, Math.min(1, (hN - 0.24) / 0.40));
      return [Math.round(lerp(168, 186, t) + j), Math.round(lerp(154, 172, t) + j), Math.round(lerp(60, 78, t) + j)];
    }
    case "TAIGA": {
      const t = Math.max(0, Math.min(1, (hN - 0.22) / 0.42));
      return [Math.round(lerp(42, 60, t) + j), Math.round(lerp(74, 98, t) + j), Math.round(lerp(62, 78, t) + j)];
    }
    default:
      return [80, 80, 80];
  }
}

function heightAt(heights: Uint8Array, cols: number, rows: number, c: number, r: number): number {
  const cc = c < 0 ? 0 : c >= cols ? cols - 1 : c;
  const rr = r < 0 ? 0 : r >= rows ? rows - 1 : r;
  return heights[rr * cols + cc];
}

function sampleHeight(heights: Uint8Array, cols: number, rows: number, fx: number, fy: number): number {
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const tx = fx - x0, ty = fy - y0;
  const h00 = heightAt(heights, cols, rows, x0, y0);
  const h10 = heightAt(heights, cols, rows, x0 + 1, y0);
  const h01 = heightAt(heights, cols, rows, x0, y0 + 1);
  const h11 = heightAt(heights, cols, rows, x0 + 1, y0 + 1);
  return h00 * (1 - tx) * (1 - ty) + h10 * tx * (1 - ty) + h01 * (1 - tx) * ty + h11 * tx * ty;
}

export function terrainPixelRGB(
  cellsCode: Uint8Array,
  heights: Uint8Array,
  cols: number,
  rows: number,
  cellXf: number,
  cellYf: number,
): [number, number, number] {
  const col = cellXf < 0 ? 0 : cellXf >= cols ? cols - 1 : Math.floor(cellXf);
  const row = cellYf < 0 ? 0 : cellYf >= rows ? rows - 1 : Math.floor(cellYf);
  const kind = CODE_KIND[cellsCode[row * cols + col]] ?? 'PLAINS';

  const hVal = sampleHeight(heights, cols, rows, cellXf, cellYf);
  const hL = sampleHeight(heights, cols, rows, cellXf - 0.5, cellYf);
  const hR = sampleHeight(heights, cols, rows, cellXf + 0.5, cellYf);
  const hU = sampleHeight(heights, cols, rows, cellXf, cellYf - 0.5);
  const hD = sampleHeight(heights, cols, rows, cellXf, cellYf + 0.5);
  let shade = Math.min(1.34, Math.max(0.68, 1 + ((hR - hL) - (hD - hU)) * 0.020));
  const occ = (hL + hR + hU + hD) / 4 - hVal;
  if (occ > 0) shade *= 1 - Math.min(0.12, occ * 0.012);

  const mod = shade * biomeTexture(kind, cellXf, cellYf);
  let [r, g, b] = biomeColor(kind, hVal / 100, col, row);
  r *= mod; g *= mod; b *= mod;

  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
  r = gray + (r - gray) * 1.18; g = gray + (g - gray) * 1.18; b = gray + (b - gray) * 1.18;
  const sc = (v: number) => { const t = Math.max(0, Math.min(1, v / 255)); return (t * t * (3 - 2 * t) * 0.25 + t * 0.75) * 255; };
  r = sc(r); g = sc(g); b = sc(b);

  const nx = 2 * cellXf / cols - 1, ny = 2 * cellYf / rows - 1;
  const dist = Math.sqrt(nx * nx + ny * ny) / Math.SQRT2;
  const t = Math.max(0, (dist - 0.25) / 0.75);
  const darkness = t * t * 0.38;
  r *= 1 - darkness; g *= 1 - darkness; b *= 1 - darkness;

  return [
    r < 0 ? 0 : r > 255 ? 255 : Math.round(r),
    g < 0 ? 0 : g > 255 ? 255 : Math.round(g),
    b < 0 ? 0 : b > 255 ? 255 : Math.round(b),
  ];
}

// ─── Raw pixel buffer renderers ───────────────────────────────────────────────

export interface TerrainSource {
  cellsCode: Uint8Array;
  heights: Uint8Array;
  cols: number;
  rows: number;
  version: string;
}

const TILE_PX = 256;
const TILE_SS = 2;

export function renderTileRaw(src: TerrainSource, z: number, tx: number, ty: number): Buffer {
  const { cellsCode, heights, cols, rows } = src;
  const span = 1 << z;
  const cellsPerTile = cols / span;
  const cell0X = tx * cellsPerTile;
  const cell0Y = ty * cellsPerTile;
  const dim = TILE_PX * TILE_SS;
  const raw = Buffer.alloc(dim * dim * 3);
  const step = cellsPerTile / dim;

  for (let py = 0; py < dim; py++) {
    const cellYf = cell0Y + (py + 0.5) * step;
    for (let px = 0; px < dim; px++) {
      const cellXf = cell0X + (px + 0.5) * step;
      const [r, g, b] = terrainPixelRGB(cellsCode, heights, cols, rows, cellXf, cellYf);
      const idx = (py * dim + px) * 3;
      raw[idx] = r; raw[idx + 1] = g; raw[idx + 2] = b;
    }
  }
  return raw;
}

export function renderOverviewRaw(src: TerrainSource, variant: string): { raw: Buffer; imgW: number; imgH: number } {
  const { cellsCode, heights, cols, rows } = src;
  const SCALE = Math.max(1, Math.round(2600 / cols));
  const imgW = cols * SCALE;
  const imgH = rows * SCALE;
  const raw = Buffer.alloc(imgW * imgH * 3);

  for (let py = 0; py < imgH; py++) {
    const cellYf = py / SCALE;
    for (let px = 0; px < imgW; px++) {
      const [r, g, b] = terrainPixelRGB(cellsCode, heights, cols, rows, px / SCALE, cellYf);
      const idx = (py * imgW + px) * 3;
      raw[idx] = r; raw[idx + 1] = g; raw[idx + 2] = b;
    }
  }
  return { raw, imgW, imgH };
}
