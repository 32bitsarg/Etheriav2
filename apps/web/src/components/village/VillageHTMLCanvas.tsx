"use client";

import React, {
  useRef, useEffect, useState, useCallback, useMemo, memo,
} from "react";
import type { BuildingType } from "@etheria/shared";
import {
  getVillageBuildingFrame,
  normalizeVillageLayout,
  resolveVillageRenderableBuildings,
  getVillageTileKey,
  type VillageLayoutData,
  type VillageLayoutAnchor,
} from "@/lib/villageLayout";
import { getBuildingImagePath, BUILDING_INFO } from "@/lib/constants";
import { useI18n } from "@/i18n";
import { useGameStore } from "@/stores/gameStore";
import { useCountdown } from "@/hooks/useCountdown";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Building {
  id: string;
  type: BuildingType;
  level: number;
  positionX: number;
  positionY: number;
  displayName?: string;
  createdAt?: string;
  upgradedAt?: string;
}

export interface VillageHTMLCanvasProps {
  layout: VillageLayoutData;
  buildings: Building[];
  selectedBuildingId: string | null;
  onSelectBuilding: (id: string) => void;
  queues?: { buildingId: string }[];
  interactionsDisabled?: boolean;
  editorMode?: boolean;
  onAnchorChange?: (payload: { tileKey: string; anchor: VillageLayoutAnchor }) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ZOOM_MIN = 1.0;
const ZOOM_MAX = 2.4;
const ZOOM_STEP = 0.06;
const EDITOR_ZOOM_MIN = 0.3;
const EDITOR_ZOOM_MAX = 3.0;
// A tap is canceled if the pointer travels more than this many screen pixels
const PAN_THRESHOLD = 8;

const AMBIENT_GLINTS = [
  { x: 18, y: 28, size: 6, delay: 0,   dur: 4.2, color: "rgba(255,240,180,0.55)" },
  { x: 55, y: 15, size: 5, delay: 1.4, dur: 3.8, color: "rgba(200,230,255,0.45)" },
  { x: 78, y: 38, size: 7, delay: 0.8, dur: 5.1, color: "rgba(255,245,190,0.50)" },
  { x: 32, y: 62, size: 5, delay: 2.1, dur: 4.6, color: "rgba(180,240,200,0.40)" },
  { x: 67, y: 70, size: 6, delay: 0.3, dur: 3.5, color: "rgba(255,235,160,0.50)" },
  { x: 42, y: 82, size: 4, delay: 1.9, dur: 4.9, color: "rgba(200,220,255,0.40)" },
] as const;

// ─── Main component ───────────────────────────────────────────────────────────

export function VillageHTMLCanvas({
  layout,
  buildings,
  selectedBuildingId,
  onSelectBuilding,
  queues = [],
  interactionsDisabled = false,
  editorMode = false,
  onAnchorChange,
}: VillageHTMLCanvasProps) {
  const { t } = useI18n();
  const buildQueues = useGameStore((s) => s.buildQueues);
  const outerRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1280, h: 720 });
  const [isDraggingBuilding, setIsDraggingBuilding] = useState(false);

  // Camera stored in ref — never triggers React re-render
  const cam = useRef({ x: 0, y: 0, zoom: 1 });
  const rafPending = useRef(false);
  const resizeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Set by building button onPointerDown before event bubbles to outer div
  const draggingBuildingRef = useRef<{ building: Building } | null>(null);
  // Parallax cloud layer ref (moved at 0.2× camera speed)
  const cloudsRef = useRef<HTMLDivElement>(null);
  // Fog overlay ref (opacity scales with zoom-out)
  const fogRef = useRef<HTMLDivElement>(null);

  // Pointer drag state
  const pointerState = useRef<{
    type: "pan" | "building";
    startClientX: number;
    startClientY: number;
    startCamX: number;
    startCamY: number;
    pointerId: number;
    hasPanned: boolean;
    // building drag
    tileKey?: string;
    startAnchorX?: number;
    startAnchorY?: number;
  } | null>(null);

  // Touch pinch state
  const pinch = useRef<{ dist: number; midX: number; midY: number } | null>(null);

  const normalizedLayout = useMemo(() => normalizeVillageLayout(layout), [layout]);
  const upgradingIds = useMemo(() => new Set(buildQueues.map((q) => q.buildingId)), [buildQueues]);
  const renderableBuildings = useMemo(() => resolveVillageRenderableBuildings(buildings), [buildings]);
  const queueByBuildingId = useMemo(
    () => Object.fromEntries(buildQueues.map((q) => [q.buildingId, q])),
    [buildQueues]
  );

  // Pre-compute all building frames once — only recalculates when layout/size/buildings change
  const frames = useMemo(() => {
    const map: Record<string, ReturnType<typeof getVillageBuildingFrame>> = {};
    for (const b of renderableBuildings) {
      map[b.id] = getVillageBuildingFrame(
        normalizedLayout, size.w, size.h, b.positionX, b.positionY, b.type
      );
    }
    return map;
  }, [normalizedLayout, size.w, size.h, renderableBuildings]);

  const zMin = editorMode ? EDITOR_ZOOM_MIN : ZOOM_MIN;
  const zMax = editorMode ? EDITOR_ZOOM_MAX : ZOOM_MAX;

  // Apply camera — batched via rAF, sub-pixel rounded
  const applyCamera = useCallback(() => {
    if (rafPending.current) return;
    rafPending.current = true;
    requestAnimationFrame(() => {
      rafPending.current = false;
      const el = cameraRef.current;
      if (!el) return;
      const { x, y, zoom } = cam.current;
      el.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px) scale(${zoom})`;

      // Parallax clouds at 0.2× camera speed
      const clouds = cloudsRef.current;
      if (clouds) {
        clouds.style.transform = `translate(${Math.round(x * 0.2)}px,${Math.round(y * 0.15)}px)`;
      }

      // Fog opacity increases as zoom-out: 0 at zoom>=1.0, max 0.85 at zoom<=0.6
      const fog = fogRef.current;
      if (fog) {
        const fogOpacity = Math.max(0, Math.min(0.85, (0.95 - zoom) * 2.2));
        fog.style.opacity = String(fogOpacity);
      }
    });
  }, []);

  const clampCamera = useCallback(
    (x: number, y: number, zoom: number, vw: number, vh: number) => {
      const z = Math.min(zMax, Math.max(zMin, zoom));
      const rw = vw * z;
      const rh = vh * z;
      if (z < 1) {
        return { x: (vw - rw) / 2, y: (vh - rh) / 2, zoom: z };
      }
      return {
        x: Math.max(vw - rw, Math.min(0, x)),
        y: Math.max(vh - rh, Math.min(0, y)),
        zoom: z,
      };
    },
    [zMin, zMax]
  );

  // Initialize camera — center world + responsive zoom for mobile
  useEffect(() => {
    const w = outerRef.current?.clientWidth ?? window.innerWidth;
    const h = outerRef.current?.clientHeight ?? window.innerHeight;
    const isMobile = w < 768;
    const zoom = isMobile ? Math.max(1.4, 900 / w) : 1;
    cam.current = {
      x: (w * (1 - zoom)) / 2,
      y: (h * (1 - zoom)) / 2,
      zoom,
    };
    applyCamera();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only on mount

  // ResizeObserver — debounced 80ms to avoid rapid re-renders on window resize
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width <= 0 || height <= 0) return;
      clearTimeout(resizeTimer.current);
      resizeTimer.current = setTimeout(() => setSize({ w: width, h: height }), 80);
    });
    ro.observe(el);
    const rect = el.getBoundingClientRect();
    if (rect.width > 0) setSize({ w: rect.width, h: rect.height });
    return () => { ro.disconnect(); clearTimeout(resizeTimer.current); };
  }, []);

  // Wheel zoom — centered on cursor (passive: false needed for preventDefault)
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1 + ZOOM_STEP : 1 - ZOOM_STEP;
      const oldZoom = cam.current.zoom;
      const newZoom = Math.min(zMax, Math.max(zMin, oldZoom * factor));
      const s = newZoom / oldZoom;
      const clamped = clampCamera(
        mx - (mx - cam.current.x) * s,
        my - (my - cam.current.y) * s,
        newZoom, size.w, size.h
      );
      cam.current = clamped;
      applyCamera();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [applyCamera, clampCamera, size.w, size.h, zMin, zMax]);

  // Prevent native browser pinch-zoom from intercepting our touch gesture
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const handler = (e: TouchEvent) => { if (e.touches.length >= 2) e.preventDefault(); };
    el.addEventListener("touchmove", handler, { passive: false });
    return () => el.removeEventListener("touchmove", handler);
  }, []);

  // Cleanup pointer capture if component unmounts during drag
  useEffect(() => {
    return () => { pointerState.current = null; };
  }, []);

  // ── Pointer handlers ────────────────────────────────────────────────────────

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 && e.pointerType !== "touch") return;
      if (editorMode) e.currentTarget.setPointerCapture(e.pointerId);

      // Check if a building button registered itself before this event bubbled up
      const dragging = draggingBuildingRef.current;
      draggingBuildingRef.current = null;

      if (dragging && editorMode) {
        const tileKey = getVillageTileKey(dragging.building.positionX, dragging.building.positionY);
        const anchor = normalizedLayout.anchors[tileKey];
        pointerState.current = {
          type: "building",
          startClientX: e.clientX,
          startClientY: e.clientY,
          startCamX: cam.current.x,
          startCamY: cam.current.y,
          pointerId: e.pointerId,
          hasPanned: false,
          tileKey,
          startAnchorX: anchor?.x ?? 0,
          startAnchorY: anchor?.y ?? 0,
        };
        setIsDraggingBuilding(true);
        return;
      }

      pointerState.current = {
        type: "pan",
        startClientX: e.clientX,
        startClientY: e.clientY,
        startCamX: cam.current.x,
        startCamY: cam.current.y,
        pointerId: e.pointerId,
        hasPanned: false,
      };
    },
    [editorMode, normalizedLayout.anchors]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const ps = pointerState.current;
      if (!ps || ps.pointerId !== e.pointerId) return;

      const dx = e.clientX - ps.startClientX;
      const dy = e.clientY - ps.startClientY;

      if (ps.type === "pan") {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (!ps.hasPanned && dist < PAN_THRESHOLD) return; // below threshold → still a tap
        ps.hasPanned = true;
        const clamped = clampCamera(ps.startCamX + dx, ps.startCamY + dy, cam.current.zoom, size.w, size.h);
        cam.current.x = clamped.x;
        cam.current.y = clamped.y;
        applyCamera();
        return;
      }

      if (ps.type === "building" && ps.tileKey != null && ps.startAnchorX != null && ps.startAnchorY != null) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < PAN_THRESHOLD) return;
        ps.hasPanned = true;
        const newX = Math.min(1, Math.max(0, ps.startAnchorX + dx / (size.w * cam.current.zoom)));
        const newY = Math.min(1, Math.max(0, ps.startAnchorY + dy / (size.h * cam.current.zoom)));
        onAnchorChange?.({ tileKey: ps.tileKey, anchor: { x: +newX.toFixed(4), y: +newY.toFixed(4) } });
      }
    },
    [applyCamera, clampCamera, size.w, size.h, onAnchorChange]
  );

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (pointerState.current?.type === "building") setIsDraggingBuilding(false);
    pointerState.current = null;
  }, []);

  // ── Touch pinch-to-zoom ─────────────────────────────────────────────────────

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    pinch.current = {
      dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
      midX: (a.clientX + b.clientX) / 2,
      midY: (a.clientY + b.clientY) / 2,
    };
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
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
      const clamped = clampCamera(
        midX - (midX - cam.current.x) * s,
        midY - (midY - cam.current.y) * s,
        newZoom, size.w, size.h
      );
      cam.current = clamped;
      applyCamera();
      pinch.current.dist = newDist;
    },
    [applyCamera, clampCamera, size.w, size.h, zMin, zMax]
  );

  const onTouchEnd = useCallback(() => { pinch.current = null; }, []);

  // ── Building interaction handlers ───────────────────────────────────────────

  const handleBuildingClick = useCallback(
    (id: string) => {
      // Suppress click if the pointer had traveled beyond the pan threshold
      if (pointerState.current?.hasPanned) return;
      if (interactionsDisabled) return;
      onSelectBuilding(id);
    },
    [interactionsDisabled, onSelectBuilding]
  );

  const handleBuildingPointerDown = useCallback(
    (_e: React.PointerEvent<HTMLButtonElement>, building: Building) => {
      if (!editorMode) return;
      // Store building info and let the event bubble to the outer div,
      // which will capture the pointer and handle all subsequent move/up events.
      draggingBuildingRef.current = { building };
    },
    [editorMode]
  );

  // ── Editor overlays (memoized — don't recreate on every render) ────────────

  const gridOverlay = useMemo(() => {
    if (!editorMode || !layout.editor?.showGrid) return null;
    const cols = Math.ceil(size.w / 64) + 1;
    const rows = Math.ceil(size.h / 64) + 1;
    return (
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-20">
        {Array.from({ length: cols }, (_, i) => (
          <line key={`v${i}`} x1={i * 64} y1={0} x2={i * 64} y2={size.h} stroke="#f59e0b" strokeWidth={0.5} />
        ))}
        {Array.from({ length: rows }, (_, i) => (
          <line key={`h${i}`} x1={0} y1={i * 64} x2={size.w} y2={i * 64} stroke="#f59e0b" strokeWidth={0.5} />
        ))}
      </svg>
    );
  }, [editorMode, layout.editor?.showGrid, size.w, size.h]);

  return (
    <div
      ref={outerRef}
      className="relative h-full w-full overflow-hidden select-none"
      style={{ background: "#0a110e", touchAction: "none", cursor: isDraggingBuilding ? "grabbing" : undefined }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Parallax cloud layer — moves at 0.2× camera speed (outside camera div intentionally) */}
      <div
        ref={cloudsRef}
        className="pointer-events-none absolute inset-0"
        style={{ willChange: "transform" }}
      >
        {[
          { x: 8, y: 6, w: 120, h: 40, opacity: 0.06, blur: 18, delay: 0, dur: 22 },
          { x: 35, y: 12, w: 180, h: 55, opacity: 0.05, blur: 22, delay: 7, dur: 28 },
          { x: 62, y: 4, w: 140, h: 45, opacity: 0.07, blur: 16, delay: 3, dur: 19 },
          { x: 78, y: 18, w: 100, h: 35, opacity: 0.04, blur: 20, delay: 11, dur: 25 },
          { x: 20, y: 20, w: 160, h: 50, opacity: 0.05, blur: 24, delay: 5, dur: 32 },
        ].map((c, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${c.x}%`,
              top: `${c.y}%`,
              width: c.w,
              height: c.h,
              background: "rgba(200,220,255,1)",
              opacity: c.opacity,
              filter: `blur(${c.blur}px)`,
              animation: `cloud-drift ${c.dur}s ${c.delay}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      {/* Fog of zoom — opacity increases when zooming out */}
      <div
        ref={fogRef}
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 80% 75% at 50% 50%, transparent 30%, rgba(8,14,10,1) 100%)",
          opacity: 0,
          willChange: "opacity",
        }}
      />

      {/* Camera container — only this element CSS-transforms; zero React work during pan/zoom */}
      <div
        ref={cameraRef}
        className="absolute inset-0"
        style={{ transformOrigin: "0 0", willChange: "transform" }}
      >
        {/* Background */}
        <img
          src={normalizedLayout.backgroundAssetPath}
          alt=""
          className="absolute inset-0 h-full w-full object-cover pointer-events-none"
          draggable={false}
          loading="eager"
          decoding="async"
        />

        {/* Vignette */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ boxShadow: "inset 0 0 200px 50px rgba(8,14,10,.60)" }}
        />

        {/* Ambient CSS glints — pure CSS animation, zero JS cost */}
        {AMBIENT_GLINTS.map((g, i) => (
          <div
            key={i}
            className="pointer-events-none absolute rounded-full"
            style={{
              left: `${g.x}%`,
              top: `${g.y}%`,
              width: g.size,
              height: g.size,
              background: g.color,
              filter: "blur(2px)",
              animation: `village-glint ${g.dur}s ${g.delay}s ease-in-out infinite`,
            }}
          />
        ))}

        {/* Editor: grid overlay (memoized SVG) */}
        {gridOverlay}

        {/* Editor: safe area */}
        {editorMode && layout.editor?.showSafeAreas && (
          <div
            className="pointer-events-none absolute border-2 border-dashed border-cyan-400/50"
            style={{ left: "16%", top: "22%", width: "68%", height: "56%" }}
          />
        )}

        {/* Buildings */}
        {renderableBuildings.map((building) => {
          const frame = frames[building.id];
          if (!frame) return null;
          const tileKey = getVillageTileKey(building.positionX, building.positionY);
          const isHidden = layout.editor?.buildings?.[tileKey]?.hidden;
          if (isHidden && !editorMode) return null;
          const isDraggingThis = isDraggingBuilding && pointerState.current?.tileKey === tileKey;

          return (
            <BuildingButton
              key={building.id}
              building={building}
              frame={frame}
              tileKey={tileKey}
              isSelected={building.id === selectedBuildingId}
              isUpgrading={upgradingIds.has(building.id)}
              isHidden={!!isHidden}
              isDragging={isDraggingThis}
              queue={queueByBuildingId[building.id] ?? null}
              label={building.displayName ?? t(BUILDING_INFO[building.type]?.nameKey ?? building.type)}
              editorMode={editorMode}
              interactionsDisabled={interactionsDisabled}
              onClick={handleBuildingClick}
              onPointerDown={handleBuildingPointerDown}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── BuildingButton (memoized — only re-renders when its own props change) ────

interface BuildingButtonProps {
  building: Building;
  frame: ReturnType<typeof getVillageBuildingFrame>;
  tileKey: string;
  isSelected: boolean;
  isUpgrading: boolean;
  isHidden: boolean;
  isDragging: boolean;
  queue: { startedAt: string; completesAt: string } | null;
  label: string;
  editorMode: boolean;
  interactionsDisabled: boolean;
  onClick: (id: string) => void;
  onPointerDown: (e: React.PointerEvent<HTMLButtonElement>, b: Building) => void;
}

const BuildingButton = memo(function BuildingButton({
  building,
  frame,
  isSelected,
  isUpgrading,
  isHidden,
  isDragging,
  queue,
  label,
  editorMode,
  interactionsDisabled,
  onClick,
  onPointerDown,
}: BuildingButtonProps) {
  const imgSrc = getBuildingImagePath(building.type, building.level);

  return (
    <button
      data-building-id={building.id}
      onClick={() => onClick(building.id)}
      onPointerDown={(e) => onPointerDown(e, building)}
      disabled={interactionsDisabled && !editorMode}
      className="village-building group absolute cursor-pointer disabled:cursor-default"
      style={{
        left: frame.left,
        top: frame.top,
        width: Math.max(frame.width, 20),
        height: Math.max(frame.height, 20),
        zIndex: isDragging ? 999 : frame.zIndex,
        opacity: isHidden ? 0.35 : isDragging ? 0.72 : 1,
        cursor: editorMode ? (isDragging ? "grabbing" : "grab") : "pointer",
        touchAction: "none",
        willChange: "transform",
      }}
      title={`${label} Nv ${building.level}`}
    >
      {/* Sprite */}
      <img
        src={imgSrc}
        alt={label}
        className="h-full w-full object-contain pointer-events-none"
        draggable={false}
        loading="eager"
        decoding="async"
        style={{
          filter: isSelected
            ? "drop-shadow(0 0 8px rgba(245,158,11,0.9)) brightness(1.12)"
            : "drop-shadow(0 4px 8px rgba(0,0,0,0.55))",
          transform: isSelected ? "scale(1.08)" : "scale(1)",
          transition: "transform 0.15s ease, filter 0.15s ease",
          willChange: isSelected ? "filter, transform" : "transform",
        }}
      />

      {/* Selection ring */}
      {isSelected && (
        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{ boxShadow: "0 0 0 2px rgba(245,158,11,.85), 0 0 20px 6px rgba(245,158,11,.30)" }}
        />
      )}

      {/* Upgrade badge */}
      {isUpgrading && (
        <span className="pointer-events-none absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] shadow-md ring-2 ring-white">
          🏗️
        </span>
      )}

      {/* Upgrade countdown */}
      {queue && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end pb-0.5">
          <UpgradeTimer completesAt={queue.completesAt} />
        </div>
      )}

      {/* Hover tooltip */}
      <div className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-stone-900/92 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-xl backdrop-blur-sm group-hover:block">
        {label}
        <span className="ml-1.5 text-amber-300">Nv {building.level}</span>
        {isUpgrading && <span className="ml-1.5 text-stone-400 text-[10px]">↑ mejorando</span>}
      </div>
    </button>
  );
});

// ─── UpgradeTimer ─────────────────────────────────────────────────────────────

function UpgradeTimer({ completesAt }: { completesAt: string }) {
  const { remaining } = useCountdown(completesAt);
  const secs = remaining() ?? 0;
  if (secs <= 0) return null;
  const display =
    secs < 60 ? `${secs}s` :
    secs < 3600 ? `${Math.floor(secs / 60)}m ${secs % 60}s` :
    `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
  return (
    <span className="rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-amber-300 backdrop-blur-sm">
      {display}
    </span>
  );
}
