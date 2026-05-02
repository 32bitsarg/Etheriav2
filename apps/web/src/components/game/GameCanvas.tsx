"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as Phaser from "phaser";
import { GameConfig } from "@/game/config";
import { GameScene } from "@/game/scenes/GameScene";

interface GameCanvasProps {
  buildings?: any[];
  buildQueues?: any[];
}

export function GameCanvas({ buildings, buildQueues }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const propsRef = useRef({ buildings, buildQueues });
  const [canvasSize, setCanvasSize] = useState({ width: 768, height: 768 });

  // Keep ref in sync with latest props
  propsRef.current = { buildings, buildQueues };

  // Calculate canvas size based on viewport
  const calculateSize = useCallback(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const topBar = 48; // Resource bar height
    const bottomSpace = 80; // Bottom queue space
    const availableH = h - topBar - bottomSpace;
    const availableW = w - 280; // Left panel space

    // Use the smaller dimension to keep it square
    const size = Math.min(availableW, availableH, 1024);
    return { width: Math.max(size, 400), height: Math.max(size, 400) };
  }, []);

  useEffect(() => {
    setCanvasSize(calculateSize());

    const handleResize = () => {
      setCanvasSize(calculateSize());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [calculateSize]);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const config = GameConfig(containerRef.current, canvasSize.width, canvasSize.height);
    gameRef.current = new Phaser.Game(config);

    // Function to sync latest buildings to scene
    const syncBuildings = () => {
      const scene = gameRef.current?.scene.getScene("GameScene") as GameScene | undefined;
      if (scene?.isReady && typeof scene.refreshBuildings === "function") {
        scene.refreshBuildings(
          propsRef.current.buildings ?? [],
          propsRef.current.buildQueues ?? []
        );
      }
    };

    // Try multiple times: immediate, 50ms, 100ms, 250ms, and on scene-ready event
    syncBuildings();
    const timers = [50, 100, 250].map((ms) => setTimeout(syncBuildings, ms));

    // Also listen for scene-ready event
    const checkInterval = setInterval(() => {
      const scene = gameRef.current?.scene.getScene("GameScene") as GameScene | undefined;
      if (scene?.isReady) {
        syncBuildings();
        clearInterval(checkInterval);
      }
    }, 50);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(checkInterval);
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [canvasSize]);

  // Sync buildings with Phaser scene when data changes
  useEffect(() => {
    if (!gameRef.current) return;

    const scene = gameRef.current.scene.getScene("GameScene") as GameScene | undefined;
    if (scene?.isReady && typeof scene.refreshBuildings === "function") {
      scene.refreshBuildings(buildings ?? [], buildQueues ?? []);
    }
  }, [buildings, buildQueues]);

  return (
    <div
      ref={containerRef}
      id="game-container"
      className="rounded-lg overflow-hidden shadow-2xl border border-etheria-border/30"
      style={{ width: canvasSize.width, height: canvasSize.height }}
    />
  );
}
