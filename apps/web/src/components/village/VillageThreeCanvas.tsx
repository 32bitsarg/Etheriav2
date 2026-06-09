"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { BuildingType } from "@etheria/shared";
import type * as THREE from "three";
import { createIsometricCamera, updateIsoCameraZoom } from "@/lib/three/IsometricCamera";
import { createScene, tileToWorld } from "@/lib/three/SceneHelpers";
import { getBuildingGroup, getBuildingWorldSize, disposeBuildingCache } from "@/lib/three/VoxelBuildingGenerator";
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
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const buildingGroups = useRef(new Map<string, THREE.Group>());
  const camState = useRef({ zoom: 1 });
  const pointerState = useRef<{
    startClientX: number; startClientY: number;
    startCamX: number; startCamZ: number;
    pointerId: number; hasPanned: boolean;
  } | null>(null);
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  const [loaded, setLoaded] = useState(false);
  const selectionRing = useRef<THREE.Mesh | null>(null);

  const calculateSize = useCallback(() => {
    const bounds = containerRef.current?.getBoundingClientRect();
    return bounds ? { w: Math.floor(bounds.width), h: Math.floor(bounds.height) } : { w: 900, h: 620 };
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
      const frustum = 5.5;
      const camera = createIsometricCamera(aspect, { frustumSize: frustum, near: 0.1, far: 200 });
      camera.position.set(5, 6, 5);
      camera.lookAt(0, 0, -2);
      const scene = createScene();
      scene.background = new THREE.Color("#1a2a20");
      // Ground plane at Y=0
      const groundGeo = new THREE.PlaneGeometry(ISO_MAP_SIZE * 0.7, ISO_MAP_SIZE * 0.7);
      const groundMat = new THREE.MeshLambertMaterial({ color: 0x1a3320 });
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.05;
      ground.receiveShadow = true;
      scene.add(ground);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(size.w, size.h);
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

    return () => {
      destroyed = true;
      disposeBuildingCache();
    };
  }, []);

  useEffect(() => {
    if (!loaded || !sceneRef.current) return;
    rendererRef.current?.setSize(size.w, size.h);
    if (cameraRef.current) updateIsoCameraZoom(cameraRef.current, size.w / Math.max(1, size.h), camState.current.zoom);
  }, [size, loaded]);

  useEffect(() => {
    if (!loaded || !sceneRef.current) return;
    const scene = sceneRef.current;

    for (const [, group] of buildingGroups.current) scene.remove(group);
    buildingGroups.current.clear();
    if (selectionRing.current) scene.remove(selectionRing.current);

    for (const building of buildings) {
      const w = tileToWorld(building.positionX, building.positionY, ISO_MAP_SIZE);
      const group = getBuildingGroup(building.type, building.level);
      group.position.set(w.x, 0, w.z);
      group.userData = { id: building.id, type: building.type, level: building.level };
      scene.add(group);

      for (const child of group.children) {
        (child as THREE.Mesh).userData = { id: building.id, type: building.type };
      }

      buildingGroups.current.set(building.id, group);
    }
  }, [buildings, loaded]);

  useEffect(() => {
    if (!loaded) return;
    if (selectionRing.current && sceneRef.current) sceneRef.current.remove(selectionRing.current);
    selectionRing.current = null;

    if (!selectedBuildingId) return;

    const group = buildingGroups.current.get(selectedBuildingId);
    if (!group || !sceneRef.current) return;

    const THREE = THREE_IMPORT;
    if (!THREE) return;

    const box = new THREE.Box3().setFromObject(group);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const size = getBuildingWorldSize(
      (group.userData?.type ?? "TOWN_HALL") as BuildingType,
      group.userData?.level ?? 1
    );
    const radius = Math.max(size.w, size.d) / 2 + 0.3;

    const ringGeo = new THREE.RingGeometry(radius - 0.05, radius + 0.05, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x2ec7c9, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(center);
    ring.position.y = 0.02;
    ring.name = "selection-ring";
    sceneRef.current.add(ring);
    selectionRing.current = ring;
  }, [selectedBuildingId, loaded]);

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
      const s = 0.015 / camState.current.zoom;
      cam.position.x = ps.startCamX - dx * s * (cam.position.x > 0 ? 1 : -1);
      cam.position.z = ps.startCamZ + dy * s * (cam.position.z > 0 ? 1 : -1);
    }
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerState.current?.hasPanned) { pointerState.current = null; return; }
    pointerState.current = null;
    if (interactionsDisabled || !onSelectBuilding || !cameraRef.current || !raycasterRef.current) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const THREE = THREE_IMPORT;
    if (!THREE) return;

    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    raycasterRef.current.setFromCamera(mouse, cameraRef.current);
    const targets: THREE.Object3D[] = [];
    for (const group of buildingGroups.current.values()) {
      for (const child of group.children) targets.push(child as THREE.Object3D);
    }

    const hits = raycasterRef.current.intersectObjects(targets, true);
    for (const hit of hits) {
      let obj: THREE.Object3D | null = hit.object;
      while (obj && !obj.userData?.id) obj = obj.parent;
      if (obj?.userData?.id) {
        onSelectBuilding(obj.userData.id);
        return;
      }
    }
  }, [interactionsDisabled, onSelectBuilding]);

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.06 : 0.94;
    camState.current.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, camState.current.zoom * factor));
    if (cameraRef.current) updateIsoCameraZoom(cameraRef.current, size.w / Math.max(1, size.h), camState.current.zoom);
  }, [size]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-[#0a110e]"
      style={{ touchAction: "none" }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove}
      onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
    />
  );
}
