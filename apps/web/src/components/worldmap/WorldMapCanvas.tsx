"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { WorldMapConfig } from "@/hooks/useCity";

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
}: {
  cities: WorldCity[];
  mapConfig: WorldMapConfig | null;
  myCityId?: string | null;
  onSelectCityId?: (cityId: string, position: { x: number; y: number }) => void;
  onCenterMyCity?: () => void;
  barbarianCamps?: BarbarianCamp[];
  onSelectCamp?: (camp: BarbarianCamp, position: { x: number; y: number }) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);
  const propsRef = useRef({ cities, mapConfig, myCityId, onSelectCityId, onCenterMyCity, barbarianCamps, onSelectCamp });
  const [canvasSize, setCanvasSize] = useState({ width: 900, height: 620 });

  propsRef.current = { cities, mapConfig, myCityId, onSelectCityId, onCenterMyCity, barbarianCamps, onSelectCamp };

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
      // Dynamic import so Phaser never evaluates during SSR (window undefined).
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
        });
      };

      trySync();
      const timers = [60, 140, 260].map((ms) => setTimeout(trySync, ms));

      const onSelected = (cityId: string, position?: { x: number; y: number }) => propsRef.current.onSelectCityId?.(cityId, position ?? { x: 0, y: 0 });
      const onCampSelected = (camp: any, position?: { x: number; y: number }) => propsRef.current.onSelectCamp?.(camp, position ?? { x: 0, y: 0 });
      const events = gameRef.current.events;
      events.on("worldmap:selectCity", onSelected);
      events.on("worldmap:selectCamp", onCampSelected);

      // store cleanup on ref for the outer effect cleanup
      (gameRef.current as any).__cleanup = () => {
        timers.forEach(clearTimeout);
        events.off("worldmap:selectCity", onSelected);
        events.off("worldmap:selectCamp", onCampSelected);
        gameRef.current?.destroy(true);
        gameRef.current = null;
      };
    })();

    return () => {
      destroyed = true;
      gameRef.current?.__cleanup?.();
    };
  }, [canvasSize.height, canvasSize.width]);

  // Resize the Phaser canvas when our container size changes.
  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;
    game.scale?.resize?.(canvasSize.width, canvasSize.height);
  }, [canvasSize.height, canvasSize.width]);

  // Sync data on change.
  useEffect(() => {
    const scene = gameRef.current?.scene.getScene("WorldMapScene") as any;
    if (!scene?.isReady) return;
    scene.setWorldData({ mapConfig, cities, myCityId: myCityId ?? null, barbarianCamps });
  }, [cities, mapConfig, myCityId, barbarianCamps]);

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
        className="h-full w-full overflow-hidden rounded-lg border border-etheria-border/40 shadow-[0_28px_80px_rgba(0,0,0,.55)]"
      />
      <button
        type="button"
        onClick={centerOnMyCity}
        className="absolute right-3 top-3 z-10 rounded-lg border border-etheria-border bg-black/55 px-3 py-2 text-xs text-etheria-gold-soft backdrop-blur-[2px] hover:bg-black/65"
      >
        Centrar mi aldea
      </button>
    </div>
  );
}
