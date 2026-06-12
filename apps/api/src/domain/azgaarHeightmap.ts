// Port of Azgaar Fantasy Map Generator heightmap operations
// Original: https://github.com/Azgaar/Fantasy-Map-Generator — MIT License
// Adapted for 200×200 rectangular grid with mulberry32 PRNG (no D3, no browser deps)

export type HeightGrid = {
  h: Float32Array; // heights 0–100; sea level = 20
  cols: number;
  rows: number;
};

type RNG = () => number;

function mulberry32(seed: number): RNG {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function neighbors8(i: number, cols: number, rows: number): number[] {
  const col = i % cols;
  const row = Math.floor(i / cols);
  const ns: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nc = col + dc;
      const nr = row + dr;
      if (nc >= 0 && nr >= 0 && nc < cols && nr < rows) ns.push(nr * cols + nc);
    }
  }
  return ns;
}

// ── Operations (Azgaar port) ──────────────────────────────────────────────────

function addHill(g: HeightGrid, rng: RNG, count: number, height: [number, number], rangeX: [number, number], rangeY: [number, number]) {
  const { h, cols, rows } = g;
  const blobPower = 0.993;
  for (let n = 0; n < count; n++) {
    const px = (rangeX[0] + rng() * (rangeX[1] - rangeX[0])) / 100;
    const py = (rangeY[0] + rng() * (rangeY[1] - rangeY[0])) / 100;
    const peak = height[0] + rng() * (height[1] - height[0]);
    const startI = Math.min(cols * rows - 1, Math.floor(py * rows) * cols + Math.floor(px * cols));
    const queue: [number, number][] = [[startI, peak]];
    const visited = new Set<number>();
    while (queue.length) {
      const [i, change] = queue.shift()!;
      if (visited.has(i)) continue;
      visited.add(i);
      h[i] = Math.min(100, h[i] + change);
      for (const nb of neighbors8(i, cols, rows)) {
        if (!visited.has(nb)) {
          const next = change ** blobPower * (0.9 + rng() * 0.2);
          if (next > 0.1) queue.push([nb, next]);
        }
      }
    }
  }
}

function addPit(g: HeightGrid, rng: RNG, count: number, depth: [number, number], rangeX: [number, number], rangeY: [number, number]) {
  const { h, cols, rows } = g;
  const blobPower = 0.993;
  for (let n = 0; n < count; n++) {
    const px = (rangeX[0] + rng() * (rangeX[1] - rangeX[0])) / 100;
    const py = (rangeY[0] + rng() * (rangeY[1] - rangeY[0])) / 100;
    const d = depth[0] + rng() * (depth[1] - depth[0]);
    const startI = Math.min(cols * rows - 1, Math.floor(py * rows) * cols + Math.floor(px * cols));
    const queue: [number, number][] = [[startI, d]];
    const visited = new Set<number>();
    while (queue.length) {
      const [i, change] = queue.shift()!;
      if (visited.has(i)) continue;
      visited.add(i);
      h[i] = Math.max(0, h[i] - change);
      for (const nb of neighbors8(i, cols, rows)) {
        if (!visited.has(nb)) {
          const next = change ** blobPower * (0.9 + rng() * 0.2);
          if (next > 0.1) queue.push([nb, next]);
        }
      }
    }
  }
}

function addRange(g: HeightGrid, rng: RNG, count: number, height: number, rangeX: [number, number], rangeY: [number, number]) {
  const { h, cols, rows } = g;
  const linePower = 0.84;
  for (let n = 0; n < count; n++) {
    const fromC = Math.floor((rangeX[0] / 100 + rng() * (rangeX[1] - rangeX[0]) / 100) * cols);
    const fromR = Math.floor((rangeY[0] / 100 + rng() * (rangeY[1] - rangeY[0]) / 100) * rows);
    const toC = Math.floor(rng() * cols);
    const toR = Math.floor(rng() * rows);
    let curC = fromC, curR = fromR, curH = height;
    const visited = new Set<number>();
    for (let step = 0; step < (cols + rows) * 3 && curH > 0.5; step++) {
      const i = Math.max(0, Math.min(rows - 1, curR)) * cols + Math.max(0, Math.min(cols - 1, curC));
      if (!visited.has(i)) { visited.add(i); h[i] = Math.min(100, h[i] + curH); }
      curH *= linePower;
      if (rng() < 0.15) {
        curC += rng() < 0.5 ? 1 : -1;
        curR += rng() < 0.5 ? 1 : -1;
      } else {
        curC += Math.sign(toC - curC) || (rng() < 0.5 ? 1 : -1);
        curR += Math.sign(toR - curR) || (rng() < 0.5 ? 1 : -1);
      }
    }
  }
}

function addTrough(g: HeightGrid, rng: RNG, count: number, depth: number, rangeX: [number, number], rangeY: [number, number]) {
  const { h, cols, rows } = g;
  const linePower = 0.84;
  for (let n = 0; n < count; n++) {
    const fromC = Math.floor((rangeX[0] / 100 + rng() * (rangeX[1] - rangeX[0]) / 100) * cols);
    const fromR = Math.floor((rangeY[0] / 100 + rng() * (rangeY[1] - rangeY[0]) / 100) * rows);
    const toC = Math.floor(rng() * cols);
    const toR = Math.floor(rng() * rows);
    let curC = fromC, curR = fromR, curD = depth;
    for (let step = 0; step < (cols + rows) * 3 && curD > 0.5; step++) {
      const i = Math.max(0, Math.min(rows - 1, curR)) * cols + Math.max(0, Math.min(cols - 1, curC));
      h[i] = Math.max(0, h[i] - curD);
      curD *= linePower;
      if (rng() < 0.15) {
        curC += rng() < 0.5 ? 1 : -1;
        curR += rng() < 0.5 ? 1 : -1;
      } else {
        curC += Math.sign(toC - curC) || (rng() < 0.5 ? 1 : -1);
        curR += Math.sign(toR - curR) || (rng() < 0.5 ? 1 : -1);
      }
    }
  }
}

function modifyGrid(g: HeightGrid, range: "all" | "land" | "sea", add: number, mult: number) {
  const { h } = g;
  for (let i = 0; i < h.length; i++) {
    const isLand = h[i] >= 20;
    if (range === "land" && !isLand) continue;
    if (range === "sea" && isLand) continue;
    h[i] = Math.min(100, Math.max(0, h[i] * mult + add));
  }
}

function smooth(g: HeightGrid, iterations: number) {
  const { h, cols, rows } = g;
  for (let it = 0; it < iterations; it++) {
    const tmp = h.slice();
    for (let i = 0; i < h.length; i++) {
      const ns = neighbors8(i, cols, rows);
      let sum = tmp[i];
      for (const nb of ns) sum += tmp[nb];
      h[i] = sum / (ns.length + 1);
    }
  }
}

function maskEdge(g: HeightGrid, power: number) {
  const { h, cols, rows } = g;
  for (let i = 0; i < h.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const nx = (col / (cols - 1)) * 2 - 1;
    const ny = (row / (rows - 1)) * 2 - 1;
    const bump = Math.max(0, (1 - nx * nx) * (1 - ny * ny));
    h[i] = Math.min(100, Math.max(0, (h[i] * (power - 1) + h[i] * bump) / power));
  }
}

// ── Template runner ───────────────────────────────────────────────────────────

function parseRange(s: string): [number, number] {
  const parts = s.split("-").map(Number);
  return [parts[0], parts.length > 1 ? parts[1] : parts[0]];
}

export function runTemplate(g: HeightGrid, rng: RNG, template: string) {
  for (const line of template.trim().split("\n")) {
    const parts = line.trim().split(/\s+/);
    const op = parts[0]?.toLowerCase();
    if (!op) continue;
    if (op === "hill")     addHill(g, rng, +parts[1], parseRange(parts[2]), parseRange(parts[3]), parseRange(parts[4]));
    else if (op === "pit") addPit(g, rng, +parts[1], parseRange(parts[2]), parseRange(parts[3]), parseRange(parts[4]));
    else if (op === "range") addRange(g, rng, +parts[1], +parts[2], parseRange(parts[3]), parseRange(parts[4]));
    else if (op === "trough") addTrough(g, rng, +parts[1], +parts[2], parseRange(parts[3]), parseRange(parts[4]));
    else if (op === "add") modifyGrid(g, (parts[2] as "all" | "land" | "sea") ?? "all", +parts[1], 1);
    else if (op === "multiply") modifyGrid(g, (parts[2] as "all" | "land" | "sea") ?? "all", 0, +parts[1]);
    else if (op === "smooth") smooth(g, +parts[1] || 1);
    else if (op === "mask") maskEdge(g, +parts[1] || 1.2);
  }
}

// ── Templates (adapted from Azgaar FMG, MIT) ─────────────────────────────────

export const TEMPLATES: Record<string, string> = {
  highIsland: `
Hill 1 90-100 30-70 30-70
Hill 2 70-90 20-80 20-80
Hill 4 50-75 20-80 20-80
Hill 6 30-55 20-80 20-80
Add -10 all
Smooth 3
Mask 1.3
`,
  continents: `
Hill 2 72-82 10-30 20-80
Hill 2 72-82 70-90 20-80
Hill 4 50-70 10-90 20-80
Hill 6 30-55 10-90 20-80
Range 3 40 20-80 20-80
Add -8 all
Smooth 2
Mask 1.1
`,
  pangea: `
Hill 2 82-95 40-60 40-60
Hill 4 65-80 25-75 25-75
Hill 5 45-65 20-80 20-80
Range 2 50 20-80 20-80
Add -8 all
Smooth 2
Mask 1.05
`,
  oldWorld: `
Hill 3 62-80 20-50 20-80
Hill 2 55-75 50-80 20-80
Hill 5 35-60 20-80 20-80
Range 4 40 20-80 20-80
Trough 2 25 30-70 30-70
Add -7 all
Smooth 3
Mask 1.1
`,
  shattered: `
Hill 8 50-75 10-90 10-90
Hill 4 30-55 10-90 10-90
Pit 3 25 20-80 20-80
Add -10 all
Smooth 1
Mask 1.15
`,
  mediterranean: `
Hill 2 72-85 20-40 20-80
Hill 2 65-80 60-80 20-80
Trough 2 30 40-60 20-80
Hill 4 40-65 20-80 20-80
Add -8 all
Smooth 2
Mask 1.2
`,
};

const TEMPLATE_KEYS = Object.keys(TEMPLATES);

export function chooseTemplate(seed: number): string {
  return TEMPLATE_KEYS[seed % TEMPLATE_KEYS.length];
}

export function generateHeightmap(seed: number, cols: number, rows: number): HeightGrid {
  const rng = mulberry32(seed);
  const g: HeightGrid = { h: new Float32Array(cols * rows), cols, rows };
  const tname = chooseTemplate(seed);
  runTemplate(g, rng, TEMPLATES[tname]);
  return g;
}
