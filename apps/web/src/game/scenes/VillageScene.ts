import type { BuildingType } from "@etheria/shared";
import { BUILDING_SIZES, BUILDING_IMAGE_PATHS, BUILDING_VISUAL_TIERS, getBuildingTierImagePath, getBuildingVisualTier } from "@/lib/constants";
import { BUILDING_SHEET_MAP } from "@/components/village/BuildingIcon";
import { getVillageAnchorFromWorld, normalizeVillageLayout, type VillageLayoutData } from "@/lib/villageLayout";

const ISO_MAP_SIZE = 24;
const ISO_TILE_W = 36;
const ISO_TILE_H = 18;

type StageBuilding = {
  id: string;
  type: BuildingType;
  level: number;
  positionX: number;
  positionY: number;
  ghost?: boolean;
  displayName?: string;
};

type VillagePayload = {
  buildings: StageBuilding[];
  selectedBuildingId?: string | null;
  backgroundPath: string;
  referenceWidth: number;
  referenceHeight: number;
  anchors: Record<string, { x: number; y: number; scale?: number }>;
  queues: any[];
  editorMode?: boolean;
  editor?: VillageLayoutData["editor"];
};

const DEFAULT_VILLAGE_BG = "/assets/backgrounds/village-fullscreen.png";
const DEFAULT_BG_KEY = "village-bg:default";
const VILLAGE_BASE_SCALE = 1.34;
const VILLAGE_GAMEPLAY_ZOOM = 0.98;

export function createVillageScene(Phaser: typeof import("phaser")) {
  return class VillageScene extends Phaser.Scene {
    public isReady = false;
    private backgroundLayer!: Phaser.GameObjects.Container;
    private ambientLayer!: Phaser.GameObjects.Container;
    private buildingsLayer!: Phaser.GameObjects.Container;
    private uiLayer!: Phaser.GameObjects.Container;
    private ground?: Phaser.GameObjects.Image;
    private debugText?: Phaser.GameObjects.Text;
    private selectionPulse?: Phaser.GameObjects.Ellipse;
    private lastData?: VillagePayload;
    private ambientKey = "";
    private ambientCount = 0;
    private buildingSprites = new Map<string, Phaser.GameObjects.Container>();
    private selectedBuildingId: string | null = null;
    private selectionIndicator?: Phaser.GameObjects.Graphics;
    private hasWorldBounds = false;
    private worldWidth = 1536;
    private worldHeight = 1024;
    private dragStart?: { x: number; y: number; camX: number; camY: number };
    private editorDrag?: { id: string; offsetX: number; offsetY: number };
    private editorGrid?: Phaser.GameObjects.Graphics;
    private editorBounds?: Phaser.GameObjects.Graphics;

    private emitEditorViewport() {
      const zoom = this.cameras.main.zoom;
      const width = this.worldWidth * zoom;
      const height = this.worldHeight * zoom;
      this.game.events.emit("village:editorViewport", {
        left: (this.scale.width - width) / 2,
        top: (this.scale.height - height) / 2,
        width,
        height,
        zoom,
        worldWidth: this.worldWidth,
        worldHeight: this.worldHeight,
        worldScale: VILLAGE_BASE_SCALE,
      });
    }

    constructor() {
      super({ key: "VillageScene" });
    }

    preload() {
      // Load individual building images
      Object.entries(BUILDING_IMAGE_PATHS).forEach(([type, path]) => {
        this.load.image(`building:${type}`, path);
        for (const tier of BUILDING_VISUAL_TIERS) {
          this.load.image(`building:${type}:tier:${tier}`, getBuildingTierImagePath(type as BuildingType, tier));
        }
      });

      // Fallback spritesheet
      this.load.spritesheet("buildings_sheet", "/assets/buildings/structures/isometric-buildings-sheet.png", {
        frameWidth: 384,
        frameHeight: 256,
      });
    }

    create() {
      this.createProceduralTextures();
      this.backgroundLayer = this.add.container(0, 0).setDepth(0);
      this.ambientLayer = this.add.container(0, 0).setDepth(18);
      this.buildingsLayer = this.add.container(0, 0).setDepth(20);
      this.uiLayer = this.add.container(0, 0).setDepth(30);
      this.backgroundLayer.add(this.add.rectangle(0, 0, 3200, 2200, 0x244234, 0.35));
      this.selectionIndicator = this.add.graphics();
      this.uiLayer.add(this.selectionIndicator);
      this.debugText = this.add
        .text(12, 92, "VillageScene boot", {
          fontFamily: "monospace",
          fontSize: "12px",
          color: "#e8f7d0",
          backgroundColor: "rgba(0,0,0,0.45)",
          padding: { x: 8, y: 6 },
        })
        .setScrollFactor(0)
        .setDepth(1000);
      
      this.setupInput();
      this.isReady = true;
      this.game.events.emit("village:ready");
      if (this.lastData) this.setVillageData(this.lastData);
    }

    private setupInput() {
      const camera = this.cameras.main;
      this.input.on("wheel", (_p: Phaser.Input.Pointer, _go: unknown, _dx: number, dy: number) => {
        if (this.lastData?.editorMode) {
          const zoomDelta = dy > 0 ? 0.94 : 1.06;
          camera.setZoom(Phaser.Math.Clamp(camera.zoom * zoomDelta, 0.45, 1.6));
          this.emitEditorCamera();
          this.emitEditorViewport();
          return;
        }
        const zoomDelta = dy > 0 ? 0.94 : 1.06;
        camera.setZoom(Phaser.Math.Clamp(camera.zoom * zoomDelta, 0.86, 1.32));
        this.clampCamera();
      });

      this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        if (pointer.button !== 0 && pointer.button !== 1 && pointer.button !== 2) return;
        this.dragStart = { x: pointer.x, y: pointer.y, camX: camera.scrollX, camY: camera.scrollY };
      });
      this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
        if (this.lastData?.editorMode && this.editorDrag) {
          const building = this.lastData.buildings.find((item) => item.id === this.editorDrag?.id);
          const container = this.editorDrag ? this.buildingSprites.get(this.editorDrag.id) : undefined;
          if (!building || !container) return;
          let nextX = pointer.worldX - this.editorDrag.offsetX;
          let nextY = pointer.worldY - this.editorDrag.offsetY;
          if (this.lastData.editor?.snapToGrid) {
            const step = 16;
            nextX = Math.round(nextX / step) * step;
            nextY = Math.round(nextY / step) * step;
          }
          container.setPosition(nextX, nextY);
          this.emitAnchorChanged(building, container);
          return;
        }
        if (!this.dragStart || (!pointer.isDown && pointer.buttons === 0)) return;
        const dx = (pointer.x - this.dragStart.x) / camera.zoom;
        const dy = (pointer.y - this.dragStart.y) / camera.zoom;
        camera.scrollX = this.dragStart.camX - dx;
        camera.scrollY = this.dragStart.camY - dy;
        if (this.lastData?.editorMode) {
          this.emitEditorCamera();
          this.emitEditorViewport();
        } else {
          this.clampCamera();
        }
      });
      this.input.on("pointerup", () => {
        this.dragStart = undefined;
        this.editorDrag = undefined;
      });
      this.game.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
      this.scale.on(Phaser.Scale.Events.RESIZE, () => {
        if (this.lastData?.editorMode) {
          const fitZoom = Math.min(this.scale.width / this.worldWidth, this.scale.height / this.worldHeight);
          this.cameras.main.centerOn(0, 0).setZoom(fitZoom);
          this.emitEditorViewport();
          return;
        }
        this.clampCamera();
      });
    }

    private emitEditorCamera() {
      if (!this.lastData?.editorMode) return;
      const camera = this.cameras.main;
      const centerX = camera.scrollX + camera.width / camera.zoom / 2;
      const centerY = camera.scrollY + camera.height / camera.zoom / 2;
      this.game.events.emit("village:editorCameraChanged", {
        x: Number(centerX.toFixed(2)),
        y: Number(centerY.toFixed(2)),
        zoom: Number(camera.zoom.toFixed(4)),
      });
    }

    public setVillageData(data: VillagePayload) {
      this.lastData = data;
      if (!this.isReady) return;

      this.ensureBackground(data);
      this.selectedBuildingId = data.selectedBuildingId ?? null;
      this.renderBuildings(data);
      this.updateSelectionIndicator();
      this.updateDebugText(data);
    }

    public centerEditorCamera() {
      if (!this.lastData?.editorMode) return;
      this.cameras.main.centerOn(0, 0).setZoom(VILLAGE_GAMEPLAY_ZOOM);
      this.emitEditorViewport();
      this.emitEditorCamera();
    }

    private ensureBackground(data: VillagePayload) {
      const path = data.backgroundPath || DEFAULT_VILLAGE_BG;
      const key = path === DEFAULT_VILLAGE_BG ? DEFAULT_BG_KEY : `village-bg:${path}`;
      if (this.textures.exists(key)) {
        this.buildGround(key, data);
        return;
      }
      if (this.load.isLoading()) return;
      this.load.image(key, path);
      this.load.once(`filecomplete-image-${key}`, () => this.buildGround(key, data));
      this.load.once("loaderror", (file: Phaser.Loader.File) => {
        if (file.key === key) this.buildGround(DEFAULT_BG_KEY, data);
      });
      this.load.start();
    }

    private buildGround(textureKey: string, data: VillagePayload) {
      const isFirstLoad = !this.hasWorldBounds;
      if (!this.ground) {
        this.ground = this.add.image(0, 0, textureKey).setOrigin(0.5);
        this.backgroundLayer.add(this.ground);
      } else if (this.ground.texture.key !== textureKey) {
        this.ground.setTexture(textureKey);
      }
      this.ground.setPosition(0, 0);
      const source = this.ground.texture.getSourceImage() as HTMLImageElement;
      this.ground.setScale((data.referenceWidth * VILLAGE_BASE_SCALE) / source.width, (data.referenceHeight * VILLAGE_BASE_SCALE) / source.height);
      this.worldWidth = data.referenceWidth * VILLAGE_BASE_SCALE;
      this.worldHeight = data.referenceHeight * VILLAGE_BASE_SCALE;
      const marginX = Math.round(data.referenceWidth * 0.02);
      const marginY = Math.round(data.referenceHeight * 0.02);
      this.cameras.main.setBounds(
        -this.worldWidth / 2 - marginX,
        -this.worldHeight / 2 - marginY,
        this.worldWidth + marginX * 2,
        this.worldHeight + marginY * 2
      );
      if (data.editorMode) {
        if (isFirstLoad) this.cameras.main.centerOn(0, 0).setZoom(VILLAGE_GAMEPLAY_ZOOM);
        this.emitEditorViewport();
      } else if (isFirstLoad) {
        this.cameras.main.centerOn(0, 0).setZoom(VILLAGE_GAMEPLAY_ZOOM);
      }
      this.hasWorldBounds = true;
      this.refreshAmbientEffects(textureKey, data);
      if (!data.editorMode) this.clampCamera();
      this.updateDebugText(data);
      if (data.editorMode) this.renderBuildings(data);
      this.renderEditorGuides(data);
    }

    private clampCamera() {
      const camera = this.cameras.main;
      const minZoom = 0.86;
      camera.setZoom(Math.max(camera.zoom, minZoom));
      const visibleW = camera.width / camera.zoom;
      const visibleH = camera.height / camera.zoom;
      const marginX = Math.round(this.worldWidth * 0.02);
      const marginY = Math.round(this.worldHeight * 0.02);
      const minX = -this.worldWidth / 2 - marginX;
      const maxX = this.worldWidth / 2 + marginX - visibleW;
      const minY = -this.worldHeight / 2 - marginY;
      const maxY = this.worldHeight / 2 + marginY - visibleH;
      camera.scrollX = minX > maxX ? -visibleW / 2 : Phaser.Math.Clamp(camera.scrollX, minX, maxX);
      camera.scrollY = minY > maxY ? -visibleH / 2 : Phaser.Math.Clamp(camera.scrollY, minY, maxY);
    }

    private renderBuildings(data: VillagePayload) {
      const isHidden = (building: StageBuilding) => data.editorMode && !!data.editor?.buildings?.[this.tileKey(building)]?.hidden;
      const currentIds = new Set(data.buildings.filter((building) => !isHidden(building)).map(b => b.id));
      for (const [id, container] of this.buildingSprites.entries()) {
        if (!currentIds.has(id)) { container.destroy(); this.buildingSprites.delete(id); }
      }
      for (const building of data.buildings) {
        if (isHidden(building)) continue;
        this.renderBuilding(building, data);
      }
    }

    private updateDebugText(data: VillagePayload) {
      if (!this.debugText) return;
      const camera = this.cameras.main;
      const groundTexture = this.ground?.texture.key ?? "none";
      const groundSize = this.ground ? `${Math.round(this.ground.displayWidth)}x${Math.round(this.ground.displayHeight)}` : "none";
      this.debugText.setText([
        `VillageScene ready`,
        `buildings=${data.buildings.length} sprites=${this.buildingSprites.size}`,
        `ambient=${this.ambientCount} key=${this.ambientKey ? "set" : "none"}`,
        `bg=${groundTexture} ${groundSize}`,
        `world=${Math.round(this.worldWidth)}x${Math.round(this.worldHeight)} zoom=${camera.zoom.toFixed(2)}`,
        `scroll=${Math.round(camera.scrollX)},${Math.round(camera.scrollY)}`,
      ]);
    }

    private renderBuilding(building: StageBuilding, data: VillagePayload) {
      const key = this.tileKey(building);
      let anchor = data.anchors[key];
      
      if (!anchor) {
        const size = BUILDING_SIZES[building.type] ?? { w: 1, h: 1 };
        const tileX = Phaser.Math.Clamp(Math.floor(building.positionX), 0, ISO_MAP_SIZE - 1);
        const tileY = Phaser.Math.Clamp(Math.floor(building.positionY), 0, ISO_MAP_SIZE - 1);
        const centerX = (ISO_MAP_SIZE * ISO_TILE_W) / 2;
        const isoX = (tileX - tileY) * (ISO_TILE_W / 2) + centerX;
        const isoY = (tileX + tileY) * (ISO_TILE_H / 2) + 36;
        const footprintWidth = Math.max(44, (size.w + size.h) * (ISO_TILE_W / 2));
        const footprintHeight = Math.max(28, (size.w + size.h) * (ISO_TILE_H / 2));
        anchor = {
          x: (isoX - footprintWidth / 2) / data.referenceWidth,
          y: (isoY - footprintHeight / 2 - 18) / data.referenceHeight,
          scale: 1,
        };
      }

      const renderX = anchor.x * this.worldWidth - this.worldWidth / 2;
      const renderY = anchor.y * this.worldHeight - this.worldHeight / 2;

      let container = this.buildingSprites.get(building.id);
      if (!container) {
        container = this.add.container(renderX, renderY);
        this.buildingsLayer.add(container);
        this.buildingSprites.set(building.id, container);
      } else {
        container.setPosition(renderX, renderY);
      }

      container.setDepth(building.positionX + building.positionY);

      let sprite = container.getByName("sprite") as Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
      const size = BUILDING_SIZES[building.type] ?? { w: 1, h: 1 };
      
      const tier = getBuildingVisualTier(building.level);
      const tierTexture = `building:${building.type}:tier:${tier}`;
      const baseTexture = `building:${building.type}`;
      const hasTier = this.textures.exists(tierTexture);
      const hasCustom = hasTier || this.textures.exists(baseTexture);
      const editorScale = anchor.scale ?? 1;

      if (!sprite) {
        if (hasCustom) {
          sprite = this.add.image(0, 0, hasTier ? tierTexture : baseTexture).setName("sprite");
        } else {
          const frame = BUILDING_SHEET_MAP[building.type] ?? 0;
          sprite = this.add.sprite(0, 0, "buildings_sheet", frame).setName("sprite");
        }
        sprite.setOrigin(0, 0); 
        container.add(sprite);
        
        sprite.setInteractive({ useHandCursor: true });
        sprite.on("pointerdown", (pointer: Phaser.Input.Pointer, lx: number, ly: number, event: Phaser.Types.Input.EventData) => {
          if (pointer.button !== 0) return;
          event.stopPropagation();
          this.dragStart = undefined;
          this.game.events.emit("village:selectBuilding", building.id);
          this.selectedBuildingId = building.id;
          this.updateSelectionIndicator();
          if (this.lastData?.editorMode && !this.lastData.editor?.buildings?.[key]?.locked) {
            this.editorDrag = {
              id: building.id,
              offsetX: pointer.worldX - container.x,
              offsetY: pointer.worldY - container.y,
            };
          }
        });
        this.addIdleAnimation(container, building);
      } else {
        const nextTexture = hasCustom ? (hasTier ? tierTexture : baseTexture) : "buildings_sheet";
        if (hasCustom && sprite.texture.key !== nextTexture) {
            sprite.setTexture(nextTexture);
        }
      }

      // Scaling logic
      // Custom images (generated) are large and need specific scaling
      // Spritesheet frames are 384x256
      const spriteScale = ((0.72 + (size.w + size.h) * 0.08) * editorScale) * 0.72;
      let finalScale = 0.25 * spriteScale; // default for spritesheet
      
      if (hasCustom) {
        // The generated images are usually around 1024-2048px? No, let's check.
        // Actually, let's scale them relative to the 384px frame size.
        const texture = this.textures.get(`building:${building.type}`);
        const baseW = texture.getSourceImage().width;
        finalScale = (96 * spriteScale) / baseW;
      }

      sprite.setScale(finalScale);
      this.applyLevelTreatment(sprite, building.level);
      
      const footprintWidth = Math.max(44, (size.w + size.h) * (ISO_TILE_W / 2));
      const footprintHeight = Math.max(28, (size.w + size.h) * (ISO_TILE_H / 2));
      
      const actualW = sprite.displayWidth;
      const actualH = sprite.displayHeight;

      sprite.setPosition(
        footprintWidth / 2 - actualW / 2,
        footprintHeight / 2 - actualH * 0.72
      );

      if (this.selectedBuildingId === building.id) sprite.setTint(0xfffbcc);
      else this.applyLevelTreatment(sprite, building.level);

      this.renderLevelGlow(container, building, footprintWidth, footprintHeight);
      this.renderConstructionState(container, building, data.queues ?? [], footprintWidth, footprintHeight);
      this.renderBuildingLabel(container, building, footprintWidth, footprintHeight);
    }

    private renderBuildingLabel(
      container: Phaser.GameObjects.Container,
      building: StageBuilding,
      footprintWidth: number,
      footprintHeight: number
    ) {
      const name = building.displayName || building.type;
      const textValue = `${name} Lv. ${building.level}`;
      const label = container.getByName("building_label") as Phaser.GameObjects.Container | null;
      if (label) {
        const text = label.getByName("building_label_text") as Phaser.GameObjects.Text;
        const bg = label.getByName("building_label_bg") as Phaser.GameObjects.Rectangle;
        text.setText(textValue);
        bg.setSize(text.width + 12, text.height + 6);
        label.setPosition(footprintWidth / 2, Math.min(-10, footprintHeight * 0.1));
        return;
      }

      const wrapper = this.add.container(footprintWidth / 2, Math.min(-10, footprintHeight * 0.1)).setName("building_label");
      const text = this.add.text(0, 0, textValue, {
        fontFamily: "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
        fontSize: "11px",
        color: "#f1ddb0",
        align: "center",
        padding: { left: 0, right: 0, top: 0, bottom: 0 },
      }).setOrigin(0.5).setName("building_label_text");
      const bg = this.add.rectangle(0, 0, text.width + 12, text.height + 6, 0x050707, 0.58)
        .setStrokeStyle(1, 0xd7a84c, 0.18)
        .setName("building_label_bg");
      wrapper.add([bg, text]);
      container.add(wrapper);
    }

    private tileKey(building: Pick<StageBuilding, "positionX" | "positionY">) {
      return `${building.positionX}:${building.positionY}`;
    }

    private emitAnchorChanged(building: StageBuilding, container: Phaser.GameObjects.Container) {
      if (!this.lastData) return;
      const layout = normalizeVillageLayout({
        version: 1,
        backgroundAssetPath: this.lastData.backgroundPath,
        referenceWidth: this.lastData.referenceWidth,
        referenceHeight: this.lastData.referenceHeight,
        anchors: this.lastData.anchors,
        editor: this.lastData.editor,
      });
      const key = this.tileKey(building);
      const previous = this.lastData.anchors[key] ?? { scale: 1 };
      const anchor = getVillageAnchorFromWorld(layout, container.x, container.y, VILLAGE_BASE_SCALE);
      const next = {
        ...previous,
        x: Number(anchor.x.toFixed(6)),
        y: Number(anchor.y.toFixed(6)),
      };
      this.lastData.anchors = { ...this.lastData.anchors, [key]: next };
      this.game.events.emit("village:anchorChanged", { buildingId: building.id, tileKey: key, anchor: next });
      this.updateSelectionIndicator();
    }

    private renderEditorGuides(data: VillagePayload) {
      if (!data.editorMode) {
        this.editorGrid?.clear();
        this.editorBounds?.clear();
        return;
      }
      if (!this.editorGrid) {
        this.editorGrid = this.add.graphics();
        this.uiLayer.add(this.editorGrid);
      }
      if (!this.editorBounds) {
        this.editorBounds = this.add.graphics();
        this.uiLayer.add(this.editorBounds);
      }
      this.editorGrid.clear();
      this.editorBounds.clear();
      if (data.editor?.showGrid) {
        this.editorGrid.lineStyle(1, 0x9cf7ff, 0.12);
        const step = 64;
        for (let x = -this.worldWidth / 2; x <= this.worldWidth / 2; x += step) {
          this.editorGrid.lineBetween(x, -this.worldHeight / 2, x, this.worldHeight / 2);
        }
        for (let y = -this.worldHeight / 2; y <= this.worldHeight / 2; y += step) {
          this.editorGrid.lineBetween(-this.worldWidth / 2, y, this.worldWidth / 2, y);
        }
      }
      if (data.editor?.showSafeAreas) {
        this.editorBounds.lineStyle(2, 0xe8c87a, 0.35);
        this.editorBounds.strokeRect(-this.worldWidth / 2, -this.worldHeight / 2, this.worldWidth, this.worldHeight);
        this.editorBounds.lineStyle(1, 0xe8c87a, 0.16);
        this.editorBounds.strokeRect(-this.worldWidth * 0.34, -this.worldHeight * 0.28, this.worldWidth * 0.68, this.worldHeight * 0.56);
      }
    }

    private refreshAmbientEffects(textureKey: string, data: VillagePayload) {
      const nextKey = `${textureKey}:${data.referenceWidth}:${data.referenceHeight}`;
      if (this.ambientKey === nextKey) return;
      this.ambientLayer.removeAll(true);
      this.ambientKey = nextKey;
      this.ambientCount = 0;
      this.createWaterEffects();
      this.createWaterfallSprayEffects();
      this.createMistEffects();
      this.createDustMotes();
      this.createLeafDriftEffects();
      this.createLightPulseEffects();
      this.createCentralPathEffects();
    }

    private createProceduralTextures() {
      if (this.textures.exists("ambient_leaf")) return;

      const leaf = this.add.graphics();
      leaf.fillStyle(0xd3a84c, 1);
      leaf.fillEllipse(6, 4, 10, 5);
      leaf.lineStyle(1, 0x7a5d22, 0.7);
      leaf.lineBetween(2, 4, 10, 4);
      leaf.generateTexture("ambient_leaf", 12, 8);
      leaf.destroy();

      const dust = this.add.graphics();
      dust.fillStyle(0xf1ddb0, 1);
      dust.fillCircle(4, 4, 4);
      dust.generateTexture("ambient_dust", 8, 8);
      dust.destroy();

      const sparkle = this.add.graphics();
      sparkle.lineStyle(2, 0xc9f6ff, 0.9);
      sparkle.lineBetween(1, 5, 11, 5);
      sparkle.lineBetween(6, 1, 6, 9);
      sparkle.generateTexture("ambient_sparkle", 12, 10);
      sparkle.destroy();

      const spray = this.add.graphics();
      spray.fillStyle(0xd8fbff, 1);
      spray.fillCircle(3, 3, 3);
      spray.generateTexture("ambient_spray", 6, 6);
      spray.destroy();
    }

    private worldPoint(nx: number, ny: number) {
      return {
        x: (nx - 0.5) * this.worldWidth,
        y: (ny - 0.5) * this.worldHeight,
      };
    }

    private createWaterEffects() {
      const points = [
        [0.05, 0.18], [0.04, 0.35], [0.07, 0.78],
        [0.94, 0.16], [0.96, 0.38], [0.93, 0.78],
      ];
      for (const [index, [nx, ny]] of points.entries()) {
        for (let i = 0; i < 2; i++) {
          const p = this.worldPoint(nx + i * 0.012, ny + i * 0.035);
          const glint = this.add.image(p.x, p.y, "ambient_sparkle").setScale(4.6, 1.05).setRotation(-0.45).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD);
          this.ambientLayer.add(glint);
          this.ambientCount += 1;
          this.tweens.add({
            targets: glint,
            x: p.x + (index % 2 === 0 ? 22 : -22),
            y: p.y + 8,
            alpha: { from: 0.26, to: 0.68 },
            scaleX: { from: 3.6, to: 5.2 },
            duration: 1800 + index * 260 + i * 180,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
          });

          const ripple = this.add.ellipse(p.x - 12, p.y + 8, 52, 13, 0x8bdce8, 0.24).setRotation(-0.32);
          this.ambientLayer.add(ripple);
          this.ambientCount += 1;
          this.tweens.add({
            targets: ripple,
            x: ripple.x + (index % 2 === 0 ? 18 : -18),
            alpha: { from: 0.1, to: 0.34 },
            scaleX: { from: 0.8, to: 1.6 },
            duration: 2600 + index * 280,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
          });
        }
      }
    }

    private createWaterfallSprayEffects() {
      const points = [
        [0.05, 0.2], [0.93, 0.3], [0.1, 0.82], [0.89, 0.74],
      ];
      for (const [index, [nx, ny]] of points.entries()) {
        const p = this.worldPoint(nx, ny);
        for (let i = 0; i < 3; i++) {
          const spray = this.add.image(p.x + i * 7, p.y - i * 3, "ambient_spray").setAlpha(0.24).setBlendMode(Phaser.BlendModes.ADD);
          this.ambientLayer.add(spray);
          this.ambientCount += 1;
          this.tweens.add({
            targets: spray,
            x: spray.x + (index % 2 === 0 ? 14 : -14),
            y: spray.y - 18,
            alpha: { from: 0.08, to: 0.34 },
            scale: { from: 0.8, to: 1.9 },
            duration: 1200 + i * 180 + index * 120,
            yoyo: false,
            repeat: -1,
            ease: "Sine.easeOut",
          });
        }
      }
    }

    private createMistEffects() {
      const points = [
        [0.18, 0.08], [0.82, 0.1], [0.08, 0.62], [0.9, 0.62], [0.5, 0.92],
      ];
      for (const [index, [nx, ny]] of points.entries()) {
        const p = this.worldPoint(nx, ny);
        const mist = this.add.ellipse(p.x, p.y, 300, 72, 0xe8f1dc, 0.22);
        this.ambientLayer.add(mist);
        this.ambientCount += 1;
        this.tweens.add({
          targets: mist,
          x: p.x + (index % 2 === 0 ? 54 : -54),
          alpha: { from: 0.12, to: 0.32 },
          duration: 9000 + index * 900,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      }
    }

    private createDustMotes() {
      const points = [
        [0.45, 0.5], [0.55, 0.48], [0.38, 0.6], [0.62, 0.62],
        [0.32, 0.42], [0.68, 0.41], [0.5, 0.7], [0.5, 0.32],
        [0.42, 0.38], [0.58, 0.36], [0.48, 0.58], [0.53, 0.58],
      ];
      for (const [index, [nx, ny]] of points.entries()) {
        const p = this.worldPoint(nx, ny);
        const mote = this.add.image(p.x, p.y, "ambient_dust").setAlpha(0.5);
        this.ambientLayer.add(mote);
        this.ambientCount += 1;
        this.tweens.add({
          targets: mote,
          x: p.x + 26,
          y: p.y - 18,
          alpha: { from: 0.22, to: 0.72 },
          scale: { from: 1.1, to: 2.2 },
          duration: 2600 + index * 220,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      }
    }

    private createLeafDriftEffects() {
      const points = [
        [0.22, 0.22], [0.76, 0.22], [0.18, 0.55], [0.82, 0.55], [0.34, 0.78], [0.66, 0.78],
      ];
      for (const [index, [nx, ny]] of points.entries()) {
        const p = this.worldPoint(nx, ny);
        const leaf = this.add.image(p.x, p.y, "ambient_leaf").setAlpha(0.72).setRotation(index * 0.7);
        this.ambientLayer.add(leaf);
        this.ambientCount += 1;
        this.tweens.add({
          targets: leaf,
          x: p.x + (index % 2 === 0 ? 58 : -58),
          y: p.y + 26,
          rotation: leaf.rotation + (index % 2 === 0 ? 1.2 : -1.2),
          alpha: { from: 0.34, to: 0.82 },
          duration: 6200 + index * 520,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      }
    }

    private createLightPulseEffects() {
      const points = [
        [0.5, 0.5], [0.39, 0.46], [0.61, 0.46], [0.43, 0.68], [0.57, 0.68],
      ];
      for (const [index, [nx, ny]] of points.entries()) {
        const p = this.worldPoint(nx, ny);
        const light = this.add.circle(p.x, p.y, 34, 0xffd78a, 0.2).setBlendMode(Phaser.BlendModes.ADD);
        this.ambientLayer.add(light);
        this.ambientCount += 1;
        this.tweens.add({
          targets: light,
          alpha: { from: 0.12, to: 0.42 },
          scale: { from: 0.9, to: 1.75 },
          duration: 2400 + index * 360,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      }
    }

    private createCentralPathEffects() {
      const points = [
        [0.46, 0.47], [0.5, 0.5], [0.54, 0.53], [0.44, 0.56], [0.56, 0.43],
      ];
      for (const [index, [nx, ny]] of points.entries()) {
        const p = this.worldPoint(nx, ny);
        const wisp = this.add.ellipse(p.x, p.y, 76, 18, 0xf5e1b8, 0.18).setRotation(index % 2 === 0 ? 0.28 : -0.28);
        this.ambientLayer.add(wisp);
        this.ambientCount += 1;
        this.tweens.add({
          targets: wisp,
          x: p.x + (index % 2 === 0 ? 34 : -34),
          y: p.y - 16,
          alpha: { from: 0.08, to: 0.32 },
          scaleX: { from: 0.8, to: 1.45 },
          duration: 3600 + index * 330,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      }
    }

    private renderLevelGlow(
      container: Phaser.GameObjects.Container,
      building: StageBuilding,
      footprintWidth: number,
      footprintHeight: number
    ) {
      const existing = container.getByName("level_glow") as Phaser.GameObjects.Ellipse | null;
      if (building.level < 10) {
        existing?.destroy();
        return;
      }
      const color = building.level >= 25 ? 0xffd47a : building.level >= 20 ? 0xbce6ff : 0xdfffe8;
      const alpha = building.level >= 25 ? 0.16 : building.level >= 20 ? 0.12 : 0.08;
      const glow = existing ?? this.add.ellipse(0, 0, footprintWidth * 1.35, footprintHeight * 1.1, color, alpha).setName("level_glow");
      if (!existing) {
        container.addAt(glow, 0);
        this.tweens.add({
          targets: glow,
          alpha: { from: alpha * 0.45, to: alpha },
          scale: { from: 0.9, to: 1.12 },
          duration: 2200,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      }
      glow.setFillStyle(color, alpha);
      glow.setPosition(footprintWidth / 2, footprintHeight / 2);
      glow.setSize(footprintWidth * 1.35, footprintHeight * 1.1);
    }

    private addIdleAnimation(container: Phaser.GameObjects.Container, building: StageBuilding) {
      const delay = (building.positionX * 137 + building.positionY * 97) % 900;
      const glint = this.add.circle(0, 0, 2.5, this.getBuildingAccent(building.type), 0).setName("idle_glint");
      container.add(glint);
      this.tweens.add({
        targets: glint,
        alpha: { from: 0.08, to: 0.5 },
        scale: { from: 0.6, to: 1.6 },
        duration: 1300 + delay,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    private applyLevelTreatment(sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite, level: number) {
      sprite.clearTint();
      if (level >= 25) sprite.setTint(0xfff1b8);
      else if (level >= 20) sprite.setTint(0xe7f2ff);
      else if (level >= 15) sprite.setTint(0xdfffe8);
      else if (level >= 10) sprite.setTint(0xf4e2c2);
      else if (level >= 5) sprite.setTint(0xffffff);
    }

    private renderConstructionState(
      container: Phaser.GameObjects.Container,
      building: StageBuilding,
      queues: any[],
      footprintWidth: number,
      footprintHeight: number
    ) {
      const activeQueue = queues.find((queue) => queue.buildingId === building.id);
      const existing = container.getByName("construction_overlay") as Phaser.GameObjects.Container | null;
      if (!activeQueue) {
        existing?.destroy(true);
        return;
      }
      if (existing) return;

      const overlay = this.add.container(footprintWidth / 2, footprintHeight / 2 - 24).setName("construction_overlay");
      const scaffold = this.add.rectangle(0, 0, footprintWidth * 0.8, 24, 0xd7a84c, 0.16)
        .setStrokeStyle(1, 0xf2d48a, 0.42);
      const shimmer = this.add.rectangle(-footprintWidth * 0.24, 0, footprintWidth * 0.18, 26, 0xffefb0, 0.18)
        .setName("construction_shimmer")
        .setBlendMode(Phaser.BlendModes.ADD);
      const dustA = this.add.circle(-footprintWidth * 0.28, 6, 3, 0xe6d1a3, 0.36);
      const dustB = this.add.circle(footprintWidth * 0.24, -2, 2.5, 0xe6d1a3, 0.24);
      const spark = this.add.image(footprintWidth * 0.18, -8, "ambient_sparkle").setScale(1.1).setAlpha(0.24).setBlendMode(Phaser.BlendModes.ADD);
      overlay.add([scaffold, shimmer, dustA, dustB, spark]);
      container.add(overlay);

      this.tweens.add({
        targets: [dustA, dustB],
        y: "-=12",
        alpha: { from: 0.42, to: 0 },
        scale: { from: 0.8, to: 1.9 },
        duration: 900,
        yoyo: false,
        repeat: -1,
        ease: "Sine.easeOut",
      });
      this.tweens.add({
        targets: shimmer,
        x: footprintWidth * 0.24,
        alpha: { from: 0.05, to: 0.22 },
        duration: 1450,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      this.tweens.add({
        targets: spark,
        alpha: { from: 0.08, to: 0.46 },
        scale: { from: 0.7, to: 1.45 },
        rotation: "+=0.6",
        duration: 780,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    private getBuildingAccent(type: BuildingType) {
      if (type === "GOLD_MINE" || type === "MARKET") return 0xd7a84c;
      if (type === "LUMBER_MILL" || type === "FARM") return 0x7ed957;
      if (type === "BARRACKS" || type === "STABLE" || type === "TOWER") return 0xd75f43;
      return 0x2ec7c9;
    }

    private updateSelectionIndicator() {
      this.selectionIndicator?.clear();
      if (!this.selectedBuildingId) {
        this.selectionPulse?.setVisible(false);
        return;
      }
      const container = this.buildingSprites.get(this.selectedBuildingId);
      if (!container) {
        this.selectionPulse?.setVisible(false);
        return;
      }
      this.selectionIndicator!.lineStyle(3, 0x2ec7c9, 0.6);
      this.selectionIndicator!.strokeCircle(container.x + 20, container.y + 10, 36);
      if (!this.selectionPulse) {
        this.selectionPulse = this.add.ellipse(container.x + 20, container.y + 10, 86, 42, 0x2ec7c9, 0.12)
          .setStrokeStyle(2, 0x9cf7ff, 0.38)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.uiLayer.add(this.selectionPulse);
        this.tweens.add({
          targets: this.selectionPulse,
          alpha: { from: 0.18, to: 0.42 },
          scale: { from: 0.92, to: 1.18 },
          duration: 1100,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      }
      this.selectionPulse.setPosition(container.x + 20, container.y + 10).setVisible(true);
    }
  };
}
