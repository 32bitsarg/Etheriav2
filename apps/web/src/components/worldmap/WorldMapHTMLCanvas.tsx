"use client";

import React, {
  useRef, useEffect, useState, useCallback, memo,
} from "react";
import type { WorldMovement } from "@etheria/shared";
import { useI18n } from "@/i18n";

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

const ZOOM_STEP = 0.06;
const PAN_THRESHOLD = 6;
const FOG_RADIUS = 140;

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
  barbarianCamps = [],
  onSelectCamp,
  movements = [],
  seasonState,
}: {
  cities: WorldCity[];
  mapConfig: MapConfig | null;
  myCityId?: string | null;
  onSelectCityId?: (cityId: string, position: { x: number; y: number }) => void;
  onCenterMyCity?: () => void;
  barbarianCamps?: BarbarianCamp[];
  onSelectCamp?: (camp: BarbarianCamp, position: { x: number; y: number }) => void;
  movements?: (WorldMovement & { relation?: "ally" | "peace" | "hostile" | "neutral" | "own" })[];
  seasonState?: any;
}) {
  const { t } = useI18n();
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
  const weatherRef = useRef<HTMLDivElement>(null);
  const movementEls = useRef(new Map<string, HTMLDivElement>());

  const worldW = mapConfig?.width ?? 3600;
  const worldH = mapConfig?.height ?? 2400;
  const halfW = Math.floor(worldW / 2);
  const halfH = Math.floor(worldH / 2);

  const zMin = mapConfig?.cameraMinZoom ?? 0.5;
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
    const z = Math.min(zMax, Math.max(zMin, zoom));
    const vw = outerRef.current?.clientWidth ?? size.w;
    const vh = outerRef.current?.clientHeight ?? size.h;

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
    const { width, height } = fc;
    ctx.clearRect(0, 0, width, height);

    const fogAlpha = myCityId ? 0.42 : cities.length > 0 ? 0.18 : 0.1;
    ctx.fillStyle = `rgba(2,4,8,${fogAlpha})`;
    ctx.fillRect(0, 0, width, height);

    if (myCityId) {
      const myCity = cities.find((c) => c.id === myCityId);
      if (myCity) {
        const l = worldToLocal(myCity.posX, myCity.posY);
        const s = localToScreen(l.x, l.y);
        const fogRadius = 140;
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.arc(s.x, s.y, fogRadius * cam.current.zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }, [cities, myCityId, worldToLocal, localToScreen]);

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
      const wx = origin.x + (destination.x - origin.x) * progress;
      const wy = origin.y + (destination.y - origin.y) * progress;
      const el = movementEls.current.get(m.id);
      if (!el) continue;
      // Fog of war: PvP foreign marches only show inside visibility circle.
      // Barbarian movements (BARBARIAN_ATTACK / BARBARIAN_RAID) are always visible
      // so the world feels alive with bot activity.
      const isBarbarian = m.type === "BARBARIAN_ATTACK" || m.type === "BARBARIAN_RAID";
      if (!isBarbarian && myCity && m.relation !== "own") {
        const dist = Math.hypot(wx - myCity.posX, wy - myCity.posY);
        const visible = dist <= FOG_RADIUS;
        el.style.display = visible ? "" : "none";
        if (!visible) continue;
      }
      const l = worldToLocal(wx, wy);
      el.style.left = `${l.x}px`;
      el.style.top = `${l.y}px`;
    }
  }, [movements, worldToLocal, cities, myCityId]);

  // ─── rAF loop ────────────────────────────────────────────────────────────

  const applyCameraRef = useRef(applyCamera);
  applyCameraRef.current = applyCamera;
  const drawFogRef = useRef(drawFog);
  drawFogRef.current = drawFog;
  const updateMovementsRef = useRef(updateMovements);
  updateMovementsRef.current = updateMovements;
  const movementsRef = useRef(movements);
  movementsRef.current = movements;

  // Repaint camera/fog when data they depend on changes (not just input)
  useEffect(() => {
    camDirty.current = true;
  }, [cities, myCityId, seasonState, size, movements]);

  useEffect(() => {
    let raf = 0;
    let lastMovementTick = 0;
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

  // ─── Initial camera center ───────────────────────────────────────────────

  useEffect(() => {
    if (!mapConfig || hasStarted.current) return;
    const vw = outerRef.current?.clientWidth ?? 0;
    const vh = outerRef.current?.clientHeight ?? 0;
    if (vw < 50 || vh < 50) return;

    const initialZoom = mapConfig.cameraInitialZoom;
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

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType !== "touch") return;
    pointerState.current = {
      startClientX: e.clientX, startClientY: e.clientY,
      startCamX: cam.current.x, startCamY: cam.current.y,
      pointerId: e.pointerId, hasPanned: false,
    };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
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

  const onPointerUp = useCallback(() => { pointerState.current = null; }, []);

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
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#070a0a] gap-3">
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
        className="relative h-full w-full overflow-hidden select-none rounded-lg border border-etheria-border/40 shadow-[0_28px_80px_rgba(0,0,0,.55)]"
        style={{ background: "#070a0a", touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
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
            left: -halfW,
            top: -halfH,
            width: worldW,
            height: worldH,
          }}
        >
          {/* Background image */}
          <img
            src={bgPath}
            alt=""
            className="absolute inset-0 h-full w-full pointer-events-none"
            draggable={false}
          />

          {/* Cities */}
          {cities.map((city) => (
            <CityMarker
              key={city.id}
              city={city}
              x={city.posX + halfW}
              y={city.posY + halfH}
              isMe={city.id === myCityId}
              onClick={handleCityClick}
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
                  style={{ left: l.x, top: l.y, transform: "translate(-50%, -70%)", zIndex: 2 }}
                >
                  <div
                    className="pointer-events-none"
                    style={{
                      width: 0, height: 0,
                      borderLeft: "6px solid transparent",
                      borderRight: "6px solid transparent",
                      borderBottom: `10px solid ${color}`,
                      filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.6))",
                    }}
                  />
                  <span
                    className="text-[8px] font-bold whitespace-nowrap px-1 py-0.5 rounded pointer-events-none"
                    style={{ color: "#ff6b6b", backgroundColor: "rgba(5,7,7,0.7)", marginTop: 1 }}
                  >
                    Lv.{camp.level}
                  </span>
                  <span className="text-[8px] font-semibold whitespace-nowrap px-1 py-0.5 rounded pointer-events-none"
                    style={{ color, backgroundColor: "rgba(5,7,7,0.7)" }}>
                    {camp.name}
                  </span>
                </button>
              );
            })}

          {/* March trail for the hovered movement */}
          {(() => {
            const hovered = movements.find((m) => m.id === hoveredMovementId);
            if (!hovered) return null;
            const from = worldToLocal(hovered.from.x, hovered.from.y);
            const to = worldToLocal(hovered.to.x, hovered.to.y);
            const color = MOVEMENT_RELATION_COLORS[hovered.relation ?? "neutral"];
            return (
              <svg
                className="absolute inset-0 pointer-events-none"
                width={worldW}
                height={worldH}
                style={{ zIndex: 7 }}
              >
                <line
                  x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke={color} strokeWidth={1.5} strokeDasharray="6 5"
                  strokeLinecap="round" opacity={0.8}
                  style={{ animation: "march-trail-dash 0.8s linear infinite" }}
                />
                <circle cx={from.x} cy={from.y} r={3} fill="none" stroke={color} strokeWidth={1.2} opacity={0.7} />
                <circle cx={to.x} cy={to.y} r={4} fill={color} opacity={0.55} />
              </svg>
            );
          })()}

          {/* Movement markers */}
          {movements.map((m) => {
            const isTrade = m.type === "TRADE";
            const isBarbRaid = m.type === "BARBARIAN_RAID";
            const isBarbAttack = m.type === "BARBARIAN_ATTACK";
            const l = worldToLocal(m.from.x, m.from.y);
            const color = MOVEMENT_RELATION_COLORS[m.relation ?? "neutral"] ?? (isTrade ? "#ffe066" : "#ff8888");
            const icon = isTrade ? "📦" : isBarbRaid ? "🏕️" : isBarbAttack ? "🗡️" : "⚔️";
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
                  left: l.x, top: l.y,
                  transform: "translate(-50%, -50%)",
                  zIndex: isHovered ? 9 : 8, willChange: "left, top",
                }}
                onPointerEnter={() => setHoveredMovementId(m.id)}
                onPointerLeave={() => setHoveredMovementId((id) => (id === m.id ? null : id))}
                onClick={(e) => { e.stopPropagation(); setHoveredMovementId((id) => (id === m.id ? null : m.id)); }}
              >
                <span style={{ fontSize: 11, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.7))" }}>{icon}</span>
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
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

        {/* Fog of War overlay */}
        <canvas
          ref={fogCanvasRef}
          className="absolute inset-0 pointer-events-none"
          width={size.w}
          height={size.h}
          style={{ width: size.w, height: size.h }}
        />

        {/* Weather overlay */}
        <div ref={weatherRef} className="absolute inset-0 pointer-events-none" style={{ transition: "background-color 0.6s" }} />
      </div>

      {/* Center on my city button */}
      <button
        type="button"
        onClick={() => { centerOnMyCity(); onCenterMyCity?.(); }}
        className="absolute right-3 top-3 z-10 rounded-lg border border-etheria-border bg-black/55 px-3 py-2 text-xs text-etheria-gold-soft backdrop-blur-[2px] hover:bg-black/65"
      >
        {t("play.map.centerMyVillage")}
      </button>
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
const CityMarker = memo(function CityMarker({ city, x, y, isMe, onClick }: {
  city: WorldCity;
  x: number;
  y: number;
  isMe: boolean;
  onClick: (city: WorldCity, e: React.MouseEvent) => void;
}) {
  const color = relationColor(city.relation);
  return (
    <button
      onClick={(e) => onClick(city, e)}
      className="absolute flex flex-col items-center cursor-pointer"
      style={{
        left: x, top: y,
        transform: isMe ? "translate(-50%, -85%) scale(1.15)" : "translate(-50%, -85%)",
        zIndex: isMe ? 4 : 2,
        willChange: isMe ? "transform" : "auto",
      }}
    >
      <img
        src="/assets/map/player-village.png"
        alt=""
        className="pointer-events-none"
        draggable={false}
        style={{
          width: 20, height: 20,
          filter: `drop-shadow(0 2px 3px rgba(0,0,0,0.5))`,
        }}
      />
      {isMe && (
        <div
          className="absolute rounded-full pointer-events-none animate-pulse"
          style={{
            width: 28, height: 28, top: -4,
            border: `2px solid ${color}`,
            boxShadow: `0 0 10px ${color}44`,
          }}
        />
      )}
      <span
        className="text-[9px] font-semibold whitespace-nowrap px-1.5 py-0.5 rounded pointer-events-none"
        style={{ color, backgroundColor: "rgba(5,7,7,0.75)", marginTop: 1 }}
      >
        {city.name}
      </span>
    </button>
  );
});
