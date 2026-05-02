import * as Phaser from "phaser";
import { useGameStore } from "@/stores/gameStore";
import { BUILDING_SIZES, BUILDING_ATLAS_MAP } from "@/lib/constants";
import type { BarbarianCampMapItem } from "@etheria/shared";

const TILE_SIZE = 32;
const MAP_SIZE = 24;
const WORLD_W = MAP_SIZE * TILE_SIZE;
const WORLD_H = MAP_SIZE * TILE_SIZE;

const ARCHETYPE_TINTS: Record<string, number> = {
  RAIDERS: 0xd75f43,
  HUNTERS: 0x49f0c5,
  MARAUDERS: 0xff6b35,
  WARHOST: 0x9b59b6,
  NOMADS: 0xf39c12,
};

export class GameScene extends Phaser.Scene {
  private buildingsGroup!: Phaser.GameObjects.Group;
  private highlightRect!: Phaser.GameObjects.Rectangle;
  private selectionRect!: Phaser.GameObjects.Rectangle;
  private constructionSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private levelBadges: Phaser.GameObjects.Text[] = [];
  private barbarianSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  isReady = false;
  private cameraDragging = false;
  private dragStart = { x: 0, y: 0 };
  private cameraStart = { x: 0, y: 0 };
  private worldContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: "GameScene" });
  }

  create() {
    const camera = this.cameras.main;

    // Create a container for the world
    this.worldContainer = this.add.container(0, 0);

    // Camera setup with pan and zoom
    camera.setBounds(0, 0, WORLD_W, WORLD_H);
    camera.setZoom(1);

    // Mouse wheel zoom
    this.input.on("wheel", (pointer: Phaser.Input.Pointer, gameObjects: any, deltaX: number, deltaY: number) => {
      const zoomDelta = deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Phaser.Math.Clamp(camera.zoom * zoomDelta, 0.5, 3);
      camera.zoomTo(newZoom, 200);
    });

    // Right-click or middle-click drag for panning
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 2 || pointer.button === 1) {
        this.cameraDragging = true;
        this.dragStart = { x: pointer.x, y: pointer.y };
        this.cameraStart = { x: camera.scrollX, y: camera.scrollY };
      }
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (this.cameraDragging) {
        const dx = (pointer.x - this.dragStart.x) / camera.zoom;
        const dy = (pointer.y - this.dragStart.y) / camera.zoom;
        camera.setScroll(
          Phaser.Math.Clamp(this.cameraStart.x - dx, 0, WORLD_W - camera.width / camera.zoom),
          Phaser.Math.Clamp(this.cameraStart.y - dy, 0, WORLD_H - camera.height / camera.zoom)
        );
        return;
      }

      // Tile highlight
      this.handlePointerMove(pointer);
    });

    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (this.cameraDragging) {
        this.cameraDragging = false;
        return;
      }

      if (pointer.button === 0) {
        this.handleTileClick(pointer);
      }
    });

    this.game.canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    // Background tiles
    const tileKey = this.textures.exists("grass_seamless") ? "grass_seamless" : "tile";
    for (let x = 0; x < MAP_SIZE; x++) {
      for (let y = 0; y < MAP_SIZE; y++) {
        const tile = this.add.image(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, tileKey);
        this.worldContainer.add(tile);
      }
    }

    // Subtle grid overlay
    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(1, 0x334155, 0.15);
    for (let x = 0; x <= MAP_SIZE; x++) {
      gridGraphics.lineBetween(x * TILE_SIZE, 0, x * TILE_SIZE, WORLD_H);
    }
    for (let y = 0; y <= MAP_SIZE; y++) {
      gridGraphics.lineBetween(0, y * TILE_SIZE, WORLD_W, y * TILE_SIZE);
    }
    this.worldContainer.add(gridGraphics);

    this.buildingsGroup = this.add.group();

    // Highlight rect
    this.highlightRect = this.add.rectangle(0, 0, TILE_SIZE, TILE_SIZE, 0x38bdf8, 0.15)
      .setVisible(false)
      .setDepth(100);
    this.highlightRect.setStrokeStyle(2, 0x38bdf8, 0.6);

    // Selection rect
    this.selectionRect = this.add.rectangle(0, 0, TILE_SIZE, TILE_SIZE, 0x000000, 0)
      .setVisible(false)
      .setDepth(100);
    this.selectionRect.setStrokeStyle(2, 0xfbbf24, 0.8);

    // Construction timer update
    this.time.addEvent({
      delay: 1000,
      callback: this.updateConstructionTimers,
      callbackScope: this,
      loop: true,
    });

    this.isReady = true;
    this.events.emit("scene-ready");
  }

  refreshBuildings(buildings: any[], queues: any[]) {
    if (!this.isReady) return;
    this.syncBuildings(buildings, queues);
  }

  syncBarbarianCamps(camps: BarbarianCampMapItem[]) {
    if (!this.isReady) return;

    // Remove camps that no longer exist
    const campIds = new Set(camps.map((c) => c.id));
    for (const [id, sprite] of this.barbarianSprites.entries()) {
      if (!campIds.has(id)) {
        sprite.destroy();
        this.barbarianSprites.delete(id);
      }
    }

    // Add or update camps
    for (const camp of camps) {
      const existing = this.barbarianSprites.get(camp.id);
      if (existing) {
        continue;
      }
      this.createCampSprite(camp);
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer) {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tileX = Math.floor(worldPoint.x / TILE_SIZE);
    const tileY = Math.floor(worldPoint.y / TILE_SIZE);

    if (tileX >= 0 && tileX < MAP_SIZE && tileY >= 0 && tileY < MAP_SIZE) {
      const store = useGameStore.getState();
      const buildingType = store.selectedBuildingType;
      const size = buildingType ? (BUILDING_SIZES[buildingType] ?? { w: 2, h: 2 }) : { w: 1, h: 1 };

      this.highlightRect
        .setPosition(
          tileX * TILE_SIZE + (size.w * TILE_SIZE) / 2,
          tileY * TILE_SIZE + (size.h * TILE_SIZE) / 2
        )
        .setSize(size.w * TILE_SIZE, size.h * TILE_SIZE)
        .setVisible(true);
    } else {
      this.highlightRect.setVisible(false);
    }
  }

  private handleTileClick(pointer: Phaser.Input.Pointer) {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tileX = Math.floor(worldPoint.x / TILE_SIZE);
    const tileY = Math.floor(worldPoint.y / TILE_SIZE);

    if (tileX < 0 || tileX >= MAP_SIZE || tileY < 0 || tileY >= MAP_SIZE) return;

    const store = useGameStore.getState();

    // Check if clicking on an existing building
    const existingBuilding = store.buildings.find(
      (b) => tileX >= b.positionX && tileX < b.positionX + (BUILDING_SIZES[b.type as keyof typeof BUILDING_SIZES]?.w ?? 1) &&
             tileY >= b.positionY && tileY < b.positionY + (BUILDING_SIZES[b.type as keyof typeof BUILDING_SIZES]?.h ?? 1)
    );

    if (existingBuilding) {
      store.setSelectedBuilding(existingBuilding);
      store.setSelectedTile({ x: tileX, y: tileY });
      store.setBuildMode(false);
      store.setSelectedBuildingType(null);
      this.showSelection(existingBuilding);
      return;
    }

    if (store.buildMode && store.selectedBuildingType) {
      store.setSelectedTile({ x: tileX, y: tileY });
    } else {
      store.setSelectedTile({ x: tileX, y: tileY });
      store.setSelectedBuilding(null);
      this.selectionRect.setVisible(false);
    }
  }

  private showSelection(building: any) {
    const size = BUILDING_SIZES[building.type as keyof typeof BUILDING_SIZES] ?? { w: 1, h: 1 };
    this.selectionRect
      .setPosition(
        building.positionX * TILE_SIZE + (size.w * TILE_SIZE) / 2,
        building.positionY * TILE_SIZE + (size.h * TILE_SIZE) / 2
      )
      .setSize(size.w * TILE_SIZE, size.h * TILE_SIZE)
      .setVisible(true);
  }

  private createCampSprite(camp: BarbarianCampMapItem) {
    const centerX = camp.posX * TILE_SIZE + TILE_SIZE / 2;
    const centerY = camp.posY * TILE_SIZE + TILE_SIZE / 2;
    const container = this.add.container(centerX, centerY).setDepth(50);

    const tint = ARCHETYPE_TINTS[camp.archetype] ?? 0xd75f43;

    const marker = this.add.circle(0, 0, 10, tint, 0.85)
      .setStrokeStyle(2, 0xffffff, 0.6)
      .setInteractive({ useHandCursor: true })
      .setName("marker");

    const label = this.add.text(0, 14, camp.name, {
      fontSize: "9px",
      color: "#e7d6a8",
      fontStyle: "bold",
      align: "center",
      backgroundColor: "rgba(5,7,7,0.65)",
      padding: { left: 4, right: 4, top: 2, bottom: 2 },
    })
      .setOrigin(0.5, 0)
      .setName("label");

    const powerBadge = this.add.text(0, -14, `Lv.${camp.level}`, {
      fontSize: "8px",
      color: "#ff6b6b",
      fontStyle: "bold",
      backgroundColor: "rgba(5,7,7,0.65)",
      padding: { left: 3, right: 3, top: 1, bottom: 1 },
    })
      .setOrigin(0.5, 1)
      .setName("power");

    // Escalation indicator: show when camp is close to leveling up
    const ageHours = this.getCampAgeHours(camp);
    const hoursUntilEscalation = this.getHoursUntilEscalation(camp);
    if (hoursUntilEscalation !== null && hoursUntilEscalation < 2 && camp.level < 10) {
      const escalationPulse = this.add.circle(0, 0, 14, 0xffaa00, 0)
        .setStrokeStyle(2, 0xffaa00, 0.8)
        .setName("escalation-pulse");

      this.tweens.add({
        targets: escalationPulse,
        alpha: 0.6,
        scale: 1.3,
        duration: 1000,
        yoyo: true,
        repeat: -1,
      });

      container.add(escalationPulse);
    }

    marker.on("pointerdown", (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      const store = useGameStore.getState();
      store.setSelectedCamp(camp);
      store.setShowCampModal(true);
    });

    container.add([marker, label, powerBadge]);
    this.barbarianSprites.set(camp.id, container);
  }

  private getCampAgeHours(camp: BarbarianCampMapItem): number | null {
    if (!camp.spawnedAt) return null;
    const spawned = new Date(camp.spawnedAt).getTime();
    const now = Date.now();
    return (now - spawned) / (1000 * 60 * 60);
  }

  private getHoursUntilEscalation(camp: BarbarianCampMapItem): number | null {
    const ageHours = this.getCampAgeHours(camp);
    if (ageHours === null) return null;
    // Escalation thresholds: every 6 hours for levels 1-3, every 12 hours for 4-6, every 24 hours for 7+
    const threshold = camp.level <= 3 ? 6 : camp.level <= 6 ? 12 : 24;
    const nextEscalationAt = threshold * (camp.level - 1);
    const hoursUntil = nextEscalationAt - ageHours;
    return hoursUntil > 0 ? hoursUntil : null;
  }

  private resolveBuildingTexture(type: string): { key: string; frame?: string } {
    const mapped = BUILDING_ATLAS_MAP[type];
    if (mapped) {
      const [sheetKey, frameIndex] = mapped;
      const texture = this.textures.get(sheetKey);
      if (texture && texture.key !== "__MISSING") {
        const frameName = `${frameIndex}`;
        if (texture.has(frameName)) {
          return { key: sheetKey, frame: frameName };
        }
      }
    }
    return { key: type };
  }

  private syncBuildings(buildings: any[], queues: any[]) {
    if (!this.buildingsGroup) return;

    // Clear existing
    this.buildingsGroup.clear(true, true);
    this.constructionSprites.forEach((sprite) => sprite.destroy());
    this.constructionSprites.clear();
    this.levelBadges.forEach((badge) => badge.destroy());
    this.levelBadges = [];

    const buildingIdsInQueue = new Set(queues.map((q) => q.buildingId));

    for (const building of buildings) {
      const size = BUILDING_SIZES[building.type as keyof typeof BUILDING_SIZES] ?? { w: 1, h: 1 };
      const areaW = size.w * TILE_SIZE;
      const areaH = size.h * TILE_SIZE;
      const centerX = building.positionX * TILE_SIZE + areaW / 2;
      const centerY = building.positionY * TILE_SIZE + areaH / 2;

      if (buildingIdsInQueue.has(building.id)) {
        this.createConstructionSprite(building, centerX, centerY, queues, size);
      } else {
        const { key, frame } = this.resolveBuildingTexture(building.type);
        const sprite = frame
          ? this.add.image(centerX, centerY, key, frame)
          : this.add.image(centerX, centerY, key);

        sprite.setScale(areaW / sprite.width, areaH / sprite.height);
        sprite.setInteractive(
          new Phaser.Geom.Rectangle(-areaW / 2, -areaH / 2, areaW, areaH),
          Phaser.Geom.Rectangle.Contains
        );

        sprite.on("pointerdown", (_pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event: Phaser.Types.Input.EventData) => {
          event.stopPropagation();
          const store = useGameStore.getState();
          store.setSelectedBuilding(building);
          store.setSelectedTile({ x: building.positionX, y: building.positionY });
          store.setBuildMode(false);
          store.setSelectedBuildingType(null);
          this.showSelection(building);
        });

        this.buildingsGroup.add(sprite);

        // Level badge
        const text = this.add.text(centerX + areaW * 0.25, centerY + areaH * 0.25, `${building.level}`, {
          fontSize: "12px",
          color: "#fbbf24",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 3,
        });
        text.setOrigin(0.5);
        this.buildingsGroup.add(text);
        this.levelBadges.push(text);
      }
    }
  }

  private createConstructionSprite(building: any, x: number, y: number, queues: any[], size: { w: number; h: number }) {
    const queue = queues.find((q) => q.buildingId === building.id);
    if (!queue) return;

    const areaW = size.w * TILE_SIZE;
    const areaH = size.h * TILE_SIZE;
    const container = this.add.container(x, y);

    // Scaffold background
    const scaffold = this.add.image(0, 0, "scaffold");
    scaffold.setScale(areaW / scaffold.width, areaH / scaffold.height);
    scaffold.setAlpha(0.7);
    container.add(scaffold);

    // Progress bar background
    const barBg = this.add.rectangle(0, areaH * 0.4, areaW * 0.8, 6, 0x1e293b);
    barBg.setStrokeStyle(1, 0x334155);
    container.add(barBg);

    // Progress bar fill
    const barFill = this.add.rectangle(-(areaW * 0.4), areaH * 0.4, 0, 6, 0xfbbf24);
    barFill.setOrigin(0, 0.5);
    container.add(barFill);

    // Time text
    const timeText = this.add.text(0, -(areaH * 0.4), "", {
      fontSize: "11px",
      color: "#fbbf24",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 3,
    });
    timeText.setOrigin(0.5);
    container.add(timeText);

    // Hit area
    const hitRect = this.add.rectangle(0, 0, areaW, areaH, 0x000000, 0).setInteractive();
    hitRect.on("pointerdown", (_pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      const store = useGameStore.getState();
      store.setSelectedBuilding(building);
      store.setSelectedTile({ x: building.positionX, y: building.positionY });
      store.setBuildMode(false);
      store.setSelectedBuildingType(null);
      this.showSelection(building);
    });
    container.add(hitRect);

    (container as any).barFill = barFill;
    (container as any).timeText = timeText;
    (container as any).queueData = queue;

    this.constructionSprites.set(building.id, container);
  }

  private updateConstructionTimers() {
    const now = new Date().getTime();

    this.constructionSprites.forEach((container) => {
      const queue = (container as any).queueData;
      const barFill = (container as any).barFill;
      const timeText = (container as any).timeText;

      if (!queue) return;

      const total = new Date(queue.completesAt).getTime() - new Date(queue.startedAt).getTime();
      const elapsed = now - new Date(queue.startedAt).getTime();
      const progress = Math.min(1, Math.max(0, elapsed / total));
      const remaining = Math.max(0, new Date(queue.completesAt).getTime() - now);
      const remainingSeconds = Math.ceil(remaining / 1000);

      const barBg = container.list[1] as Phaser.GameObjects.Rectangle;
      if (barBg) {
        barFill.width = barBg.width * progress;
      }

      const h = Math.floor(remainingSeconds / 3600);
      const m = Math.floor((remainingSeconds % 3600) / 60);
      const s = remainingSeconds % 60;
      let timeStr = "";
      if (h > 0) timeStr = `${h}h ${m}m`;
      else if (m > 0) timeStr = `${m}m ${s}s`;
      else timeStr = `${s}s`;

      timeText.setText(timeStr);
    });
  }
}
