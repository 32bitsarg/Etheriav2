import type { TerrainKind } from "./worldTerrainConfigData.js";
import type { WorldPOI, WorldPOIType } from "@etheria/shared";

// ─── POI name lists by type ───────────────────────────────────────────────────

const RUINS_NAMES = [
  "Ruinas de Vorethia", "Antiguo Santuario", "Templo Olvidado", "La Ciudad Muerta",
  "Fortaleza Abandonada", "Catacumbas de Ash", "El Ara Rota", "Torre de Ceniza",
  "Osario del Diablo", "Cripta de Olar", "Mausoleo Maldito", "Altar de Piedra",
];

const PEAK_NAMES = [
  "Pico del Águila", "Cima Eterna", "Monte Oscuro", "Cumbre Helada",
  "El Gran Colmillo", "Pico del Trueno", "Cresta del Cuervo", "La Aguja",
  "Monte Gris", "Cumbre del Dragón", "Pico Sangrante", "El Techo del Mundo",
];

const RESOURCE_NAMES = [
  "Vetas de Hierro", "Manantial Sagrado", "Bosque Primigenio", "Pantano de Sal",
  "Mina Perdida", "Oasis del Desierto", "Cantera Antigua", "Tierras Fértiles",
  "Fuente de Azufre", "Reserva de Madera", "Yacimiento de Gemas", "Salinas del Sur",
];

const HARBOR_NAMES = [
  "Puerto Olvidado", "Bahía de los Naufragios", "Ensenada Secreta", "El Muelle Roto",
  "Cala del Pirata", "Puerto de Tormenta", "Rada Tranquila", "Embarcadero Perdido",
];

function seededPick<T>(arr: T[], h: number): T {
  return arr[Math.abs(h) % arr.length];
}

function hashInt(n: number): number {
  let x = n ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}

function poiName(type: WorldPOIType, idx: number): string {
  const h = hashInt(idx * 37 + 11);
  switch (type) {
    case "RUINS":    return seededPick(RUINS_NAMES, h);
    case "PEAK":     return seededPick(PEAK_NAMES, h);
    case "RESOURCE": return seededPick(RESOURCE_NAMES, h);
    case "HARBOR":   return seededPick(HARBOR_NAMES, h);
    default:         return seededPick(RUINS_NAMES, h);
  }
}

// Biome → allowed POI types
function biomePoiType(kind: TerrainKind, height: number): WorldPOIType | null {
  if (kind === "MOUNTAIN") return "PEAK";
  if (kind === "COAST")    return "HARBOR";
  if (kind === "PLAINS" || kind === "TUNDRA") return "RUINS";
  if (kind === "FOREST" || kind === "SWAMP" || kind === "DESERT") return "RESOURCE";
  if (kind === "HILLS" && height >= 55) return "RUINS";
  return null;
}

// ─── POI generation ──────────────────────────────────────────────────────────

export function generatePOIs(
  cells: TerrainKind[],
  heights: Uint8Array,
  cols: number,
  rows: number,
  worldWidth: number,
  worldHeight: number,
  seed: number,
): WorldPOI[] {
  const N = cols * rows;

  // Simple mulberry32 PRNG
  let s = seed ^ 0x9b1ae4c3;
  const rng = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Candidate pool: eligible cells indexed by type
  const candidatesByType: Record<WorldPOIType, number[]> = {
    RUINS: [], PEAK: [], RESOURCE: [], HARBOR: [],
  };

  for (let i = 0; i < N; i++) {
    const t = biomePoiType(cells[i], heights[i]);
    if (t) candidatesByType[t].push(i);
  }

  // Shuffle each bucket with seeded Fisher-Yates and take up to TARGET each
  const TARGETS: Record<WorldPOIType, number> = {
    RUINS: 8, PEAK: 7, RESOURCE: 8, HARBOR: 5,
  };

  // Min spacing in grid cells (~3% of grid width)
  const MIN_DIST_CELLS = Math.floor(cols * 0.03);

  const placed: Array<{ cellIdx: number; type: WorldPOIType; name: string }> = [];

  for (const type of ["RUINS", "PEAK", "RESOURCE", "HARBOR"] as WorldPOIType[]) {
    const pool = candidatesByType[type];
    // Partial Fisher-Yates: only shuffle what we need
    const target = TARGETS[type];
    let picked = 0;
    for (let i = pool.length - 1; i > 0 && picked < target * 10; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    for (let k = pool.length - 1; k >= 0 && picked < target; k--) {
      const ci = pool[k];
      const cc = ci % cols, cr = Math.floor(ci / cols);
      // Check minimum spacing against all placed POIs
      let tooClose = false;
      for (const p of placed) {
        const pc = p.cellIdx % cols, pr = Math.floor(p.cellIdx / cols);
        if (Math.abs(pc - cc) < MIN_DIST_CELLS && Math.abs(pr - cr) < MIN_DIST_CELLS) {
          tooClose = true; break;
        }
      }
      if (tooClose) continue;
      placed.push({ cellIdx: ci, type, name: poiName(type, placed.length) });
      picked++;
    }
  }

  // ── Convert grid positions to world coords ───────────────────────────────
  const halfW = worldWidth / 2;
  const halfH = worldHeight / 2;

  return placed.map((p, idx) => {
    const c = p.cellIdx % cols;
    const r = Math.floor(p.cellIdx / cols);
    return {
      id: `poi-${idx}`,
      type: p.type,
      name: p.name,
      x: Math.round((c / cols) * worldWidth - halfW),
      y: Math.round((r / rows) * worldHeight - halfH),
    };
  });
}
