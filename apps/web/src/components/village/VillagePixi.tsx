"use client";

import { useEffect, useRef, useMemo, memo } from "react";
import { Application, Assets, Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { Viewport } from "pixi-viewport";
import { hapticLight } from "@/lib/native";
import type { BuildingType } from "@etheria/shared";
import {
  getVillageBuildingFrame,
  normalizeVillageLayout,
  resolveVillageRenderableBuildings,
  resolveVillageAnchor,
  getVillageTileKey,
  type VillageLayoutData,
  type VillageLayoutAnchor,
} from "@/lib/villageLayout";
import { getBuildingImagePath, BUILDING_INFO } from "@/lib/constants";
import { useI18n } from "@/i18n";
import { useGameStore } from "@/stores/gameStore";

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

type BuildingNode = {
  c: Container;
  sprite: Sprite;
  ring: Graphics;
  nameLabel: Text;
  timerLabel: Text;
  completesAt: string | null;
};

function formatCountdown(secs: number): string {
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
}

export const VillageHTMLCanvas = memo(function VillagePixi({
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

  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const vpRef = useRef<Viewport | null>(null);
  const bgRef = useRef<Sprite | Graphics | null>(null);
  const buildingsCRef = useRef<Container | null>(null);
  const nodeMapRef = useRef<Map<string, BuildingNode>>(new Map());
  const sizeRef = useRef({ w: 1280, h: 720 });
  const readyRef = useRef(false);
  const fogRef = useRef<HTMLDivElement>(null);

  // Stable refs so Pixi callbacks always see the latest React state
  const selectedIdRef = useRef(selectedBuildingId);
  selectedIdRef.current = selectedBuildingId;
  const editorModeRef = useRef(editorMode);
  editorModeRef.current = editorMode;
  const onSelectRef = useRef(onSelectBuilding);
  onSelectRef.current = onSelectBuilding;
  const onAnchorRef = useRef(onAnchorChange);
  onAnchorRef.current = onAnchorChange;
  const interactionsRef = useRef(interactionsDisabled);
  interactionsRef.current = interactionsDisabled;
  const tRef = useRef(t);
  tRef.current = t;

  const normalizedLayout = useMemo(() => normalizeVillageLayout(layout), [layout]);
  const normLayoutRef = useRef(normalizedLayout);
  normLayoutRef.current = normalizedLayout;

  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  const renderableBuildings = useMemo(() => resolveVillageRenderableBuildings(buildings), [buildings]);

  const queueMap = useMemo(
    () => new Map(buildQueues.map((q) => [q.buildingId, q])),
    [buildQueues],
  );
  const queueMapRef = useRef(queueMap);
  queueMapRef.current = queueMap;

  // ── Build / rebuild Pixi building nodes ────────────────────────────────────

  const buildNodes = useRef(async (bldgs: typeof renderableBuildings, w: number, h: number) => {
    const vp = vpRef.current;
    const buildingsC = buildingsCRef.current;
    if (!vp || !buildingsC) return;

    // Destroy existing nodes
    for (const [, node] of nodeMapRef.current) node.c.destroy({ children: true });
    nodeMapRef.current.clear();
    buildingsC.removeChildren();

    for (const b of bldgs) {
      const tileKey = getVillageTileKey(b.positionX, b.positionY);
      const isHidden = layoutRef.current.editor?.buildings?.[tileKey]?.hidden;
      if (isHidden && !editorModeRef.current) continue;

      const frame = getVillageBuildingFrame(normLayoutRef.current, w, h, b.positionX, b.positionY, b.type);

      const c = new Container();
      c.x = frame.left + frame.width / 2;
      c.y = frame.top + frame.height / 2;
      c.zIndex = frame.zIndex;
      c.eventMode = "static";
      c.cursor = editorModeRef.current ? "grab" : "pointer";

      let sprite: Sprite;
      try {
        const tex: Texture = await Assets.load(getBuildingImagePath(b.type, b.level));
        sprite = new Sprite(tex);
      } catch {
        sprite = new Sprite(Texture.WHITE);
        sprite.tint = 0x556655;
      }
      sprite.anchor.set(0.5);
      sprite.width = frame.width;
      sprite.height = frame.height;
      c.addChild(sprite);

      // Selection ring
      const ring = new Graphics();
      const ringR = Math.max(frame.width, frame.height) / 2 + 6;
      ring.circle(0, 0, ringR).stroke({ color: 0xf59e0b, width: 2, alpha: 0.9 });
      ring.visible = b.id === selectedIdRef.current;
      c.addChild(ring);

      // Name label
      const displayName = b.displayName ?? tRef.current(BUILDING_INFO[b.type]?.nameKey ?? b.type);
      const nameLabel = new Text({
        text: `${displayName} Nv ${b.level}`,
        style: {
          fontSize: 10, fill: 0xffffff, fontWeight: "600",
          dropShadow: { color: 0x000000, alpha: 1, blur: 4, distance: 0 },
        },
      });
      nameLabel.anchor.set(0.5, 1);
      nameLabel.y = -(frame.height / 2) - 4;
      c.addChild(nameLabel);

      // Upgrade countdown label (updated by ticker)
      const timerLabel = new Text({
        text: "",
        style: {
          fontSize: 9, fill: 0xfbbf24, fontWeight: "700",
          dropShadow: { color: 0x000000, alpha: 1, blur: 3, distance: 0 },
        },
      });
      timerLabel.anchor.set(0.5, 1);
      timerLabel.y = nameLabel.y - 13;
      timerLabel.visible = false;
      c.addChild(timerLabel);

      const queue = queueMapRef.current.get(b.id);
      nodeMapRef.current.set(b.id, {
        c, sprite, ring, nameLabel, timerLabel,
        completesAt: queue?.completesAt ?? null,
      });
      buildingsC.addChild(c);

      // Click → select
      c.on("pointertap", (e) => {
        e.stopPropagation();
        if (interactionsRef.current && !editorModeRef.current) return;
        hapticLight();
        onSelectRef.current(b.id);
      });

      // Editor drag
      if (editorModeRef.current) {
        let dragStart = { cx: 0, cy: 0 };
        let anchorStart = { x: 0.5, y: 0.5 };
        let dragging = false;

        c.on("pointerdown", (e) => {
          e.stopPropagation();
          vp.plugins.pause("drag");
          c.cursor = "grabbing";
          dragging = true;
          dragStart = { cx: e.clientX, cy: e.clientY };
          const a = resolveVillageAnchor(normLayoutRef.current, b.positionX, b.positionY, b.type);
          anchorStart = { x: a.x, y: a.y };
        });

        c.on("pointermove", (e) => {
          if (!dragging) return;
          const dx = e.clientX - dragStart.cx;
          const dy = e.clientY - dragStart.cy;
          if (Math.hypot(dx, dy) < 8) return;
          const { w: sw, h: sh } = sizeRef.current;
          const sc = vp.scale.x;
          const nx = +Math.min(1, Math.max(0, anchorStart.x + dx / (sw * sc))).toFixed(4);
          const ny = +Math.min(1, Math.max(0, anchorStart.y + dy / (sh * sc))).toFixed(4);
          onAnchorRef.current?.({ tileKey, anchor: { x: nx, y: ny } });
        });

        const endDrag = () => {
          if (!dragging) return;
          dragging = false;
          c.cursor = "grab";
          vp.plugins.resume("drag");
        };
        c.on("pointerup", endDrag);
        c.on("pointerupoutside", endDrag);
      }
    }

    buildingsC.sortableChildren = true;
  });

  // ── Init Pixi (mount only) ─────────────────────────────────────────────────

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let destroyed = false;
    const app = new Application();
    let ro: ResizeObserver | null = null;

    (async () => {
      const w = el.clientWidth || 1280;
      const h = el.clientHeight || 720;
      sizeRef.current = { w, h };

      await app.init({
        preference: "webgpu",
        backgroundColor: 0x0a110e,
        resizeTo: el,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio, 2),
        autoDensity: true,
      });
      if (destroyed) { app.destroy(); return; }

      el.appendChild(app.canvas as HTMLCanvasElement);
      appRef.current = app;

      const zMin = editorModeRef.current ? 0.3 : (w < 768 ? 0.8 : 1.0);
      const zMax = editorModeRef.current ? 3.0 : 2.4;

      const vp = new Viewport({
        screenWidth: w, screenHeight: h,
        worldWidth: w, worldHeight: h,
        events: app.renderer.events,
      });
      vpRef.current = vp;
      app.stage.addChild(vp);

      vp.drag({ mouseButtons: "left" })
        .pinch()
        .wheel({ smooth: 5 })
        .decelerate({ friction: 0.88 })
        .clampZoom({ minScale: zMin, maxScale: zMax })
        .clamp({ direction: "all" });

      // Background
      try {
        const bgTex: Texture = await Assets.load(normLayoutRef.current.backgroundAssetPath);
        const bg = new Sprite(bgTex);
        bg.width = w; bg.height = h;
        bgRef.current = bg;
        vp.addChild(bg);
      } catch {
        const bg = new Graphics();
        bg.rect(0, 0, w, h).fill({ color: 0x0a110e });
        bgRef.current = bg as unknown as Sprite;
        vp.addChild(bg);
      }

      const buildingsC = new Container();
      buildingsCRef.current = buildingsC;
      vp.addChild(buildingsC);

      await buildNodes.current(renderableBuildings, w, h);
      readyRef.current = true;

      // Ticker: countdown timers + counter-scale labels
      app.ticker.add(() => {
        const now = Date.now();
        const sc = vp.scale.x;
        const lscale = Math.max(0.6, Math.min(2.0, 1 / sc));

        // Update fog opacity via DOM ref
        if (fogRef.current) {
          const fogOpacity = Math.max(0, Math.min(0.85, (0.95 - sc) * 2.2));
          fogRef.current.style.opacity = String(fogOpacity);
        }

        for (const [, node] of nodeMapRef.current) {
          node.nameLabel.scale.set(lscale);
          node.timerLabel.scale.set(lscale);

          if (node.completesAt) {
            const secsLeft = Math.max(0, Math.floor((new Date(node.completesAt).getTime() - now) / 1000));
            if (secsLeft > 0) {
              node.timerLabel.text = `⏱ ${formatCountdown(secsLeft)}`;
              node.timerLabel.visible = true;
            } else {
              node.timerLabel.visible = false;
              node.completesAt = null;
            }
          }
        }
      });

      // ResizeObserver
      ro = new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect;
        if (!width || !height) return;
        sizeRef.current = { w: width, h: height };
        vp.resize(width, height, width, height);
        for (const b of renderableBuildings) {
          const node = nodeMapRef.current.get(b.id);
          if (!node) continue;
          const frame = getVillageBuildingFrame(normLayoutRef.current, width, height, b.positionX, b.positionY, b.type);
          node.c.x = frame.left + frame.width / 2;
          node.c.y = frame.top + frame.height / 2;
          node.c.zIndex = frame.zIndex;
          node.sprite.width = frame.width;
          node.sprite.height = frame.height;
          node.ring.clear().circle(0, 0, Math.max(frame.width, frame.height) / 2 + 6)
            .stroke({ color: 0xf59e0b, width: 2, alpha: 0.9 });
          node.nameLabel.y = -(frame.height / 2) - 4;
          node.timerLabel.y = node.nameLabel.y - 13;
        }
        if (bgRef.current) {
          bgRef.current.width = width;
          bgRef.current.height = height;
        }
      });
      ro.observe(el);
    })();

    return () => {
      destroyed = true;
      readyRef.current = false;
      ro?.disconnect();
      try { app.destroy({ removeView: true }, { children: true }); } catch {}
      appRef.current = null;
      vpRef.current = null;
      buildingsCRef.current = null;
      nodeMapRef.current.clear();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync selection rings ───────────────────────────────────────────────────

  useEffect(() => {
    for (const [id, node] of nodeMapRef.current) {
      const sel = id === selectedBuildingId;
      node.ring.visible = sel;
      node.sprite.scale.set(sel ? 1.08 : 1);
    }
  }, [selectedBuildingId]);

  // ── Sync upgrade timers ────────────────────────────────────────────────────

  useEffect(() => {
    for (const [id, node] of nodeMapRef.current) {
      const q = queueMap.get(id);
      node.completesAt = q?.completesAt ?? null;
      if (!node.completesAt) node.timerLabel.visible = false;
    }
  }, [queueMap]);

  // ── Rebuild nodes when buildings or layout change ─────────────────────────

  useEffect(() => {
    if (!readyRef.current) return;
    const { w, h } = sizeRef.current;
    buildNodes.current(renderableBuildings, w, h);
  }, [renderableBuildings, layout]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden select-none"
      style={{ background: "#0a110e", touchAction: "none", contain: "layout style" }}
    >
      {/* Parallax clouds — decorative CSS, no interaction */}
      <div className="pointer-events-none absolute inset-0">
        {[
          { x: 8, y: 6, w: 120, h: 40, opacity: 0.06, blur: 18, delay: 0, dur: 22 },
          { x: 35, y: 12, w: 180, h: 55, opacity: 0.05, blur: 22, delay: 7, dur: 28 },
          { x: 62, y: 4, w: 140, h: 45, opacity: 0.07, blur: 16, delay: 3, dur: 19 },
          { x: 78, y: 18, w: 100, h: 35, opacity: 0.04, blur: 20, delay: 11, dur: 25 },
        ].map((c, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${c.x}%`, top: `${c.y}%`,
              width: c.w, height: c.h,
              background: "rgba(200,220,255,1)",
              opacity: c.opacity,
              filter: `blur(${c.blur}px)`,
              animation: `cloud-drift ${c.dur}s ${c.delay}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      {/* Fog vignette — opacity driven by ticker via fogRef */}
      <div
        ref={fogRef}
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 80% 75% at 50% 50%, transparent 30%, rgba(8,14,10,1) 100%)",
          opacity: 0,
        }}
      />
    </div>
  );
});
