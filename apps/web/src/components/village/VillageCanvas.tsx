"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createVillageScene } from "@/game/scenes/VillageScene";
import { normalizeVillageLayout } from "@/lib/villageLayout";
import type { VillageLayoutAnchor, VillageLayoutData } from "@/lib/villageLayout";

type StageBuilding = {
  id: string;
  type: any;
  level: number;
  positionX: number;
  positionY: number;
  ghost?: boolean;
  displayName?: string;
};

export function VillageCanvas({
  layout,
  buildings,
  selectedBuildingId,
  onSelectBuilding,
  queues,
  editorMode = false,
  onEditorViewport,
  onEditorAnchorChange,
  onEditorCameraChange,
  editorCenterVersion = 0,
  interactionsDisabled = false,
}: {
  layout: VillageLayoutData;
  buildings: StageBuilding[];
  selectedBuildingId?: string | null;
  onSelectBuilding?: (id: string) => void;
  queues: any[];
  editorMode?: boolean;
  onEditorViewport?: (viewport: { left: number; top: number; width: number; height: number; zoom: number; worldScale: number }) => void;
  onEditorAnchorChange?: (payload: { buildingId: string; tileKey: string; anchor: VillageLayoutAnchor }) => void;
  onEditorCameraChange?: (camera: { x: number; y: number; zoom: number }) => void;
  editorCenterVersion?: number;
  interactionsDisabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);
  const propsRef = useRef({ layout, buildings, selectedBuildingId, onSelectBuilding, queues });
  const [canvasSize, setCanvasSize] = useState({ width: 1536, height: 1024 });

  const normalizedLayout = normalizeVillageLayout(layout);
  propsRef.current = { layout: normalizedLayout, buildings, selectedBuildingId, onSelectBuilding, queues };

  const calculateSize = useCallback(() => {
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return { width: 1536, height: 1024 };
    return {
      width: Math.floor(bounds.width),
      height: Math.floor(bounds.height),
    };
  }, []);

  useLayoutEffect(() => {
    setCanvasSize(calculateSize());
    const observer = new ResizeObserver(() => setCanvasSize(calculateSize()));
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [calculateSize]);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    let destroyed = false;

    (async () => {
      const Phaser = await import("phaser");
      const VillageSceneClass = createVillageScene(Phaser);
      if (destroyed) return;

      const scene = new VillageSceneClass();
      const resolution = Math.min(window.devicePixelRatio || 1, 2);
      const config: any = {
        type: Phaser.AUTO,
        width: canvasSize.width,
        height: canvasSize.height,
        parent: containerRef.current,
        backgroundColor: "#101c18",
        resolution,
        scale: {
          mode: Phaser.Scale.NONE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [scene],
        render: {
          antialias: true,
          pixelArt: false,
          powerPreference: "high-performance",
        },
      };

      gameRef.current = new Phaser.Game(config);

      const trySync = () => {
        const s = gameRef.current?.scene.getScene("VillageScene") as any;
        if (!s?.isReady) return false;
        s.setVillageData({
          buildings: propsRef.current.buildings,
          selectedBuildingId: propsRef.current.selectedBuildingId,
          backgroundPath: propsRef.current.layout.backgroundAssetPath,
          referenceWidth: propsRef.current.layout.referenceWidth,
          referenceHeight: propsRef.current.layout.referenceHeight,
          anchors: propsRef.current.layout.anchors,
          queues: propsRef.current.queues,
          editorMode,
          editor: propsRef.current.layout.editor,
        });
        return true;
      };

      let attempts = 0;
      const syncUntilReady = window.setInterval(() => {
        attempts += 1;
        if (trySync() || attempts >= 40) window.clearInterval(syncUntilReady);
      }, 50);

      const onSelected = (id: string) => propsRef.current.onSelectBuilding?.(id);
      const onReady = () => trySync();
      const onViewport = (viewport: any) => onEditorViewport?.(viewport);
      const onAnchorChanged = (payload: any) => onEditorAnchorChange?.(payload);
      const onCameraChanged = (camera: any) => onEditorCameraChange?.(camera);
      gameRef.current.events.on("village:selectBuilding", onSelected);
      gameRef.current.events.on("village:ready", onReady);
      gameRef.current.events.on("village:editorViewport", onViewport);
      gameRef.current.events.on("village:anchorChanged", onAnchorChanged);
      gameRef.current.events.on("village:editorCameraChanged", onCameraChanged);

      gameRef.current.__cleanup = () => {
        window.clearInterval(syncUntilReady);
        gameRef.current.events.off("village:selectBuilding", onSelected);
        gameRef.current.events.off("village:ready", onReady);
        gameRef.current.events.off("village:editorViewport", onViewport);
        gameRef.current.events.off("village:anchorChanged", onAnchorChanged);
        gameRef.current.events.off("village:editorCameraChanged", onCameraChanged);
        gameRef.current.destroy(true);
        gameRef.current = null;
      };
    })();

    return () => {
      destroyed = true;
      gameRef.current?.__cleanup?.();
    };
  }, []);

  const syncSceneData = useCallback(() => {
    const scene = gameRef.current?.scene.getScene("VillageScene") as any;
    if (!scene?.isReady) return;
    const nextLayout = normalizeVillageLayout(propsRef.current.layout);
    scene.setVillageData({
      buildings: propsRef.current.buildings,
      selectedBuildingId: propsRef.current.selectedBuildingId,
      backgroundPath: nextLayout.backgroundAssetPath,
      referenceWidth: nextLayout.referenceWidth,
      referenceHeight: nextLayout.referenceHeight,
      anchors: nextLayout.anchors,
      queues: propsRef.current.queues,
      editorMode,
      editor: nextLayout.editor,
    });
  }, [editorMode]);

  // Sync data
  useEffect(() => {
    gameRef.current?.scale?.resize(canvasSize.width, canvasSize.height);
    syncSceneData();
  }, [canvasSize, syncSceneData]);

  // Sync data
  useEffect(() => {
    syncSceneData();
  }, [buildings, selectedBuildingId, layout, queues, editorMode, syncSceneData]);

  useEffect(() => {
    if (!editorMode || editorCenterVersion === 0) return;
    const scene = gameRef.current?.scene.getScene("VillageScene") as any;
    scene?.centerEditorCamera?.();
  }, [editorCenterVersion, editorMode]);

  useEffect(() => {
    const scene = gameRef.current?.scene.getScene("VillageScene") as any;
    if (scene?.input) scene.input.enabled = !interactionsDisabled;
  }, [interactionsDisabled]);

  return <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-[#101c18]" />;
}
