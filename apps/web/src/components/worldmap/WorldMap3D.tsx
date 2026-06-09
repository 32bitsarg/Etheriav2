"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { WorldMapConfig } from "@/hooks/useCity";
import type { WorldMovement } from "@etheria/shared";
import type { WorldTerrainMaskData } from "@/lib/worldTerrainMask";
import { createIsometricCamera, updateIsoCameraZoom } from "@/lib/three/IsometricCamera";
import { createScene } from "@/lib/three/SceneHelpers";
import { generateHeightmap, generateColorArray, type HeightmapData } from "@/lib/terrain3d/heightmap";
import { buildTerrainChunk } from "@/lib/terrain3d/meshBuilder";

let THREE_IMPORT: typeof import("three") | null = null;
async function getTHREE() {
  if (!THREE_IMPORT) THREE_IMPORT = await import("three");
  return THREE_IMPORT;
}

type WorldCity = {
  id: string; name: string; posX: number; posY: number; relation?: string;
};

type BarbarianCamp = {
  id: string; name: string; level: number; archetype: string; posX: number; posY: number; status: string;
};

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.4;
const PAN_THRESHOLD = 6;

export function WorldMap3D({
  cities,
  mapConfig,
  myCityId,
  barbarianCamps = [],
  movements = [],
  seasonState,
  terrainMask,
  onSelectCityId,
  onSelectCamp,
}: {
  cities: WorldCity[];
  mapConfig: WorldMapConfig | null;
  myCityId?: string | null;
  barbarianCamps?: BarbarianCamp[];
  movements?: WorldMovement[];
  seasonState?: any;
  terrainMask?: WorldTerrainMaskData | null;
  onSelectCityId?: (cityId: string, position: { x: number; y: number }) => void;
  onSelectCamp?: (camp: BarbarianCamp) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 900, h: 620 });
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const camState = useRef({ zoom: 0.85 });
  const pointerState = useRef<{
    startClientX: number; startClientY: number;
    startCamX: number; startCamZ: number;
    pointerId: number; hasPanned: boolean;
  } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const hasBuiltTerrain = useRef(false);

  const calculateSize = useCallback(() => {
    const b = containerRef.current?.getBoundingClientRect();
    if (!b) return { w: 900, h: 620 };
    return { w: Math.floor(b.width), h: Math.floor(b.height) };
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

      sceneRef.current = scene;
      cameraRef.current = camera;
      rendererRef.current = renderer;

      const loop = () => {
        if (destroyed) return;
        renderer.render(scene, camera);
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

    const heightData: HeightmapData = {
      cells, columns, rows,
      worldWidth: mapConfig.width,
      worldHeight: mapConfig.height,
    };

    const heights = generateHeightmap(heightData);
    const colors = generateColorArray(heightData);
    const chunkSize = 12;

    const chunksX = Math.ceil(columns / chunkSize);
    const chunksZ = Math.ceil(rows / chunkSize);

    for (let cx = 0; cx < chunksX; cx++) {
      for (let cz = 0; cz < chunksZ; cz++) {
        const mesh = buildTerrainChunk(cx, cz, chunkSize, columns, rows, mapConfig.width, mapConfig.height, heights, colors);
        if (mesh) scene.add(mesh);
      }
    }

    hasBuiltTerrain.current = true;
  }, [loaded, mapConfig, terrainMask]);

  useEffect(() => {
    if (!loaded) return;
    rendererRef.current?.setSize(size.w, size.h);
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
      startCamX: cam?.position.x ?? 0,
      startCamZ: cam?.position.z ?? 0,
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
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      style={{ touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    />
  );
}
