import type { Types } from "phaser";
import { BootScene } from "./scenes/BootScene";
import { GameScene } from "./scenes/GameScene";

const TILE_SIZE = 32;
const MAP_SIZE = 24;

export function GameConfig(parent: HTMLElement, width: number = 768, height: number = 768): Types.Core.GameConfig {
  // Calculate zoom to fit the map in the canvas
  const worldW = MAP_SIZE * TILE_SIZE;
  const worldH = MAP_SIZE * TILE_SIZE;
  const scaleX = width / worldW;
  const scaleY = height / worldH;
  const zoom = Math.min(scaleX, scaleY);

  return {
    type: Phaser.AUTO,
    width,
    height,
    parent,
    backgroundColor: "#0a0e17",
    scale: {
      mode: Phaser.Scale.NONE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, GameScene],
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    pixelArt: false,
    roundPixels: false,
    render: {
      antialias: true,
    },
  };
}

export const TILE_SIZE_CONST = TILE_SIZE;
export const MAP_SIZE_CONST = MAP_SIZE;
