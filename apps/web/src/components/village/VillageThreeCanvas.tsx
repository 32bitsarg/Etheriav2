"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { BuildingType } from "@etheria/shared";
import { createIsometricCamera, updateIsoCameraZoom } from "@/lib/three/IsometricCamera";
import { createScene, createGround, tileToWorld } from "@/lib/three/SceneHelpers";
import { getBuildingMesh } from "@/lib/three/VoxelBuildingGenerator";
import type { VillageLayoutData } from "@/lib/villageLayout";

let THREE_IMPORT: typeof import("three") | null = null;
async function getTHREE() {
  if (!THREE_IMPORT) THREE_IMPORT = await import("three");
  return THREE_IMPORT;
}

type StageBuilding = {
  id: string;
  type: BuildingType;
  level: number;
  positionX: number;
  positionY: number;
  displayName?: string;
};

const ISO_MAP_SIZE = 24;
const ZOOM_MIN = 0.72;
const ZOOM_MAX = 2.4;
const PAN_THRESHOLD = 6;

export function VillageThreeCanvas({
  layout,
  buildings,
  selectedBuildingId,
  onSelectBuilding,
  interactionsDisabled = false,
}: {
  layout: VillageLayoutData;
  buildings: StageBuilding[];
  selectedBuildingId?: string | null;
  onSelectBuilding?: (id: string) => void;
  interactionsDisabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 900, h: 620 });
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const buildingObjs = useRef(new Map<string, any>());
  const camState = useRef({ x: 0, y: 0, zoom: 1 });
  const pointerState = useRef<{
    startClientX: number; startClientY: number;
    startCamX: number; startCamY: number;
    pointerId: number; hasPanned: boolean;
  } | null>(null);
  const raycasterRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);

  const calculateSize = useCallback(() => {
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return { w: 900, h: 620 };
    return { w: Math.floor(bounds.width), h: Math.floor(bounds.height) };
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
      const camera = createIsometricCamera(aspect);
      const scene = createScene();
      const ground = createGround(ISO_MAP_SIZE);
      scene.add(ground);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(size.w, size.h);
      renderer.setClearColor("#0a110e");
      renderer.shadowMap.enabled = true;
      containerRef.current!.appendChild(renderer.domElement);

      sceneRef.current = scene;
      cameraRef.current = camera;
      rendererRef.current = renderer;
      raycasterRef.current = new THREE.Raycaster();

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
    if (!loaded || !sceneRef.current) return;
    rendererRef.current?.setSize(size.w, size.h);
    if (cameraRef.current) {
      const aspect = size.w / Math.max(1, size.h);
      updateIsoCameraZoom(cameraRef.current, aspect, camState.current.zoom);
    }
  }, [size, loaded]);

  useEffect(() => {
    if (!loaded || !sceneRef.current) return;
    const scene = sceneRef.current;

    for (const [id, obj] of buildingObjs.current.entries()) {
      scene.remove(obj);
      buildingObjs.current.delete(id);
    }

    for (const building of buildings) {
      const w = tileToWorld(building.positionX, building.positionY, ISO_MAP_SIZE);
      const mesh = getBuildingMesh(building.type, building.level);
      mesh.position.set(w.x, 0, w.z);
      mesh.userData = { id: building.id, type: building.type };
      scene.add(mesh);
      buildingObjs.current.set(building.id, mesh);
    }
  }, [buildings, loaded]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType !== "touch") return;
    pointerState.current = {
      startClientX: e.clientX, startClientY: e.clientY,
      startCamX: camState.current.x, startCamY: camState.current.y,
      pointerId: e.pointerId, hasPanned: false,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
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
      const s = 0.008 / camState.current.zoom;
      cam.position.x = ps.startCamX - dx * s * (cam.position.x > 0 ? 1 : -1);
      cam.position.z = ps.startCamY + dy * s;
    }
  }, []);

  const onPointerUp = useCallback(async (e: React.PointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    if (pointerState.current?.hasPanned) { pointerState.current = null; return; }
    pointerState.current = null;

    if (interactionsDisabled || !onSelectBuilding) return;

    const THREE = await getTHREE();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !cameraRef.current || !raycasterRef.current || !sceneRef.current) return;

    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    raycasterRef.current.setFromCamera(mouse, cameraRef.current);
    const targets = buildingObjs.current;
    const hits = raycasterRef.current.intersectObjects(
      Array.from(targets.values()).filter((o: any) => o.isMesh || o.isInstancedMesh)
    );

    if (hits.length > 0) {
      let obj = hits[0].object;
      while (obj && !obj.userData?.id) obj = obj.parent;
      if (obj?.userData?.id) onSelectBuilding(obj.userData.id);
    }
  }, [interactionsDisabled, onSelectBuilding]);

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.06 : 0.94;
    const z = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, camState.current.zoom * factor));
    camState.current.zoom = z;
    if (cameraRef.current) {
      const aspect = size.w / Math.max(1, size.h);
      updateIsoCameraZoom(cameraRef.current, aspect, z);
    }
  }, [size]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-[#0a110e]"
      style={{ touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    />
  );
}
