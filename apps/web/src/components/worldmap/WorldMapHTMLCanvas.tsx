"use client";

import React, {
  useRef, useEffect, useState, useCallback, memo,
} from "react";
import type { WorldMovement, WorldRegion, WorldPOI } from "@etheria/shared";
import { useI18n } from "@/i18n";
import { TERRAIN_COLOR_HEX, type TerrainKind, type WorldTerrainMaskData } from "@/lib/worldTerrainMask";
import { useIsMobile } from "@/hooks/useIsMobile";

type WorldCity = {
  id: string;
  name: string;
  posX: number;
  posY: number;
  level?: number;
  allianceId?: string | null;
  relation?: "ally" | "peace" | "hostile" | "neutral";
};

type BarbarianCamp = {
  id: string;
  name: string;
  level: number;
  archetype: string;
  posX: number;
  posY: number;
  status: string;
  estimatedPower: number;
};

type MapConfig = {
  width: number;
  height: number;
  cameraMinZoom: number;
  cameraMaxZoom: number;
  cameraInitialZoom: number;
  backgroundAssetPath: string;
};

const ARCHETYPE_COLORS: Record<string, string> = {
  RAIDERS: "#d75f43",
  HUNTERS: "#49f0c5",
  MARAUDERS: "#ff6b35",
  WARHOST: "#9b59b6",
  NOMADS: "#f39c12",
};

const POI_ICONS: Record<string, string> = {
  RUINS:    "🏚",
  PEAK:     "⛰",
  RESOURCE: "💎",
  HARBOR:   "⚓",
};

const POI_COLORS: Record<string, string> = {
  RUINS:    "#c8a96e",
  PEAK:     "#b0c4de",
  RESOURCE: "#66dda0",
  HARBOR:   "#5bc8f5",
};

const GEO_FEATURE_TYPES = new Set(["LAKE", "RANGE", "CAPE", "BAY"]);

const ZOOM_STEP = 0.06;
const PAN_THRESHOLD = 6;
const FOG_RADIUS = 140;

// ─── Terrain LOD tiles ───
// The world is square; at level z it is split into 2^z × 2^z tiles, each TILE_PX wide.
// The client mounts only the tiles visible at the LOD matching the current zoom; the
// overview image stays behind as a base layer so there are never blank gaps.
const TILE_PX = 256;
const TILE_ZMAX = 9;
type TileDesc = { z: number; x: number; y: number; left: number; top: number; size: number };

const MOVEMENT_RELATION_COLORS: Record<string, string> = {
  own: "#e8c468",
  ally: "#49f0c5",
  peace: "#6fc8ff",
  hostile: "#d75f43",
  neutral: "#b9b3a4",
};

export const WorldMapHTMLCanvas = memo(function WorldMapHTMLCanvas({
  cities,
  mapConfig,
  myCityId,
  onSelectCityId,
  onCenterMyCity,
  onDoubleClickMyCity,
  barbarianCamps = [],
  onSelectCamp,
  movements = [],
  seasonState,
  editorMode = false,
  terrainMask,
  selectedTerrain,
  brushSize = 2,
  showTerrainOverlay = true,
  terrainTool = "brush",
  onTerrainChange,
  onPickTerrain,
}: {
  cities: WorldCity[];
  mapConfig: MapConfig | null;
  myCityId?: string | null;
  onSelectCityId?: (cityId: string, position: { x: number; y: number }) => void;
  onCenterMyCity?: () => void;
  onDoubleClickMyCity?: () => void;
  barbarianCamps?: BarbarianCamp[];
  onSelectCamp?: (camp: BarbarianCamp, position: { x: number; y: number }) => void;
  movements?: (WorldMovement & { relation?: "ally" | "peace" | "hostile" | "neutral" | "own" })[];
  seasonState?: any;
  editorMode?: boolean;
  terrainMask?: WorldTerrainMaskData | null;
  selectedTerrain?: TerrainKind;
  brushSize?: number;
  showTerrainOverlay?: boolean;
  terrainTool?: "brush" | "fill" | "picker";
  onTerrainChange?: (mask: WorldTerrainMaskData) => void;
  onPickTerrain?: (kind: TerrainKind) => void;
}) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [hoveredMovementId, setHoveredMovementId] = useState<string | null>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 900, h: 620 });

  const cam = useRef({ x: 0, y: 0, zoom: 1 });
  // Camera/fog only repaint when something actually changed — the rAF loop
  // checks this flag instead of redrawing the full fog canvas every frame.
  const camDirty = useRef(true);
  const hasStarted = useRef(false);
  const pointerState = useRef<{
    startClientX: number; startClientY: number;
    startCamX: number; startCamY: number;
    pointerId: number; hasPanned: boolean;
  } | null>(null);
  const pinch = useRef<{ dist: number; midX: number; midY: number } | null>(null);
  const fogCanvasRef = useRef<HTMLCanvasElement>(null);
  const terrainCanvasRef = useRef<HTMLCanvasElement>(null);
  const [proceduralCells, setProceduralCells] = useState<null>(null); // kept for type compat, unused
  const [terrainImageLoaded, setTerrainImageLoaded] = useState(false);
  const weatherRef = useRef<HTMLDivElement>(null);
  // Tracks active paint stroke so dragging paints continuously
  const isPaintingRef = useRef(false);
  const terrainMaskRef = useRef(terrainMask);
  terrainMaskRef.current = terrainMask;
  const [brushCursor, setBrushCursor] = useState<{ x: number; y: number } | null>(null);
  const movementEls = useRef(new Map<string, HTMLDivElement>());
  // LOD terrain tiles — multi-level retention manager.
  // tilesMapRef holds ALL mounted tiles (keys = "z:x:y"); entries persist across
  // pan and LOD changes until explicitly pruned. loadedRef tracks which tiles the
  // browser already has decoded so we can skip the fade animation on revisit.
  const [visibleTiles, setVisibleTiles] = useState<TileDesc[]>([]);
  const tilesMapRef = useRef<Map<string, TileDesc>>(new Map());
  const loadedRef   = useRef<Set<string>>(new Set());
  const tileSigRef  = useRef<string>("");
  // World regions + POIs fetched once on mount
  const [regions, setRegions] = useState<WorldRegion[]>([]);
  const [pois, setPois] = useState<WorldPOI[]>([]);
  const [hoveredPOIId, setHoveredPOIId] = useState<string | null>(null);
  // Region border overlay: rendered to an offscreen canvas → data URL
  const [regionBorderUrl, setRegionBorderUrl] = useState<string | null>(null);

  const worldW = mapConfig?.width ?? 3600;
  const worldH = mapConfig?.height ?? 2400;
  const halfW = Math.floor(worldW / 2);
  const halfH = Math.floor(worldH / 2);

  // Zoom-out limit: at full zoom-out we show only ~1/(ZOOM_OUT_LIMIT) of the world
  // (here ~1/3). This keeps a generous over-cover so panning never reveals the
  // background, and avoids downscaling the giant world layer so far that the
  // browser drops edge pixels (black bands) or markers flicker. rawCover (world =
  // viewport, whole world visible) ×3 → world ≈ 3× the viewport at min zoom.
  const ZOOM_OUT_LIMIT = 6.0;
  const coverZoomMin = Math.max(size.w / worldW, size.h / worldH) * ZOOM_OUT_LIMIT;
  const zMin = Math.max(mapConfig?.cameraMinZoom ?? 0.25, coverZoomMin);
  const zMax = mapConfig?.cameraMaxZoom ?? 2.4;

  // ─── Coordinate transforms ──────────────────────────────────────────────

  // world → local pixel within the camera div
  const worldToLocal = useCallback((wx: number, wy: number) => ({ x: wx + halfW, y: wy + halfH }), [halfW, halfH]);

  // local pixel → screen position (applies current camera)
  const localToScreen = useCallback((lx: number, ly: number) => {
    const { x: cx, y: cy, zoom } = cam.current;
    return { x: -halfW + cx + lx * zoom, y: -halfH + cy + ly * zoom };
  }, [halfW, halfH]);

  // ─── Screen to world (for un-projection, if needed) ──────────────────────
  const screenToWorld = useCallback((sx: number, sy: number) => {
    const { x: cx, y: cy, zoom } = cam.current;
    return { x: (sx + halfW - cx) / zoom - halfW, y: (sy + halfH - cy) / zoom - halfH };
  }, [halfW, halfH]);

  // ─── Camera clamping ─────────────────────────────────────────────────────

  const clampCamera = useCallback((cx: number, cy: number, zoom: number) => {
    const vw = outerRef.current?.clientWidth ?? size.w;
    const vh = outerRef.current?.clientHeight ?? size.h;
    // Cover floor computed from LIVE viewport dims (not stale `size` state), so the
    // zoom-out limit holds regardless of state and the world always over-covers.
    const coverZ = Math.max(vw / worldW, vh / worldH) * ZOOM_OUT_LIMIT;
    const z = Math.min(zMax, Math.max(zMin, coverZ, zoom));

    // Visible world bounds given current zoom
    // Screen left edge (sx=0) → wx = (halfW - cx)/z - halfW  ≥ -halfW  → cx ≤ halfW
    // Screen right edge (sx=vw) → wx = (vw + halfW - cx)/z - halfW ≤ halfW → cx ≥ vw + halfW - 2*halfW*z
    const minX = vw + halfW - 2 * halfW * z;
    const maxX = halfW;
    const minY = vh + halfH - 2 * halfH * z;
    const maxY = halfH;

    return {
      x: Math.min(maxX, Math.max(minX, cx)),
      y: Math.min(maxY, Math.max(minY, cy)),
      zoom: z,
    };
  }, [zMin, zMax, size.w, size.h, halfW, halfH]);

  // ─── Apply camera to DOM ─────────────────────────────────────────────────

  const applyCamera = useCallback(() => {
    const el = cameraRef.current;
    if (!el) return;
    const { x, y, zoom } = cam.current;
    el.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px) scale(${zoom})`;
    // Expose inverse zoom so markers inside this scaled div can counter-scale to stay legible.
    el.style.setProperty("--inv-zoom", String((1 / zoom).toFixed(4)));

    const weather = weatherRef.current;
    if (weather) {
      if (!seasonState) { weather.style.display = "none"; return; }
      weather.style.display = "";
      const season = seasonState.currentSeason;
      const intensity = seasonState.intensity ?? 1;
      if (season === "WINTER") weather.style.backgroundColor = `rgba(255,255,255,${0.22 * intensity})`;
      else if (season === "AUTUMN") weather.style.backgroundColor = `rgba(255,170,102,${0.12 * intensity})`;
      else if (season === "SUMMER") weather.style.backgroundColor = `rgba(255,240,170,${0.08 * intensity})`;
      else if (season === "SPRING") weather.style.backgroundColor = `rgba(180,255,160,${0.06 * intensity})`;
      else weather.style.display = "none";
    }
  }, [seasonState]);

  // ─── Fog of war ──────────────────────────────────────────────────────────

  const drawFog = useCallback(() => {
    const fc = fogCanvasRef.current;
    if (!fc) return;
    const ctx = fc.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);

    // Fog desactivado — canvas limpio
  }, [size]);

  // ─── Terrain overlay (editor) ────────────────────────────────────────────

  const drawTerrainOverlay = useCallback(() => {
    const tc = terrainCanvasRef.current;
    if (!tc) return;
    const ctx = tc.getContext("2d");
    if (!ctx) return;
    const mask = terrainMaskRef.current;
    ctx.clearRect(0, 0, tc.width, tc.height);
    if (!showTerrainOverlay || !mask) return;
    const cw = tc.width / mask.columns;
    const ch = tc.height / mask.rows;
    for (let row = 0; row < mask.rows; row++) {
      for (let col = 0; col < mask.columns; col++) {
        const kind = mask.cells[row * mask.columns + col] as TerrainKind;
        if (!kind || kind === "PLAINS") continue;
        const hex = TERRAIN_COLOR_HEX[kind];
        if (!hex) continue;
        ctx.fillStyle = hex + "70"; // ~44% alpha
        ctx.fillRect(col * cw, row * ch, cw, ch);
      }
    }
  }, [showTerrainOverlay]);

  useEffect(() => { drawTerrainOverlay(); }, [terrainMask, showTerrainOverlay, drawTerrainOverlay]);

  // ─── Procedural terrain ──────────────────────────────────────────────────

  // Terrain is pre-rendered server-side as WebP — no client-side computation needed.

  const paintCell = useCallback((screenX: number, screenY: number) => {
    const mask = terrainMaskRef.current;
    if (!mask || !selectedTerrain || !onTerrainChange || !mapConfig) return;
    const rect = outerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = screenX - rect.left;
    const sy = screenY - rect.top;
    const { x: wx, y: wy } = screenToWorld(sx, sy);
    const nx = (wx + halfW) / worldW;
    const ny = (wy + halfH) / worldH;
    const centerCol = Math.floor(nx * mask.columns);
    const centerRow = Math.floor(ny * mask.rows);
    if (centerCol < 0 || centerRow < 0 || centerCol >= mask.columns || centerRow >= mask.rows) return;
    const radius = Math.max(0, brushSize - 1);
    const newCells = [...mask.cells];
    let changed = false;
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        const col = centerCol + dc;
        const row = centerRow + dr;
        if (col < 0 || row < 0 || col >= mask.columns || row >= mask.rows) continue;
        const idx = row * mask.columns + col;
        if (newCells[idx] !== selectedTerrain) { newCells[idx] = selectedTerrain; changed = true; }
      }
    }
    if (!changed) return;
    const newMask = { ...mask, cells: newCells };
    terrainMaskRef.current = newMask;
    onTerrainChange(newMask);
    drawTerrainOverlay();
  }, [selectedTerrain, brushSize, onTerrainChange, mapConfig, screenToWorld, halfW, halfH, worldW, worldH, drawTerrainOverlay]);

  const floodFill = useCallback((screenX: number, screenY: number) => {
    const mask = terrainMaskRef.current;
    if (!mask || !selectedTerrain || !onTerrainChange || !mapConfig) return;
    const rect = outerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const { x: wx, y: wy } = screenToWorld(screenX - rect.left, screenY - rect.top);
    const nx = (wx + halfW) / worldW;
    const ny = (wy + halfH) / worldH;
    const startCol = Math.floor(nx * mask.columns);
    const startRow = Math.floor(ny * mask.rows);
    if (startCol < 0 || startRow < 0 || startCol >= mask.columns || startRow >= mask.rows) return;
    const startIdx = startRow * mask.columns + startCol;
    const targetKind = mask.cells[startIdx] as TerrainKind;
    if (targetKind === selectedTerrain) return;
    const newCells = [...mask.cells];
    const stack = [startIdx];
    const visited = new Set<number>();
    while (stack.length) {
      const idx = stack.pop()!;
      if (visited.has(idx)) continue;
      visited.add(idx);
      if (newCells[idx] !== targetKind) continue;
      newCells[idx] = selectedTerrain;
      const row = Math.floor(idx / mask.columns);
      const col = idx % mask.columns;
      if (col > 0) stack.push(idx - 1);
      if (col < mask.columns - 1) stack.push(idx + 1);
      if (row > 0) stack.push(idx - mask.columns);
      if (row < mask.rows - 1) stack.push(idx + mask.columns);
    }
    const newMask = { ...mask, cells: newCells };
    terrainMaskRef.current = newMask;
    onTerrainChange(newMask);
    drawTerrainOverlay();
  }, [selectedTerrain, onTerrainChange, mapConfig, screenToWorld, halfW, halfH, worldW, worldH, drawTerrainOverlay]);

  const pickTerrain = useCallback((screenX: number, screenY: number) => {
    const mask = terrainMaskRef.current;
    if (!mask || !onPickTerrain || !mapConfig) return;
    const rect = outerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const { x: wx, y: wy } = screenToWorld(screenX - rect.left, screenY - rect.top);
    const nx = (wx + halfW) / worldW;
    const ny = (wy + halfH) / worldH;
    const col = Math.floor(nx * mask.columns);
    const row = Math.floor(ny * mask.rows);
    if (col < 0 || row < 0 || col >= mask.columns || row >= mask.rows) return;
    const kind = mask.cells[row * mask.columns + col] as TerrainKind;
    if (kind) onPickTerrain(kind);
  }, [onPickTerrain, mapConfig, screenToWorld, halfW, halfH, worldW, worldH]);

  // ─── Movement update ─────────────────────────────────────────────────────

  const updateMovements = useCallback(() => {
    const now = Date.now();
    const myCity = myCityId ? cities.find((c) => c.id === myCityId) : null;
    for (const m of movements) {
      const isReturning = m.status === "RETURNING" && !!m.returnsAt;
      const startT = isReturning
        ? new Date(m.resolvedAt ?? m.arrivesAt).getTime()
        : new Date(m.startedAt).getTime();
      const endT = isReturning
        ? new Date(m.returnsAt!).getTime()
        : new Date(m.arrivesAt).getTime();
      const duration = endT - startT;
      let progress = duration > 0 ? Math.min(1, Math.max(0, (now - startT) / duration)) : NaN;
      if (!Number.isFinite(progress)) {
        const hash = [...m.id].reduce((acc, ch) => ((acc * 31) ^ ch.charCodeAt(0)) >>> 0, 0);
        const cycleMs = 45000 + (hash % 12000);
        progress = 0.08 + ((now + (hash % cycleMs)) % cycleMs) / cycleMs * 0.84;
      }
      const origin = isReturning ? m.to : m.from;
      const destination = isReturning ? m.from : m.to;

      // Interpolate along the path polyline if available, otherwise straight line.
      let wx: number, wy: number;
      const path = m.path && m.path.length >= 2
        ? (isReturning ? [...m.path].reverse() : m.path)
        : null;
      if (path) {
        // Pre-compute cumulative arc lengths, then find segment for current progress.
        let totalLen = 0;
        const lens: number[] = [0];
        for (let i = 1; i < path.length; i++) {
          totalLen += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
          lens.push(totalLen);
        }
        const target = progress * totalLen;
        let seg = path.length - 2;
        for (let i = 0; i < path.length - 1; i++) {
          if (lens[i + 1] >= target) { seg = i; break; }
        }
        const segLen = lens[seg + 1] - lens[seg];
        const t = segLen > 0 ? (target - lens[seg]) / segLen : 0;
        wx = path[seg].x + (path[seg + 1].x - path[seg].x) * t;
        wy = path[seg].y + (path[seg + 1].y - path[seg].y) * t;
      } else {
        wx = origin.x + (destination.x - origin.x) * progress;
        wy = origin.y + (destination.y - origin.y) * progress;
      }
      const el = movementEls.current.get(m.id);
      if (!el) continue;
      // Fog of war: PvP foreign marches only show inside visibility circle.
      // Barbarian movements (BARBARIAN_ATTACK / BARBARIAN_RAID) are always visible
      // so the world feels alive with bot activity.
      // Todos los movimientos visibles (fog desactivado)
      el.style.display = "";
      const l = worldToLocal(wx, wy);
      el.style.transform = `translate3d(${l.x}px, ${l.y}px, 0) translate(-50%, -50%) scale(${Math.min(3, 1 / cam.current.zoom).toFixed(4)})`;
    }
  }, [movements, worldToLocal, cities, myCityId]);

  // ─── LOD tile selection (retention manager) ─────────────────────────────
  // Keeps tiles of the PREVIOUS LOD level alive in the DOM until all tiles of
  // the NEW level have loaded. This prevents the "nítido → borroso → nítido"
  // flash when crossing a zoom threshold. During pan, a ±2 prefetch margin and
  // permanent retention within ±4 of the current view mean revisited tiles never
  // re-animate from opacity:0 (loadedRef prevents the fade).

  const updateTiles = useCallback(() => {
    const { zoom } = cam.current;
    const vw = outerRef.current?.clientWidth ?? size.w;
    const vh = outerRef.current?.clientHeight ?? size.h;

    const z = Math.max(0, Math.min(TILE_ZMAX, Math.round(Math.log2((worldW * zoom) / TILE_PX))));
    const span = 1 << z;
    const tileWorld = worldW / span;

    // Visible rect + prefetch margin (smaller on mobile to save memory)
    const tl = screenToWorld(0, 0);
    const br = screenToWorld(vw, vh);
    const minWX = Math.min(tl.x, br.x), maxWX = Math.max(tl.x, br.x);
    const minWY = Math.min(tl.y, br.y), maxWY = Math.max(tl.y, br.y);
    const PREFETCH = isMobile ? 1 : 2;
    const x0 = Math.max(0, Math.floor((minWX + halfW) / tileWorld) - PREFETCH);
    const x1 = Math.min(span - 1, Math.floor((maxWX + halfW) / tileWorld) + PREFETCH);
    const y0 = Math.max(0, Math.floor((minWY + halfH) / tileWorld) - PREFETCH);
    const y1 = Math.min(span - 1, Math.floor((maxWY + halfH) / tileWorld) + PREFETCH);

    // Signature — include whether the current z is "complete" so pruning is stable
    const wantedKeys = new Set<string>();
    for (let ty = y0; ty <= y1; ty++)
      for (let tx = x0; tx <= x1; tx++)
        wantedKeys.add(`${z}:${tx}:${ty}`);

    const currentLevelComplete = [...wantedKeys].every(k => loadedRef.current.has(k));
    const sig = `${z}:${x0},${y0},${x1},${y1}:${currentLevelComplete}`;
    if (sig === tileSigRef.current) return;
    tileSigRef.current = sig;

    const map = tilesMapRef.current;

    // Add new wanted tiles to the map
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const key = `${z}:${tx}:${ty}`;
        if (!map.has(key)) {
          map.set(key, { z, x: tx, y: ty, left: tx * tileWorld, top: ty * tileWorld, size: tileWorld });
        }
      }
    }

    // Prune stale tiles:
    //  - If the current z-level is complete, remove ALL tiles of OTHER levels
    //    (the current level now fully covers the viewport → cross-fade done).
    //  - Always remove tiles of the current level outside the ±4 retention margin
    //    to cap DOM node count when panning long distances.
    const RETAIN = isMobile ? 2 : 4;
    const rx0 = Math.max(0, x0 - RETAIN), rx1 = Math.min(span - 1, x1 + RETAIN);
    const ry0 = Math.max(0, y0 - RETAIN), ry1 = Math.min(span - 1, y1 + RETAIN);

    for (const [key, td] of map) {
      if (td.z !== z) {
        if (currentLevelComplete) map.delete(key); // old level no longer needed
      } else {
        if (td.x < rx0 || td.x > rx1 || td.y < ry0 || td.y > ry1) map.delete(key);
      }
    }

    setVisibleTiles([...map.values()]);
  }, [size.w, size.h, worldW, halfW, halfH, screenToWorld, isMobile]);

  // ─── rAF loop ────────────────────────────────────────────────────────────

  const applyCameraRef = useRef(applyCamera);
  applyCameraRef.current = applyCamera;
  const drawFogRef = useRef(drawFog);
  drawFogRef.current = drawFog;
  const updateMovementsRef = useRef(updateMovements);
  updateMovementsRef.current = updateMovements;
  const updateTilesRef = useRef(updateTiles);
  updateTilesRef.current = updateTiles;
  const movementsRef = useRef(movements);
  movementsRef.current = movements;

  // Repaint camera/fog when data they depend on changes (not just input)
  useEffect(() => {
    camDirty.current = true;
  }, [cities, myCityId, seasonState, size, movements]);

  useEffect(() => {
    let raf = 0;
    let lastMovementTick = 0;
    let lastTileTick = 0;
    const loop = (now: number) => {
      if (camDirty.current) {
        camDirty.current = false;
        applyCameraRef.current();
        drawFogRef.current();
      }
      // March interpolation is slow-moving: ~7fps is visually identical and
      // avoids per-frame layout writes when the map is idle.
      if (movementsRef.current.length > 0 && now - lastMovementTick > 140) {
        lastMovementTick = now;
        updateMovementsRef.current();
      }
      // Recompute visible LOD tiles ~8fps; updateTiles early-returns when the set
      // is unchanged, so this is cheap while idle and responsive during pan/zoom.
      if (now - lastTileTick > 120) {
        lastTileTick = now;
        updateTilesRef.current();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ─── Size tracking ───────────────────────────────────────────────────────

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width <= 0 || height <= 0) return;
      setSize({ w: width, h: height });
    });
    ro.observe(el);
    const rect = el.getBoundingClientRect();
    if (rect.width > 50 && rect.height > 50) setSize({ w: rect.width, h: rect.height });
    return () => ro.disconnect();
  }, []);

  // ─── Fetch world regions + POIs ─────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    fetch("/api/world/regions").then(r => r.json()).then(d => {
      if (!cancelled && Array.isArray(d.regions)) setRegions(d.regions);
    }).catch(() => {});
    fetch("/api/world/points-of-interest").then(r => r.json()).then(d => {
      if (!cancelled && Array.isArray(d.pois)) setPois(d.pois);
    }).catch(() => {});
    fetch("/api/world/region-map").then(r => r.json()).then((d: { cols: number; rows: number; ids: string }) => {
      if (cancelled || !d.ids) return;
      // Decode base64 → Uint8Array of region IDs
      const bin = atob(d.ids);
      const ids = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) ids[i] = bin.charCodeAt(i);

      // Draw borders to an offscreen canvas
      const oc = document.createElement("canvas");
      oc.width = d.cols;
      oc.height = d.rows;
      const ctx = oc.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, d.cols, d.rows);
      ctx.strokeStyle = "rgba(240,220,160,0.22)";
      ctx.lineWidth = 1;
      for (let row = 0; row < d.rows - 1; row++) {
        for (let col = 0; col < d.cols - 1; col++) {
          const id = ids[row * d.cols + col];
          if (id === 255) continue;
          const idR = ids[row * d.cols + col + 1];
          const idD = ids[(row + 1) * d.cols + col];
          if (idR !== id && idR !== 255) {
            ctx.beginPath(); ctx.moveTo(col + 1, row); ctx.lineTo(col + 1, row + 1); ctx.stroke();
          }
          if (idD !== id && idD !== 255) {
            ctx.beginPath(); ctx.moveTo(col, row + 1); ctx.lineTo(col + 1, row + 1); ctx.stroke();
          }
        }
      }
      if (!cancelled) setRegionBorderUrl(oc.toDataURL("image/png"));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // ─── Initial camera center ───────────────────────────────────────────────

  useEffect(() => {
    if (!mapConfig || hasStarted.current) return;
    const vw = outerRef.current?.clientWidth ?? 0;
    const vh = outerRef.current?.clientHeight ?? 0;
    if (vw < 50 || vh < 50) return;

    // Compute zoom so map fills the entire viewport (cover, not contain)
    const coverZoom = Math.max(vw / worldW, vh / worldH);
    const initialZoom = Math.min(zMax, Math.max(zMin, mapConfig.cameraInitialZoom ?? coverZoom));
    const myCity = myCityId ? cities.find(c => c.id === myCityId) : null;
    const target = myCity ?? (cities[0] ?? null);

    let cx: number, cy: number;
    if (target) {
      cx = vw / 2 + halfW - (target.posX + halfW) * initialZoom;
      cy = vh / 2 + halfH - (target.posY + halfH) * initialZoom;
    } else {
      cx = vw / 2 + halfW - halfW * initialZoom;
      cy = vh / 2 + halfH - halfH * initialZoom;
    }
    const clamped = clampCamera(cx, cy, initialZoom);
    cam.current = clamped;
    camDirty.current = true;
    hasStarted.current = true;
  }, [mapConfig, cities, myCityId, halfW, halfH, clampCamera]);

  // ─── Center on my city (animated) ────────────────────────────────────────

  const centerOnMyCity = useCallback(() => {
    const myCity = myCityId ? cities.find(c => c.id === myCityId) : null;
    if (!myCity && cities.length === 0) return;
    const target = myCity ?? cities[0];
    const vw = outerRef.current?.clientWidth ?? size.w;
    const vh = outerRef.current?.clientHeight ?? size.h;
    const z = mapConfig?.cameraInitialZoom ?? 0.85;
    const tx = vw / 2 + halfW - (target.posX + halfW) * z;
    const ty = vh / 2 + halfH - (target.posY + halfH) * z;
    const s = 0.45;
    cam.current = clampCamera(
      cam.current.x * (1 - s) + tx * s,
      cam.current.y * (1 - s) + ty * s,
      cam.current.zoom * (1 - s) + z * s
    );
    camDirty.current = true;
  }, [cities, myCityId, size, halfW, halfH, mapConfig, clampCamera]);

  const zoomBy = useCallback((factor: number) => {
    const vw = outerRef.current?.clientWidth ?? size.w;
    const vh = outerRef.current?.clientHeight ?? size.h;
    const oldZoom = cam.current.zoom;
    const newZoom = Math.min(zMax, Math.max(zMin, oldZoom * factor));
    const s = newZoom / oldZoom;
    const mx = vw / 2;
    const my = vh / 2;
    cam.current = clampCamera((mx + halfW) - (mx + halfW - cam.current.x) * s, (my + halfH) - (my + halfH - cam.current.y) * s, newZoom);
    camDirty.current = true;
  }, [clampCamera, zMin, zMax, size, halfW, halfH]);

  // ── Input: wheel zoom ────────────────────────────────────────────────────

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1 + ZOOM_STEP : 1 - ZOOM_STEP;
      const oldZoom = cam.current.zoom;
      const newZoom = Math.min(zMax, Math.max(zMin, oldZoom * factor));
      const s = newZoom / oldZoom;
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      // Zoom centered on cursor: localToScreen gives screen_x = -halfW + cx + lx*zoom,
      // so to keep the world point under cursor fixed: cx_new = (mx+halfW) - (mx+halfW - cx)*s
      const cx = (mx + halfW) - (mx + halfW - cam.current.x) * s;
      const cy = (my + halfH) - (my + halfH - cam.current.y) * s;
      cam.current = clampCamera(cx, cy, newZoom);
      camDirty.current = true;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [clampCamera, zMin, zMax]);

  // ── Input: pointer pan ───────────────────────────────────────────────────

  const paintCellRef = useRef(paintCell);
  paintCellRef.current = paintCell;
  const floodFillRef = useRef(floodFill);
  floodFillRef.current = floodFill;
  const pickTerrainRef = useRef(pickTerrain);
  pickTerrainRef.current = pickTerrain;
  const terrainToolRef = useRef(terrainTool);
  terrainToolRef.current = terrainTool;

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // In editor mode: left-click = paint/fill/pick, right-click = pan
    if (editorMode && e.button === 0 && e.pointerType !== "touch") {
      e.preventDefault();
      const tool = terrainToolRef.current;
      if (tool === "fill") { floodFillRef.current(e.clientX, e.clientY); return; }
      if (tool === "picker") { pickTerrainRef.current(e.clientX, e.clientY); return; }
      isPaintingRef.current = true;
      paintCellRef.current(e.clientX, e.clientY);
      return;
    }
    // right-click or any click outside editor → pan
    if (e.button === 2 || (editorMode && e.button !== 0)) { e.preventDefault(); }
    if (!editorMode && e.button !== 0 && e.pointerType !== "touch") return;
    pointerState.current = {
      startClientX: e.clientX, startClientY: e.clientY,
      startCamX: cam.current.x, startCamY: cam.current.y,
      pointerId: e.pointerId, hasPanned: false,
    };
  }, [editorMode]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (editorMode) setBrushCursor({ x: e.clientX, y: e.clientY });
    if (isPaintingRef.current) { paintCellRef.current(e.clientX, e.clientY); return; }
    if (pinch.current) return; // pinch takes priority — don't pan while zooming
    const ps = pointerState.current;
    if (!ps || ps.pointerId !== e.pointerId) return;
    const dx = e.clientX - ps.startClientX;
    const dy = e.clientY - ps.startClientY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (!ps.hasPanned && dist < PAN_THRESHOLD) return;
    ps.hasPanned = true;
    cam.current = clampCamera(ps.startCamX + dx, ps.startCamY + dy, cam.current.zoom);
    camDirty.current = true;
  }, [clampCamera]);

  const onPointerLeave = useCallback(() => { if (editorMode) setBrushCursor(null); }, [editorMode]);

  const onPointerUp = useCallback(() => {
    isPaintingRef.current = false;
    pointerState.current = null;
  }, []);

  // ── Input: touch pinch ───────────────────────────────────────────────────

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    pinch.current = {
      dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
      midX: (a.clientX + b.clientX) / 2, midY: (a.clientY + b.clientY) / 2,
    };
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2 || !pinch.current) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    const newDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const factor = newDist / pinch.current.dist;
    const rect = outerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const midX = (a.clientX + b.clientX) / 2 - rect.left;
    const midY = (a.clientY + b.clientY) / 2 - rect.top;
    const oldZoom = cam.current.zoom;
    const newZoom = Math.min(zMax, Math.max(zMin, oldZoom * factor));
    const s = newZoom / oldZoom;
    cam.current = clampCamera((midX + halfW) - (midX + halfW - cam.current.x) * s, (midY + halfH) - (midY + halfH - cam.current.y) * s, newZoom);
    camDirty.current = true;
    pinch.current.dist = newDist;
  }, [clampCamera, zMin, zMax]);

  const onTouchEnd = useCallback(() => { pinch.current = null; }, []);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const handler = (e: TouchEvent) => { if (e.touches.length >= 2) e.preventDefault(); };
    el.addEventListener("touchmove", handler, { passive: false });
    return () => el.removeEventListener("touchmove", handler);
  }, []);

  // ── Click handlers ───────────────────────────────────────────────────────

  const handleCityClick = useCallback((city: WorldCity, e: React.MouseEvent) => {
    if (pointerState.current?.hasPanned) return;
    const rect = outerRef.current?.getBoundingClientRect();
    if (!rect) return;
    onSelectCityId?.(city.id, { x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [onSelectCityId]);

  const handleCampClick = useCallback((camp: BarbarianCamp, e: React.MouseEvent) => {
    if (pointerState.current?.hasPanned) return;
    const rect = outerRef.current?.getBoundingClientRect();
    if (!rect) return;
    onSelectCamp?.(camp, { x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [onSelectCamp]);

  // ─── Loading state ───────────────────────────────────────────────────────

  if (!mapConfig) {
    return (
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0a1e48] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
        <p className="text-stone-500 text-xs">Cargando mapa...</p>
      </div>
    );
  }

  const bgPath = mapConfig.backgroundAssetPath;

  return (
    <div className="relative h-full w-full">
      <div
        ref={outerRef}
        className="relative h-full w-full overflow-hidden select-none md:rounded-lg md:border md:border-etheria-border/30"
        style={{ background: "radial-gradient(ellipse at center, #0c2747 0%, #0a1e48 55%, #061530 100%)", touchAction: "none", cursor: editorMode ? (terrainTool === "picker" ? "crosshair" : "none") : "default" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerLeave}
        onContextMenu={(e) => { if (editorMode) e.preventDefault(); }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Camera container */}
        <div
          ref={cameraRef}
          className="absolute"
          style={{
            transformOrigin: "0 0",
            willChange: "transform",
            // Stable GPU layer promotion — avoids edge-pixel/marker flicker when
            // the large world layer repaints during pan at high zoom-out.
            backfaceVisibility: "hidden",
            left: -halfW,
            top: -halfH,
            width: worldW,
            height: worldH,
          }}
        >
          {/* Static fallback background (ultimate base) */}
          <img
            src={bgPath}
            alt=""
            className="absolute inset-0 h-full w-full pointer-events-none"
            draggable={false}
            style={{ zIndex: 0 }}
          />
          {/* Overview terrain — low-res base layer always behind the LOD tiles so
              there are never blank gaps while tiles load. */}
          <img
            src={`/api/world/terrain-image${isMobile ? '?variant=mobile' : ''}`}
            alt=""
            className="absolute inset-0 pointer-events-none"
            draggable={false}
            style={{ width: worldW, height: worldH, zIndex: 1, opacity: terrainImageLoaded ? 1 : 0, transition: "opacity 0.4s" }}
            onLoad={() => setTerrainImageLoaded(true)}
          />
          {/* LOD terrain tiles — multi-level retention: tiles of multiple z-levels
              can coexist; old level stays visible below until new level is complete. */}
          {(() => {
            const zValues = visibleTiles.map(t => t.z);
            const minZ = zValues.length ? Math.min(...zValues) : 0;
            return visibleTiles.map((tile) => {
              const key = `${tile.z}:${tile.x}:${tile.y}`;
              const alreadyLoaded = loadedRef.current.has(key);
              return (
                <img
                  key={key}
                  src={`/api/world/terrain-tile/${tile.z}/${tile.x}/${tile.y}`}
                  alt=""
                  draggable={false}
                  className="absolute pointer-events-none"
                  style={{
                    left: tile.left, top: tile.top, width: tile.size, height: tile.size,
                    // Higher z-level (finer detail) paints above coarser levels.
                    zIndex: 2 + (tile.z - minZ),
                    // Skip fade for tiles the browser already has cached.
                    opacity: alreadyLoaded ? 1 : 0,
                    transition: alreadyLoaded ? "none" : "opacity 0.25s",
                  }}
                  onLoad={(e) => {
                    loadedRef.current.add(key);
                    (e.currentTarget as HTMLImageElement).style.opacity = "1";
                    (e.currentTarget as HTMLImageElement).style.transition = "none";
                  }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
                />
              );
            });
          })()}

          {/* Region border overlay */}
          {regionBorderUrl && (
            <img
              src={regionBorderUrl}
              alt=""
              draggable={false}
              className="absolute inset-0 pointer-events-none"
              style={{ width: worldW, height: worldH, zIndex: 3, opacity: 0.6 }}
            />
          )}

          {/* Region labels — visible when zoomed out, fade away when zoomed in */}
          {regions.map((region) => (
            <div
              key={region.id}
              className="absolute pointer-events-none select-none"
              style={{
                left: region.centroidX + halfW,
                top: region.centroidY + halfH,
                transform: "translate(-50%, -50%)",
                zIndex: 3,
                // Counter-scale so text stays a fixed ~12px on screen regardless of zoom,
                // but vanish at high zoom (> ~0.4) where city names take over.
                // opacity controlled by CSS: fade out as inv-zoom shrinks (high zoom)
                opacity: "calc(clamp(0, calc(var(--inv-zoom, 1) * 1.5 - 0.5), 1))",
                transition: "opacity 0.3s",
              }}
            >
              <span
                style={{
                  display: "block",
                  fontSize: `calc(18px * clamp(0.7, var(--inv-zoom, 1), 3.2))`,
                  fontFamily: "Georgia, serif",
                  fontWeight: 700,
                  color: "rgba(240,225,195,0.82)",
                  textShadow: "0 1px 6px rgba(0,0,0,0.95), 0 0 20px rgba(0,0,0,0.7), 0 2px 2px rgba(0,0,0,0.8)",
                  letterSpacing: "0.10em",
                  whiteSpace: "nowrap",
                  textTransform: "uppercase",
                }}
              >
                {region.name}
              </span>
            </div>
          ))}

          {/* Geographic feature labels (LAKE/RANGE/CAPE/BAY) — italic, no icon */}
          {pois.filter(p => GEO_FEATURE_TYPES.has(p.type)).map((poi) => (
            <div
              key={poi.id}
              className="absolute pointer-events-none select-none"
              style={{
                left: poi.x + halfW,
                top: poi.y + halfH,
                transform: "translate(-50%, -50%)",
                zIndex: 3,
                opacity: "calc(clamp(0, calc(var(--inv-zoom, 1) * 1.8 - 0.4), 1))",
                transition: "opacity 0.3s",
              }}
            >
              <span style={{
                display: "block",
                fontSize: `calc(12px * clamp(0.6, var(--inv-zoom, 1), 2.8))`,
                fontFamily: "Georgia, serif",
                fontStyle: "italic",
                fontWeight: 400,
                color: "rgba(200,230,255,0.70)",
                textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6)",
                letterSpacing: "0.06em",
                whiteSpace: "nowrap",
              }}>
                {poi.name}
              </span>
            </div>
          ))}

          {/* POI markers (RUINS/PEAK/RESOURCE/HARBOR) — counter-scaled, with tooltip on hover */}
          {pois.filter(p => !GEO_FEATURE_TYPES.has(p.type)).map((poi) => {
            const color = POI_COLORS[poi.type] ?? "#c8a96e";
            const icon  = POI_ICONS[poi.type]  ?? "📍";
            const isHov = hoveredPOIId === poi.id;
            return (
              <div
                key={poi.id}
                className="absolute flex flex-col items-center cursor-pointer pointer-events-auto"
                style={{
                  left: poi.x + halfW,
                  top: poi.y + halfH,
                  transform: "translate(-50%, -90%) scale(min(1, var(--inv-zoom, 1)))",
                  transformOrigin: "50% 90%",
                  zIndex: isHov ? 6 : 4,
                  willChange: "transform",
                }}
                onPointerEnter={() => setHoveredPOIId(poi.id)}
                onPointerLeave={() => setHoveredPOIId((id) => (id === poi.id ? null : id))}
              >
                <span style={{ fontSize: 18, lineHeight: 1, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.8))" }}>
                  {icon}
                </span>
                {isHov && (
                  <div
                    className="absolute bottom-full mb-1 whitespace-nowrap rounded-md border px-2 py-1 text-[9px] leading-snug pointer-events-none"
                    style={{ backgroundColor: "rgba(5,7,7,0.92)", borderColor: `${color}66`, color: "#e9e2cf" }}
                  >
                    <span style={{ color, fontWeight: 600 }}>{poi.name}</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Cities */}
          {cities.map((city) => (
            <CityMarker
              key={city.id}
              city={city}
              x={city.posX + halfW}
              y={city.posY + halfH}
              isMe={city.id === myCityId}
              onClick={handleCityClick}
              onDoubleClick={onDoubleClickMyCity}
            />
          ))}

          {/* Barbarian camps */}
          {barbarianCamps
            .filter((c) => c.status === "ACTIVE")
            .map((camp) => {
              const l = worldToLocal(camp.posX, camp.posY);
              const color = ARCHETYPE_COLORS[camp.archetype] ?? "#d75f43";
              return (
                <button
                  key={camp.id}
                  onClick={(e) => handleCampClick(camp, e)}
                  className="absolute flex flex-col items-center cursor-pointer"
                  style={{
                    left: l.x, top: l.y,
                    transform: "translate(-50%, -85%) scale(min(1, var(--inv-zoom, 1)))",
                    transformOrigin: "50% 85%",
                    zIndex: 2, willChange: "transform",
                  }}
                >
                  <img
                    src="/assets/map/barbarian-camp.png"
                    alt=""
                    className="pointer-events-none"
                    draggable={false}
                    style={{
                      width: 120, height: 120,
                      filter: `drop-shadow(0 3px 6px rgba(0,0,0,0.6)) sepia(0.3) hue-rotate(-10deg)`,
                    }}
                    onError={(e) => {
                      // Fallback: colored triangle if sprite missing
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                      const sibling = e.currentTarget.nextSibling as HTMLElement | null;
                      if (sibling) sibling.style.display = "block";
                    }}
                  />
                  <div className="pointer-events-none" style={{
                    display: "none", width: 0, height: 0,
                    borderLeft: "18px solid transparent", borderRight: "18px solid transparent",
                    borderBottom: `28px solid ${color}`,
                    filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.7))",
                  }} />
                  <span
                    className="text-xs font-bold whitespace-nowrap px-2 py-0.5 rounded pointer-events-none"
                    style={{ color: "#ff6b6b", backgroundColor: "rgba(5,7,7,0.80)", marginTop: 2 }}
                  >
                    Lv.{camp.level}
                  </span>
                  <span className="text-xs font-semibold whitespace-nowrap px-2 py-0.5 rounded pointer-events-none"
                    style={{ color, backgroundColor: "rgba(5,7,7,0.80)" }}>
                    {camp.name}
                  </span>
                </button>
              );
            })}

          {/* March trail for the hovered movement */}
          {(() => {
            const hovered = movements.find((m) => m.id === hoveredMovementId);
            if (!hovered) return null;
            const color = MOVEMENT_RELATION_COLORS[hovered.relation ?? "neutral"];
            const pathPts = hovered.path && hovered.path.length >= 2
              ? hovered.path.map((p) => worldToLocal(p.x, p.y))
              : [worldToLocal(hovered.from.x, hovered.from.y), worldToLocal(hovered.to.x, hovered.to.y)];
            const points = pathPts.map((p) => `${p.x},${p.y}`).join(" ");
            const from = pathPts[0];
            const to = pathPts[pathPts.length - 1];
            return (
              <svg
                className="absolute inset-0 pointer-events-none"
                width={worldW}
                height={worldH}
                style={{ zIndex: 7 }}
              >
                <polyline
                  points={points}
                  fill="none"
                  stroke={color} strokeWidth={1.5} strokeDasharray="6 5"
                  strokeLinecap="round" opacity={0.8}
                  style={{ animation: "march-trail-dash 0.8s linear infinite" }}
                />
                <circle cx={from.x} cy={from.y} r={3} fill="none" stroke={color} strokeWidth={1.2} opacity={0.7} />
                <circle cx={to.x} cy={to.y} r={4} fill={color} opacity={0.55} />
              </svg>
            );
          })()}

          {/* Terrain overlay canvas (editor mode) */}
          {editorMode && (
            <canvas
              ref={terrainCanvasRef}
              className="absolute inset-0 pointer-events-none"
              width={worldW}
              height={worldH}
              style={{ width: worldW, height: worldH, zIndex: 10 }}
            />
          )}

          {/* Movement markers — sprite-based, counter-scaled against zoom so they stay legible at any distance */}
          {movements.map((m) => {
            const isTrade = m.type === "TRADE";
            const isBarbRaid = m.type === "BARBARIAN_RAID";
            const isBarbAttack = m.type === "BARBARIAN_ATTACK";
            const isBarb = isBarbRaid || isBarbAttack;
            const l = worldToLocal(m.from.x, m.from.y);
            const color = MOVEMENT_RELATION_COLORS[m.relation ?? "neutral"] ?? (isTrade ? "#ffe066" : "#ff8888");
            const sprite = isTrade
              ? "/assets/map/merchant-caravan-walk.png"
              : isBarb
              ? "/assets/map/barbarian-army-walk.png"
              : "/assets/map/player-army-walk.png";
            const isHovered = hoveredMovementId === m.id;
            return (
              <div
                key={m.id}
                ref={(el) => {
                  if (el) movementEls.current.set(m.id, el);
                  else movementEls.current.delete(m.id);
                }}
                className="absolute flex flex-col items-center pointer-events-auto cursor-pointer"
                style={{
                  left: 0, top: 0,
                  // translate3d positions in world space; inner scale counter-acts parent zoom.
                  transform: `translate3d(${l.x}px, ${l.y}px, 0) translate(-50%, -50%) scale(min(3, var(--inv-zoom, 1)))`,
                  transformOrigin: "50% 50%",
                  zIndex: isHovered ? 9 : 8, willChange: "transform",
                }}
                onPointerEnter={() => setHoveredMovementId(m.id)}
                onPointerLeave={() => setHoveredMovementId((id) => (id === m.id ? null : id))}
                onClick={(e) => { e.stopPropagation(); setHoveredMovementId((id) => (id === m.id ? null : m.id)); }}
              >
                <img
                  src={sprite}
                  alt=""
                  draggable={false}
                  className="pointer-events-none"
                  style={{
                    width: 48, height: 48,
                    filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.7)) drop-shadow(0 0 6px ${color}88)`,
                  }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}`, marginTop: 2 }} />
                {isHovered && (() => {
                  const etaMs = new Date(m.status === "RETURNING" && m.returnsAt ? m.returnsAt : m.arrivesAt).getTime() - Date.now();
                  const etaMin = Math.max(0, Math.floor(etaMs / 60000));
                  const etaSec = Math.max(0, Math.floor((etaMs % 60000) / 1000));
                  return (
                  <div
                    className="absolute bottom-full mb-1 whitespace-nowrap rounded-md border px-2 py-1 text-[9px] leading-snug pointer-events-none"
                    style={{ backgroundColor: "rgba(5,7,7,0.92)", borderColor: `${color}66`, color: "#e9e2cf" }}
                  >
                    <span style={{ color }}>
                      {m.playerName ?? m.from.name}
                      {m.allianceTag ? ` [${m.allianceTag}]` : ""}
                    </span>
                    {" → "}
                    {m.status === "RETURNING" ? m.from.name : m.to.name}
                    <div className="text-white/60">
                      {isTrade ? t("play.map.march.trade") : t("play.map.march.attack")} · {etaMin}m {etaSec}s
                    </div>
                  </div>
                  );
                })()}
              </div>
            );
          })}
        </div>

        {/* Fog of War overlay — suppressed in editor mode */}
        {!editorMode && (
          <canvas
            ref={fogCanvasRef}
            className="absolute inset-0 pointer-events-none"
            width={Math.round(size.w * Math.min(window.devicePixelRatio || 1, 2))}
            height={Math.round(size.h * Math.min(window.devicePixelRatio || 1, 2))}
            style={{ width: size.w, height: size.h }}
          />
        )}

        {/* Weather overlay */}
        <div ref={weatherRef} className="absolute inset-0 pointer-events-none" style={{ transition: "background-color 0.6s" }} />
      </div>

      {/* Top-right controls: zoom +/- and center */}
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1">
        <button type="button" onClick={() => zoomBy(1 + ZOOM_STEP * 4)}
          className="w-8 h-8 rounded-lg border border-etheria-border bg-black/55 text-etheria-gold-soft backdrop-blur-[2px] hover:bg-black/75 text-base font-bold flex items-center justify-center"
          aria-label="Zoom in">+</button>
        <button type="button" onClick={() => zoomBy(1 - ZOOM_STEP * 4)}
          className="w-8 h-8 rounded-lg border border-etheria-border bg-black/55 text-etheria-gold-soft backdrop-blur-[2px] hover:bg-black/75 text-base font-bold flex items-center justify-center"
          aria-label="Zoom out">−</button>
        {!editorMode && (
          <button type="button" onClick={() => { centerOnMyCity(); onCenterMyCity?.(); }}
            className="rounded-lg border border-etheria-border bg-black/55 px-3 h-8 text-xs text-etheria-gold-soft backdrop-blur-[2px] hover:bg-black/75">
            {t("play.map.centerMyVillage")}
          </button>
        )}
      </div>

      {/* Bottom-left legend (game mode only) */}
      {!editorMode && (
        <div className="absolute left-3 bottom-3 z-10 flex flex-col gap-1 rounded-lg bg-black/50 px-2 py-1.5 backdrop-blur-sm pointer-events-none">
          {([
            ["#e8c468", t("play.map.legend.own")],
            ["#49f0c5", t("play.map.legend.ally")],
            ["#6fc8ff", t("play.map.legend.peace")],
            ["#d75f43", t("play.map.legend.hostile")],
          ] as [string, string][]).map(([color, label]) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-[9px] text-white/55 leading-none">{label}</span>
            </div>
          ))}
        </div>
      )}
      {/* Brush cursor overlay */}
      {editorMode && brushCursor && terrainTool === "brush" && (() => {
        const rect = outerRef.current?.getBoundingClientRect();
        if (!rect) return null;
        const zoom = cam.current.zoom;
        const cellW = (worldW / (terrainMaskRef.current?.columns ?? 100)) * zoom;
        const cellH = (worldH / (terrainMaskRef.current?.rows ?? 66)) * zoom;
        const brushPx = brushSize * 2 - 1;
        const w = cellW * brushPx;
        const h = cellH * brushPx;
        const color = selectedTerrain ? TERRAIN_COLOR_HEX[selectedTerrain] : "#ffffff";
        return (
          <div
            className="pointer-events-none fixed z-[300] border-2 rounded-sm"
            style={{
              left: brushCursor.x - rect.left - w / 2,
              top: brushCursor.y - rect.top - h / 2,
              width: w, height: h,
              borderColor: color,
              boxShadow: `0 0 0 1px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(0,0,0,0.3)`,
            }}
          />
        );
      })()}
    </div>
  );
});

function relationColor(relation?: string) {
  if (relation === "ally") return "#49f0c5";
  if (relation === "peace") return "#6fc8ff";
  if (relation === "hostile") return "#d75f43";
  return "#e7d6a8";
}

// Memoized: city markers can number in the hundreds and only change when the
// map data does — hover/poll re-renders of the canvas must not rebuild them.
const CityMarker = memo(function CityMarker({ city, x, y, isMe, onClick, onDoubleClick }: {
  city: WorldCity;
  x: number;
  y: number;
  isMe: boolean;
  onClick: (city: WorldCity, e: React.MouseEvent) => void;
  onDoubleClick?: () => void;
}) {
  const color = relationColor(city.relation);
  return (
    <button
      onClick={(e) => onClick(city, e)}
      onDoubleClick={isMe ? onDoubleClick : undefined}
      className="absolute flex flex-col items-center cursor-pointer"
      style={{
        left: x, top: y,
        // Anchor at bottom-center, then counter-scale against parent zoom so the marker stays
        // the same screen size regardless of how far the player zooms out.
        transform: `translate(-50%, -85%) scale(min(1, calc(var(--inv-zoom, 1) * ${isMe ? 1.15 : 1})))`,
        transformOrigin: "50% 85%",
        zIndex: isMe ? 4 : 2,
        willChange: "transform",
      }}
    >
      <img
        src="/assets/map/player-village.png"
        alt=""
        className="pointer-events-none"
        draggable={false}
        style={{
          width: 120, height: 120,
          filter: `drop-shadow(0 3px 6px rgba(0,0,0,0.6))`,
        }}
      />
      {isMe && (
        <div
          className="absolute rounded-full pointer-events-none animate-pulse"
          style={{
            width: 132, height: 132, top: -6,
            border: `2px solid ${color}`,
            boxShadow: `0 0 10px ${color}44`,
          }}
        />
      )}
      {city.level != null && (
        <span
          className="text-[10px] font-bold whitespace-nowrap px-1.5 py-0.5 rounded pointer-events-none"
          style={{ color: "#ffd700", backgroundColor: "rgba(5,7,7,0.85)", marginTop: 1 }}
        >
          Lv.{city.level}
        </span>
      )}
      <span
        className="text-xs font-semibold whitespace-nowrap px-2 py-0.5 rounded pointer-events-none"
        style={{ color, backgroundColor: "rgba(5,7,7,0.80)", marginTop: 1 }}
      >
        {city.name}
      </span>
    </button>
  );
});
