"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { WorldMapConfig } from "@/hooks/useCity";
import type { WorldMovement } from "@etheria/shared";
import { useI18n } from "@/i18n";
import type { WorldTerrainMaskData } from "@/lib/worldTerrainMask";
import type { TerrainKind } from "@/lib/worldTerrainMask";

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

export function WorldMapCanvas({
  cities,
  mapConfig,
  myCityId,
  onSelectCityId,
  onCenterMyCity,
  barbarianCamps,
  onSelectCamp,
  movements,
  seasonState,
  editorMode = false,
  terrainMask,
  selectedTerrain,
  brushSize,
  showTerrainOverlay,
  onTerrainChange,
}: {
  cities: WorldCity[];
  mapConfig: WorldMapConfig | null;
  myCityId?: string | null;
  onSelectCityId?: (cityId: string, position: { x: number; y: number }) => void;
  onCenterMyCity?: () => void;
  barbarianCamps?: BarbarianCamp[];
  onSelectCamp?: (camp: BarbarianCamp, position: { x: number; y: number }) => void;
  movements?: WorldMovement[];
  seasonState?: any;
  editorMode?: boolean;
  terrainMask?: WorldTerrainMaskData | null;
  selectedTerrain?: TerrainKind;
  brushSize?: number;
  showTerrainOverlay?: boolean;
  onTerrainChange?: (mask: WorldTerrainMaskData) => void;
}) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);
  const propsRef = useRef({ cities, mapConfig, myCityId, onSelectCityId, onCenterMyCity, barbarianCamps, onSelectCamp, movements, seasonState, editorMode, terrainMask, selectedTerrain, brushSize, showTerrainOverlay, onTerrainChange });
  const terrainMaskRef = useRef<WorldTerrainMaskData | null>(terrainMask ?? null);
  const [canvasSize, setCanvasSize] = useState({ width: 900, height: 620 });

  propsRef.current = { cities, mapConfig, myCityId, onSelectCityId, onCenterMyCity, barbarianCamps, onSelectCamp, movements, seasonState, editorMode, terrainMask, selectedTerrain, brushSize, showTerrainOverlay, onTerrainChange };
  terrainMaskRef.current = terrainMask ?? terrainMaskRef.current;

  const calculateSize = useCallback(() => {
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return { width: 900, height: 620 };
    return {
      width: Math.max(360, Math.floor(bounds.width)),
      height: Math.max(320, Math.floor(bounds.height)),
    };
  }, []);

  useLayoutEffect(() => {
    setCanvasSize(calculateSize());
    const observer = new ResizeObserver(() => setCanvasSize(calculateSize()));
    if (containerRef.current) observer.observe(containerRef.current);
    const onResize = () => setCanvasSize(calculateSize());
    window.addEventListener("resize", onResize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [calculateSize]);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    let destroyed = false;

    (async () => {
      const Phaser = await import("phaser");
      const { createWorldMapScene } = await import("@/game/scenes/WorldMapScene");
      if (destroyed) return;

      const WorldMapScene = createWorldMapScene(Phaser);
      const scene = new WorldMapScene();
      const config: any = {
        type: Phaser.AUTO,
        width: canvasSize.width,
        height: canvasSize.height,
        parent: containerRef.current,
        backgroundColor: "#070a0a",
        scale: {
          mode: Phaser.Scale.NONE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [scene],
        physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 }, debug: false } },
        render: {
          antialias: true,
          antialiasGL: true,
          pixelArt: false,
          roundPixels: false,
          powerPreference: "high-performance",
        },
      };

      gameRef.current = new Phaser.Game(config);

      const trySync = () => {
        const s = gameRef.current?.scene.getScene("WorldMapScene") as any;
        if (!s?.isReady) return;
        s.setWorldData({
          mapConfig: propsRef.current.mapConfig,
          cities: propsRef.current.cities as any,
          myCityId: propsRef.current.myCityId ?? null,
          barbarianCamps: propsRef.current.barbarianCamps,
          movements: propsRef.current.movements,
          seasonState: propsRef.current.seasonState,
          terrainMask: terrainMaskRef.current,
          editorMode: propsRef.current.editorMode,
          selectedTerrain: propsRef.current.selectedTerrain,
          brushSize: propsRef.current.brushSize,
          showTerrainOverlay: propsRef.current.showTerrainOverlay,
        });
      };

      trySync();
      const timers = [60, 140, 260].map((ms) => setTimeout(trySync, ms));

      const onSelected = (cityId: string, position?: { x: number; y: number }) => propsRef.current.onSelectCityId?.(cityId, position ?? { x: 0, y: 0 });
      const onCampSelected = (camp: any, position?: { x: number; y: number }) => propsRef.current.onSelectCamp?.(camp, position ?? { x: 0, y: 0 });
      const onTerrainChanged = (mask: WorldTerrainMaskData) => {
        terrainMaskRef.current = mask;
        propsRef.current.onTerrainChange?.(mask);
      };
      const events = gameRef.current.events;
      events.on("worldmap:selectCity", onSelected);
      events.on("worldmap:selectCamp", onCampSelected);
      events.on("worldmap:terrainChanged", onTerrainChanged);

      (gameRef.current as any).__cleanup = () => {
        timers.forEach(clearTimeout);
        events.off("worldmap:selectCity", onSelected);
        events.off("worldmap:selectCamp", onCampSelected);
        events.off("worldmap:terrainChanged", onTerrainChanged);
        gameRef.current?.destroy(true);
        gameRef.current = null;
      };
    })();

    return () => {
      destroyed = true;
      gameRef.current?.__cleanup?.();
    };
  }, [canvasSize.height, canvasSize.width]);

  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;
    game.scale?.resize?.(canvasSize.width, canvasSize.height);
  }, [canvasSize.height, canvasSize.width]);

  useEffect(() => {
    let cancelled = false;
    if (terrainMask) return;
    fetch("/api/editor/world-terrain", { cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((mask) => {
        if (cancelled) return;
        terrainMaskRef.current = mask;
        const scene = gameRef.current?.scene.getScene("WorldMapScene") as any;
        if (!scene?.isReady) return;
        scene.setWorldData({ mapConfig, cities, myCityId: myCityId ?? null, barbarianCamps, movements, seasonState, terrainMask: mask, editorMode, selectedTerrain, brushSize, showTerrainOverlay });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [barbarianCamps, brushSize, cities, editorMode, mapConfig, movements, myCityId, seasonState, selectedTerrain, showTerrainOverlay, terrainMask]);

  useEffect(() => {
    const scene = gameRef.current?.scene.getScene("WorldMapScene") as any;
    if (!scene?.isReady) return;
    scene.setWorldData({ 
      mapConfig, 
      cities, 
      myCityId: myCityId ?? null, 
      barbarianCamps,
      movements,
      seasonState,
      terrainMask: terrainMaskRef.current,
      editorMode,
      selectedTerrain,
      brushSize,
      showTerrainOverlay,
    });
  }, [cities, mapConfig, myCityId, barbarianCamps, movements, seasonState, editorMode, selectedTerrain, brushSize, showTerrainOverlay, terrainMask]);

  const centerOnMyCity = useCallback(() => {
    propsRef.current.onCenterMyCity?.();
    const scene = gameRef.current?.scene.getScene("WorldMapScene") as any;
    if (!scene) return;
    if (propsRef.current.myCityId) {
      scene.centerOnCity(propsRef.current.myCityId);
      return;
    }
    scene.centerOnAnyKnownCity();
  }, []);

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className={editorMode ? "h-full w-full overflow-hidden" : "h-full w-full overflow-hidden rounded-lg border border-etheria-border/40 shadow-[0_28px_80px_rgba(0,0,0,.55)]"}
      />
      {!editorMode && <button
        type="button"
        onClick={centerOnMyCity}
        className="absolute right-3 top-3 z-10 rounded-lg border border-etheria-border bg-black/55 px-3 py-2 text-xs text-etheria-gold-soft backdrop-blur-[2px] hover:bg-black/65"
      >
        {t("play.map.centerMyVillage")}
      </button>}
    </div>
  );
}
