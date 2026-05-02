import * as Phaser from "phaser";

interface SpriteSheetDef {
  key: string;
  url: string;
  frameWidth: number;
  frameHeight: number;
}

const SPRITE_SHEETS: SpriteSheetDef[] = [
  {
    key: "housing",
    url: "/assets/buildings/structures/housing.png",
    frameWidth: 400,
    frameHeight: 400,
  },
  {
    key: "fortified",
    url: "/assets/buildings/structures/fortified_structures.png",
    frameWidth: 400,
    frameHeight: 400,
  },
  {
    key: "nature",
    url: "/assets/buildings/decor/nature.png",
    frameWidth: 400,
    frameHeight: 400,
  },
  {
    key: "misc",
    url: "/assets/buildings/decor/misc.png",
    frameWidth: 400,
    frameHeight: 400,
  },
  {
    key: "paths",
    url: "/assets/buildings/paths/paths_and_places.png",
    frameWidth: 400,
    frameHeight: 400,
  },
];

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    // Load real spritesheets
    for (const sheet of SPRITE_SHEETS) {
      this.load.spritesheet(sheet.key, sheet.url, {
        frameWidth: sheet.frameWidth,
        frameHeight: sheet.frameHeight,
      });
    }

    // Load terrain as regular image
    this.load.image("grass_seamless", "/assets/buildings/terrain/grass_seamless.png");
    this.load.image("grass_patch", "/assets/buildings/terrain/grass_patch.png");
    this.load.image("TOWER", "/assets/buildings/generated/tower.png");
    this.load.image("MARKET", "/assets/buildings/generated/market.png");
    this.load.image("ALLIANCE_CENTER", "/assets/buildings/generated/alliance-center.png");
    this.load.image("LIBRARY", "/assets/buildings/generated/library.png");

    // Load resources atlas from icons/resources
    this.load.atlas(
      "resources",
      "/assets/icons/resources/spritesheet.png",
      "/assets/icons/resources/spritesheet.json"
    );

    // Track which assets failed
    this.load.on("loaderror", (file: Phaser.Loader.File) => {
      console.warn(`[BootScene] Asset failed: ${file.key}`);
    });
  }

  create() {
    this.createFallbackTextures();
    this.scene.start("GameScene");
  }

  private createFallbackTextures() {
    const graphics = this.make.graphics({ x: 0, y: 0 });

    const ensureTexture = (key: string, width: number, height: number, draw: () => void) => {
      if (!this.textures.exists(key)) {
        draw();
        graphics.generateTexture(key, width, height);
        graphics.clear();
      }
    };

    // Terrain fallback
    ensureTexture("tile", 32, 32, () => {
      graphics.fillStyle(0x1e293b);
      graphics.fillRect(0, 0, 32, 32);
      graphics.lineStyle(1, 0x334155);
      graphics.strokeRect(0, 0, 32, 32);
    });

    // Building fallbacks
    ensureTexture("TOWN_HALL", 128, 128, () => {
      graphics.fillStyle(0xfbbf24);
      graphics.fillRect(0, 0, 128, 128);
      graphics.fillStyle(0x78350f);
      graphics.fillTriangle(64, 8, 120, 56, 8, 56);
    });

    ensureTexture("GOLD_MINE", 128, 128, () => {
      graphics.fillStyle(0x854d0e);
      graphics.fillRect(16, 48, 96, 80);
      graphics.fillStyle(0xeab308);
      graphics.fillCircle(64, 40, 32);
    });

    ensureTexture("LUMBER_MILL", 128, 128, () => {
      graphics.fillStyle(0x65a30d);
      graphics.fillRect(24, 56, 80, 72);
      graphics.fillStyle(0x3f6212);
      graphics.fillTriangle(64, 8, 120, 64, 8, 64);
    });

    ensureTexture("QUARRY", 128, 128, () => {
      graphics.fillStyle(0x475569);
      graphics.fillRect(8, 32, 112, 96);
      graphics.fillStyle(0x94a3b8);
      graphics.fillCircle(44, 68, 12);
    });

    ensureTexture("FARM", 128, 128, () => {
      graphics.fillStyle(0x65a30d);
      graphics.fillRect(8, 64, 112, 64);
      graphics.fillStyle(0x713f12);
      graphics.fillRect(40, 16, 48, 56);
    });

    ensureTexture("BARRACKS", 192, 128, () => {
      graphics.fillStyle(0x991b1b);
      graphics.fillRect(8, 8, 176, 112);
      graphics.fillStyle(0xfca5a5);
      graphics.fillRect(40, 40, 40, 48);
      graphics.fillRect(112, 40, 40, 48);
    });

    ensureTexture("STABLE", 192, 128, () => {
      graphics.fillStyle(0x92400e);
      graphics.fillRect(8, 32, 176, 96);
      graphics.fillStyle(0xfcd34d);
      graphics.fillRect(32, 8, 128, 32);
    });

    ensureTexture("ALLIANCE_CENTER", 128, 128, () => {
      graphics.fillStyle(0x1e40af);
      graphics.fillRect(8, 32, 112, 96);
      graphics.fillStyle(0xfbbf24);
      graphics.fillCircle(64, 64, 24);
    });

    ensureTexture("LIBRARY", 128, 128, () => {
      graphics.fillStyle(0x7c2d12);
      graphics.fillRect(8, 16, 112, 112);
      graphics.fillStyle(0xfef3c7);
      graphics.fillRect(24, 32, 80, 72);
    });

    ensureTexture("STORAGE", 128, 128, () => {
      graphics.fillStyle(0x713f12);
      graphics.fillRect(16, 32, 96, 96);
      graphics.fillStyle(0xfcd34d);
      graphics.fillRect(32, 80, 32, 32);
    });

    ensureTexture("TOWER", 64, 128, () => {
      graphics.fillStyle(0x475569);
      graphics.fillRect(18, 28, 28, 100);
      graphics.fillStyle(0x64748b);
      graphics.fillRect(10, 48, 44, 18);
      graphics.fillStyle(0x94a3b8);
      graphics.fillRect(14, 18, 36, 18);
      graphics.fillStyle(0xef4444);
      graphics.fillTriangle(32, 2, 48, 20, 16, 20);
    });

    ensureTexture("MARKET", 192, 128, () => {
      graphics.fillStyle(0x7e22ce);
      graphics.fillRect(8, 56, 176, 72);
      graphics.fillStyle(0xf0abfc);
      graphics.fillRect(56, 16, 80, 56);
    });

    // UI fallbacks
    ensureTexture("highlight", 64, 64, () => {
      graphics.fillStyle(0x38bdf8, 0.3);
      graphics.fillRect(0, 0, 64, 64);
      graphics.lineStyle(2, 0x38bdf8);
      graphics.strokeRect(0, 0, 64, 64);
    });

    ensureTexture("selection", 64, 64, () => {
      graphics.lineStyle(2, 0xfbbf24);
      graphics.strokeRect(2, 2, 60, 60);
    });

    ensureTexture("scaffold", 128, 128, () => {
      graphics.fillStyle(0x475569, 0.8);
      graphics.fillRect(0, 0, 128, 128);
      graphics.lineStyle(2, 0x94a3b8);
      graphics.strokeRect(4, 4, 120, 120);
      graphics.lineStyle(3, 0x64748b);
      graphics.lineBetween(4, 4, 124, 124);
      graphics.lineBetween(124, 4, 4, 124);
    });

    graphics.destroy();
  }
}
