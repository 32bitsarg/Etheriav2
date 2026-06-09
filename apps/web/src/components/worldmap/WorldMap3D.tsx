"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { WorldMapConfig } from "@/hooks/useCity";
import type { WorldMovement } from "@etheria/shared";
import type { WorldTerrainMaskData } from "@/lib/worldTerrainMask";
import { createIsometricCamera, updateIsoCameraZoom } from "@/lib/three/IsometricCamera";
import { createScene } from "@/lib/three/SceneHelpers";
import { generateHeightmap, generateColorArray, type HeightmapData } from "@/lib/terrain3d/heightmap";
import { buildTerrainChunk } from "@/lib/terrain3d/meshBuilder";

const ARCHETYPE_COLORS: Record<string, string> = {
  RAIDERS: "#d75f43", HUNTERS: "#49f0c5", MARAUDERS: "#ff6b35", WARHOST: "#9b59b6", NOMADS: "#f39c12",
};

let THREE_IMPORT: typeof import("three") | null = null;
async function getTHREE() {
  if (!THREE_IMPORT) THREE_IMPORT = await import("three");
  return THREE_IMPORT;
}

type WorldCity = { id: string; name: string; posX: number; posY: number; level?: number; relation?: string };
type BarbarianCamp = { id: string; name: string; level: number; archetype: string; posX: number; posY: number; status: string };

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.4;
const PAN_THRESHOLD = 6;

function cityToWorld(cx: number, cy: number, worldW: number, worldH: number) {
  return { x: cx, z: cy };
}

export function WorldMap3D({
  cities, mapConfig, myCityId, barbarianCamps = [], movements = [], seasonState, terrainMask,
  onSelectCityId, onSelectCamp,
}: {
  cities: WorldCity[]; mapConfig: WorldMapConfig | null; myCityId?: string | null;
  barbarianCamps?: BarbarianCamp[]; movements?: WorldMovement[]; seasonState?: any;
  terrainMask?: WorldTerrainMaskData | null;
  onSelectCityId?: (cityId: string, position: { x: number; y: number }) => void;
  onSelectCamp?: (camp: BarbarianCamp) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 900, h: 620 });
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const labelRendererRef = useRef<any>(null);
  const camState = useRef({ zoom: 0.85 });
  const pointerState = useRef<{
    startClientX: number; startClientY: number;
    startCamX: number; startCamZ: number;
    pointerId: number; hasPanned: boolean;
  } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const hasBuiltTerrain = useRef(false);
  const markersRef = useRef<any[]>([]);

  const calculateSize = useCallback(() => {
    const b = containerRef.current?.getBoundingClientRect();
    return b ? { w: Math.floor(b.width), h: Math.floor(b.height) } : { w: 900, h: 620 };
  }, []);

  useLayoutEffect(() => {
    setSize(calculateSize());
    const obs = new ResizeObserver(() => setSize(calculateSize()));
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [calculateSize]);

  useEffect(() => {
    if (!containerRef.current || sceneRef.current) return;
    let destroyed = false;

    (async () => {
      const THREE = await getTHREE();
      if (destroyed) return;

      const aspect = size.w / Math.max(1, size.h);
      const camera = createIsometricCamera(aspect, { frustumSize: 1200, near: 0.1, far: 3000 });
      camera.position.set(800, 1000, 800);
      const scene = createScene();
      scene.background = new THREE.Color("#070a0a");

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(size.w, size.h);
      renderer.setClearColor("#070a0a");
      renderer.shadowMap.enabled = true;
      containerRef.current!.appendChild(renderer.domElement);

      // CSS2D renderer for labels
      const labelRenderer = await (async () => {
        const { CSS2DRenderer } = await import("three/addons/renderers/CSS2DRenderer.js");
        const lr = new CSS2DRenderer();
        lr.setSize(size.w, size.h);
        lr.domElement.style.position = "absolute";
        lr.domElement.style.top = "0";
        lr.domElement.style.left = "0";
        lr.domElement.style.pointerEvents = "none";
        containerRef.current!.appendChild(lr.domElement);
        return lr;
      })();

      sceneRef.current = scene;
      cameraRef.current = camera;
      rendererRef.current = renderer;
      labelRendererRef.current = labelRenderer;

      const loop = () => {
        if (destroyed) return;
        renderer.render(scene, camera);
        if (labelRenderer) {
          labelRenderer.render(scene, camera);
        }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
      setLoaded(true);
    })();

    return () => { destroyed = true; };
  }, []);

  useEffect(() => {
    if (!loaded || !sceneRef.current || !mapConfig || hasBuiltTerrain.current) return;
    const scene = sceneRef.current;
    const mask = terrainMask;
    const columns = mask?.columns ?? 72;
    const rows = mask?.rows ?? 48;
    const cells = mask?.cells ?? new Array(columns * rows).fill("PLAINS");

    const heightData: HeightmapData = { cells, columns, rows, worldWidth: mapConfig.width, worldHeight: mapConfig.height };
    const heights = generateHeightmap(heightData);
    const colors = generateColorArray(heightData);
    const chunkSize = 12;
    const chunksX = Math.ceil(columns / chunkSize);
    const chunksZ = Math.ceil(rows / chunkSize);

    for (let cx = 0; cx < chunksX; cx++)
      for (let cz = 0; cz < chunksZ; cz++) {
        const mesh = buildTerrainChunk(cx, cz, chunkSize, columns, rows, mapConfig.width, mapConfig.height, heights, colors);
        if (mesh) scene.add(mesh);
      }

    hasBuiltTerrain.current = true;
  }, [loaded, mapConfig, terrainMask]);

  // City and camp markers via CSS2DObjects
  useEffect(() => { (async () => {
    if (!loaded || !sceneRef.current || !mapConfig) return;
    const THREE = THREE_IMPORT;
    if (!THREE) return;
    const scene = sceneRef.current;

    // Clear old markers
    for (const m of markersRef.current) scene.remove(m);
    markersRef.current = [];

    const createLabel = (text: string, color: string, icon: string) => {
      const div = document.createElement("div");
      div.style.cssText = `color:${color};font-size:10px;font-weight:600;text-align:center;text-shadow:0 1px 3px rgba(0,0,0,0.9);white-space:nowrap;padding:2px 6px;background:rgba(5,7,7,0.75);border-radius:4px;`;
      div.innerHTML = `${icon} ${text}`;
      return new (THREE as any).CSS2DObject ? new (THREE as any).CSS2DObject(div) : null;
    };

    const { CSS2DObject } = await import("three/addons/renderers/CSS2DRenderer.js") as any;

    for (const city of cities) {
      const isMe = city.id === myCityId;
      const color = city.relation === "ally" ? "#49f0c5" : city.relation === "peace" ? "#6fc8ff" : city.relation === "hostile" ? "#d75f43" : "#e7d6a8";
      const div = document.createElement("div");
      div.style.cssText = `display:flex;flex-direction:column;align-items:center;gap:1px;`;
      div.innerHTML = `<div style="width:${isMe ? 14 : 10}px;height:${isMe ? 14 : 10}px;background:${color};border-radius:50%;box-shadow:0 0 ${isMe ? 8 : 4}px ${color};"></div><span style="color:${color};font-size:9px;font-weight:600;background:rgba(5,7,7,0.75);padding:1px 4px;border-radius:3px;text-shadow:0 1px 2px rgba(0,0,0,0.9);">${city.name}</span>`;
      const label = new CSS2DObject(div);
      const world = cityToWorld(city.posX, city.posY, mapConfig.width, mapConfig.height);
      label.position.set(world.x, 8, world.z);
      scene.add(label);
      markersRef.current.push(label);
    }

    for (const camp of barbarianCamps) {
      if (camp.status !== "ACTIVE") continue;
      const color = ARCHETYPE_COLORS[camp.archetype] ?? "#d75f43";
      const div = document.createElement("div");
      div.style.cssText = `display:flex;flex-direction:column;align-items:center;gap:1px;`;
      div.innerHTML = `<div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:8px solid ${color};filter:drop-shadow(0 1px 2px rgba(0,0,0,0.7));"></div><span style="color:#ff6b6b;font-size:8px;font-weight:700;background:rgba(5,7,7,0.7);padding:0 3px;border-radius:2px;">Lv.${camp.level}</span><span style="color:${color};font-size:8px;background:rgba(5,7,7,0.7);padding:0 3px;border-radius:2px;">${camp.name}</span>`;
      const label = new CSS2DObject(div);
      const world = cityToWorld(camp.posX, camp.posY, mapConfig.width, mapConfig.height);
      label.position.set(world.x, 5, world.z);
      scene.add(label);
      markersRef.current.push(label);
    }
  })(); }, [loaded, cities, barbarianCamps, myCityId, mapConfig]);

  // Weather fog
  useEffect(() => {
    if (!loaded || !sceneRef.current) return;
    const scene = sceneRef.current;
    if (!seasonState) { scene.fog = null; return; }
    const season = seasonState.currentSeason;
    const intensity = seasonState.intensity ?? 1;
    let color = 0x000000;
    if (season === "WINTER") color = 0xaabbcc;
    else if (season === "AUTUMN") color = 0xcc9966;
    else if (season === "SUMMER") color = 0xffeebb;
    const FogClass = (THREE_IMPORT as any)?.Fog;
    scene.fog = FogClass ? new FogClass(color, 400, 1400 / intensity) : null;
  }, [loaded, seasonState]);

  useEffect(() => {
    if (!loaded) return;
    rendererRef.current?.setSize(size.w, size.h);
    labelRendererRef.current?.setSize(size.w, size.h);
    if (cameraRef.current) {
      const aspect = size.w / Math.max(1, size.h);
      updateIsoCameraZoom(cameraRef.current, aspect, camState.current.zoom);
    }
  }, [size, loaded]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType !== "touch") return;
    const cam = cameraRef.current;
    pointerState.current = {
      startClientX: e.clientX, startClientY: e.clientY,
      startCamX: cam?.position.x ?? 0, startCamZ: cam?.position.z ?? 0,
      pointerId: e.pointerId, hasPanned: false,
    };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const ps = pointerState.current;
    if (!ps || ps.pointerId !== e.pointerId) return;
    const dx = e.clientX - ps.startClientX;
    const dy = e.clientY - ps.startClientY;
    if (!ps.hasPanned && Math.sqrt(dx * dx + dy * dy) < PAN_THRESHOLD) return;
    ps.hasPanned = true;
    if (cameraRef.current) {
      const cam = cameraRef.current;
      const s = 2.0 / camState.current.zoom;
      cam.position.x = ps.startCamX - dx * s;
      cam.position.z = ps.startCamZ - dy * s;
    }
  }, []);

  const onPointerUp = useCallback(() => { pointerState.current = null; }, []);

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.06 : 0.94;
    camState.current.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, camState.current.zoom * factor));
    if (cameraRef.current) {
      const aspect = size.w / Math.max(1, size.h);
      updateIsoCameraZoom(cameraRef.current, aspect, camState.current.zoom);
    }
  }, [size]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  if (!mapConfig) {
    return (
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#070a0a] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
        <p className="text-stone-500 text-xs">Cargando mapa 3D...</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden" style={{ touchAction: "none" }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
    />
  );
}
