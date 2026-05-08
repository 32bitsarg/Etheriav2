import type { WorldMovement } from "@etheria/shared";
import { TERRAIN_COLORS, WORLD_TERRAIN_AREAS } from "@/lib/worldTerrain";
import { TERRAIN_COLOR_HEX, type TerrainKind, type WorldTerrainMaskData } from "@/lib/worldTerrainMask";

type WorldCity = {
  id: string;
  name: string;
  posX: number;
  posY: number;
  level?: number;
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

type Movement = WorldMovement;

type WorldMapConfig = {
  width: number;
  height: number;
  cameraMinZoom: number;
  cameraMaxZoom: number;
  cameraInitialZoom: number;
  backgroundAssetPath: string;
  terrainSeed: number;
  decorDensity: number;
  decorSafeRadius: number;
  terrainOverlayEnabled?: boolean;
};

type WorldMapPayload = {
  mapConfig: WorldMapConfig | null;
  cities: WorldCity[];
  myCityId?: string | null;
  barbarianCamps?: BarbarianCamp[];
  movements?: Movement[];
  seasonState?: any | null;
  terrainMask?: WorldTerrainMaskData | null;
  editorMode?: boolean;
  selectedTerrain?: TerrainKind;
  brushSize?: number;
  showTerrainOverlay?: boolean;
};

const ARCHETYPE_TINTS: Record<string, number> = {
  RAIDERS: 0xd75f43,
  HUNTERS: 0x49f0c5,
  MARAUDERS: 0xff6b35,
  WARHOST: 0x9b59b6,
  NOMADS: 0xf39c12,
};

export function createWorldMapScene(Phaser: typeof import("phaser")) {
  return class WorldMapScene extends Phaser.Scene {
    public isReady = false;

    private ground?: Phaser.GameObjects.Image;
    private citiesLayer!: Phaser.GameObjects.Container;
    private movementsLayer!: Phaser.GameObjects.Container;
    private fogLayer!: Phaser.GameObjects.RenderTexture;
    private weatherOverlay!: Phaser.GameObjects.Rectangle;
    private terrainOverlayLayer!: Phaser.GameObjects.Container;
    private maskOverlayLayer!: Phaser.GameObjects.Container;
    private dragSurface!: Phaser.GameObjects.Zone;

    private dragStart?: { x: number; y: number; camX: number; camY: number };
    private lastData?: WorldMapPayload;
    private hasCentered = false;
    private worldHalfWidth = 0;
    private worldHalfHeight = 0;

    private citySprites = new Map<string, Phaser.GameObjects.Container>();
    private campSprites = new Map<string, Phaser.GameObjects.Container>();
    private movementSprites = new Map<string, Phaser.GameObjects.Container>();
    private loadedBackgroundPath?: string;
    private backgroundFailed = false;
    private spacePanning = false;

    constructor() {
      super({ key: "WorldMapScene" });
    }

    preload() {
      this.load.image("city_marker", "/assets/ui/map-city-marker.png");
      this.load.image("player_village", "/assets/map/player-village.png");
      this.load.spritesheet("army_walk", "/assets/map/player-army-walk.png", { frameWidth: 64, frameHeight: 64 });
      this.load.spritesheet("caravan_walk", "/assets/map/merchant-caravan-walk.png", { frameWidth: 64, frameHeight: 64 });
      this.load.spritesheet("barbarian_walk", "/assets/map/barbarian-army-walk.png", { frameWidth: 64, frameHeight: 64 });
      this.load.image("barbarian_camp", "/assets/map/barbarian-camp.png");
    }

    create() {
      this.movementsLayer = this.add.container(0, 0).setDepth(10);
      this.citiesLayer = this.add.container(0, 0).setDepth(20);
      
      // Fog of War (world-space texture, resized in applyWorldBounds)
      this.fogLayer = this.add
        .renderTexture(0, 0, 1, 1)
        .setOrigin(0, 0)
        .setDepth(30)
        .setScrollFactor(1);
      
      // Weather Overlay
      this.weatherOverlay = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0xffffff, 0).setOrigin(0).setScrollFactor(0).setDepth(40);
      this.terrainOverlayLayer = this.add.container(0, 0).setDepth(5);
      this.maskOverlayLayer = this.add.container(0, 0).setDepth(6);
      
      this.dragSurface = this.add.zone(0, 0, this.scale.width, this.scale.height).setOrigin(0).setScrollFactor(0).setDepth(50);
      this.dragSurface.setInteractive();
      this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x0f1b24, 1).setOrigin(0).setScrollFactor(0).setDepth(-5);
      this.setupInput();
      this.isReady = true;
      if (this.lastData) this.setWorldData(this.lastData);
    }

    private setupInput() {
      const camera = this.cameras.main;
      this.input.setTopOnly(false);
      this.input.keyboard?.on("keydown-SPACE", () => {
        this.spacePanning = true;
      });
      this.input.keyboard?.on("keyup-SPACE", () => {
        this.spacePanning = false;
      });
      this.game.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
      this.scale.on(Phaser.Scale.Events.RESIZE, (gameSize: Phaser.Structs.Size) => {
        this.dragSurface.setSize(gameSize.width, gameSize.height);
        this.weatherOverlay.setSize(gameSize.width, gameSize.height);
      });

      this.input.on("wheel", (_p: Phaser.Input.Pointer, _go: unknown, _dx: number, dy: number) => {
        const limits = this.lastData?.mapConfig;
        const minZoom = limits?.cameraMinZoom ?? 0.7;
        const maxZoom = limits?.cameraMaxZoom ?? 1.8;
        const zoomDelta = dy > 0 ? 0.9 : 1.1;
        const targetZoom = Phaser.Math.Clamp(camera.zoom * zoomDelta, minZoom, maxZoom);
        const pointer = this.input.activePointer;
        const before = camera.getWorldPoint(pointer.x, pointer.y);
        camera.setZoom(targetZoom);
        const after = camera.getWorldPoint(pointer.x, pointer.y);
        camera.scrollX += before.x - after.x;
        camera.scrollY += before.y - after.y;
        this.clampCamera();
      });

      this.dragSurface.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        if (this.lastData?.editorMode && !this.shouldPanEditor(pointer)) {
          this.paintTerrain(pointer);
          return;
        }
        this.dragStart = { x: pointer.x, y: pointer.y, camX: camera.scrollX, camY: camera.scrollY };
      });

      this.input.on("pointerup", () => {
        this.dragStart = undefined;
      });

      this.dragSurface.on("pointermove", (pointer: Phaser.Input.Pointer) => {
        if (this.lastData?.editorMode && !this.shouldPanEditor(pointer) && (pointer.buttons & 1) === 1) {
          this.paintTerrain(pointer);
          return;
        }
        if (!this.dragStart || (!pointer.isDown && pointer.buttons !== 1)) return;
        const dx = pointer.x - this.dragStart.x;
        const dy = pointer.y - this.dragStart.y;
        camera.scrollX = this.dragStart.camX - dx / camera.zoom;
        camera.scrollY = this.dragStart.camY - dy / camera.zoom;
        this.clampCamera();
      });
    }

    private shouldPanEditor(pointer: Phaser.Input.Pointer) {
      if (!this.lastData?.editorMode) return false;
      return pointer.button === 1 || pointer.button === 2 || (pointer.buttons & 2) === 2 || this.spacePanning;
    }

    private fogGraphics?: Phaser.GameObjects.Graphics;

    update() {
      if (!this.isReady || !this.lastData) return;
      this.renderMovements(this.getNormalizedMovements(this.lastData.movements ?? []));
      this.updateFogOfWar(this.lastData.myCityId);
    }

    public setWorldData(data: WorldMapPayload) {
      this.lastData = data;
      if (!this.isReady) return;
      if (!data.mapConfig) {
        this.weatherOverlay.setFillStyle(0xffffff, 0);
        return;
      }

      this.ensureBackground(data.mapConfig);
      this.applyWorldBounds(data.mapConfig);
      this.renderTerrainOverlay(data.mapConfig);
      this.renderMaskOverlay(data.mapConfig, data.terrainMask ?? null);
      this.renderCities(this.getNormalizedCities(data.cities), data.myCityId ?? null);
      this.renderBarbarianCamps(this.getNormalizedCamps(data.barbarianCamps ?? []));
      this.applyWeather(data.seasonState);

      if (!this.hasCentered) {
        const myId = data.myCityId ?? null;
        if (myId && this.citySprites.has(myId)) {
          this.centerOnCity(myId);
        } else if (data.cities[0]) {
          const fallback = this.normalizePoint(data.cities[0].posX, data.cities[0].posY);
          this.cameras.main.centerOn(fallback.x, fallback.y);
          this.cameras.main.setZoom(data.mapConfig.cameraInitialZoom);
        }
        this.clampCamera();
        this.hasCentered = true;
      }
    }

    private updateFogOfWar(myCityId?: string | null) {
      if (!this.fogLayer) return;
      
      this.fogLayer.clear();
      const normalizedCities = this.getNormalizedCities(this.lastData?.cities ?? []);
      const myCity = myCityId ? normalizedCities.find(c => c.id === myCityId) : null;
      const hasCities = (this.lastData?.cities.length ?? 0) > 0;
      const fogAlpha = myCity ? 0.45 : hasCities ? 0.24 : 0.14;
      this.fogLayer.fill(0x020408, fogAlpha);
      
      if (myCity) {
        const radius = 360;
        
        if (!this.fogGraphics) {
          this.fogGraphics = this.add.graphics({ x: 0, y: 0 }).setVisible(false);
        }
        
        this.fogGraphics.clear();
        this.fogGraphics.fillStyle(0xffffff, 1);
        this.fogGraphics.fillCircle(0, 0, radius);
        
        // Use erase to cut a hole in the fog
        this.fogLayer.erase(this.fogGraphics, myCity.posX, myCity.posY);
      } else {
        const radius = 260;
        if (!this.fogGraphics) {
          this.fogGraphics = this.add.graphics({ x: 0, y: 0 }).setVisible(false);
        }
        this.fogGraphics.clear();
        this.fogGraphics.fillStyle(0xffffff, 1);
        this.fogGraphics.fillCircle(0, 0, radius);
        this.fogLayer.erase(this.fogGraphics, this.cameras.main.midPoint.x, this.cameras.main.midPoint.y);
      }
    }

    private applyWeather(seasonState: any) {
      if (!seasonState) return;
      const season = seasonState.currentSeason;
      const intensity = seasonState.intensity ?? 1;
      
      if (season === "WINTER") {
        this.weatherOverlay.setFillStyle(0xffffff, 0.22 * intensity);
        this.ground?.setTint(0xbbccff);
      } else if (season === "AUTUMN") {
        this.weatherOverlay.setFillStyle(0xffaa66, 0.12 * intensity);
        this.ground?.setTint(0xffeedd);
      } else if (season === "SUMMER") {
        this.weatherOverlay.setFillStyle(0xfff0aa, 0.08 * intensity);
        this.ground?.setTint(0xffffff);
      } else {
        this.weatherOverlay.setFillStyle(0xffffff, 0);
        this.ground?.setTint(0xe0ffe0);
      }
    }

    private normalizePoint(x: number, y: number) {
      const cfg = this.lastData?.mapConfig;
      if (!cfg) return { x, y };
      const halfW = Math.floor(cfg.width / 2);
      const halfH = Math.floor(cfg.height / 2);
      const needsXShift = x > halfW || x < -halfW;
      const needsYShift = y > halfH || y < -halfH;
      return {
        x: needsXShift ? x - halfW : x,
        y: needsYShift ? y - halfH : y,
      };
    }

    private getNormalizedCities(cities: WorldCity[]) {
      return cities.map((city) => {
        const p = this.normalizePoint(city.posX, city.posY);
        return { ...city, posX: p.x, posY: p.y };
      });
    }

    private getNormalizedCamps(camps: BarbarianCamp[]) {
      return camps.map((camp) => {
        const p = this.normalizePoint(camp.posX, camp.posY);
        return { ...camp, posX: p.x, posY: p.y };
      });
    }

    private getNormalizedMovements(movements: Movement[]) {
      return movements.map((m) => {
        const from = this.normalizePoint(m.from.x, m.from.y);
        const to = this.normalizePoint(m.to.x, m.to.y);
        return {
          ...m,
          from: { ...m.from, x: from.x, y: from.y },
          to: { ...m.to, x: to.x, y: to.y },
        };
      });
    }

    private resolveMaskRoute(from: { x: number; y: number }, to: { x: number; y: number }) {
      const mask = this.lastData?.terrainMask;
      const config = this.lastData?.mapConfig;
      if (!mask || !config) return [from, to];
      const blocked = new Set(["MOUNTAIN", "WATER"]);
      const toCell = (point: { x: number; y: number }) => {
        const nx = (point.x + config.width / 2) / config.width;
        const ny = (point.y + config.height / 2) / config.height;
        return {
          col: Phaser.Math.Clamp(Math.floor(nx * mask.columns), 0, mask.columns - 1),
          row: Phaser.Math.Clamp(Math.floor(ny * mask.rows), 0, mask.rows - 1),
        };
      };
      const center = (col: number, row: number) => ({
        x: -config.width / 2 + (col + 0.5) * (config.width / mask.columns),
        y: -config.height / 2 + (row + 0.5) * (config.height / mask.rows),
      });
      const isWalkable = (col: number, row: number) => !blocked.has(mask.cells[row * mask.columns + col] ?? "PLAINS");
      const nearest = (cell: { col: number; row: number }) => {
        for (let radius = 0; radius < Math.max(mask.columns, mask.rows); radius++) {
          for (let row = cell.row - radius; row <= cell.row + radius; row++) {
            for (let col = cell.col - radius; col <= cell.col + radius; col++) {
              if (col < 0 || row < 0 || col >= mask.columns || row >= mask.rows) continue;
              if (Math.abs(col - cell.col) !== radius && Math.abs(row - cell.row) !== radius) continue;
              if (isWalkable(col, row)) return { col, row };
            }
          }
        }
        return null;
      };

      const start = nearest(toCell(from));
      const end = nearest(toCell(to));
      if (!start || !end) return [from, to];

      const key = (col: number, row: number) => row * mask.columns + col;
      const open = new Set<number>([key(start.col, start.row)]);
      const cameFrom = new Map<number, number>();
      const gScore = new Map<number, number>([[key(start.col, start.row), 0]]);
      const fScore = new Map<number, number>([[key(start.col, start.row), Math.hypot(end.col - start.col, end.row - start.row)]]);
      const neighbors = [[-1, 0, 1], [1, 0, 1], [0, -1, 1], [0, 1, 1], [-1, -1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [1, 1, Math.SQRT2]] as const;
      const targetKey = key(end.col, end.row);

      for (let guard = 0; guard < mask.columns * mask.rows && open.size > 0; guard++) {
        let current = -1;
        let best = Infinity;
        for (const candidate of open) {
          const score = fScore.get(candidate) ?? Infinity;
          if (score < best) {
            best = score;
            current = candidate;
          }
        }
        if (current === targetKey) {
          const points = [to];
          let cursor = current;
          while (cameFrom.has(cursor)) {
            const col = cursor % mask.columns;
            const row = Math.floor(cursor / mask.columns);
            points.push(center(col, row));
            cursor = cameFrom.get(cursor)!;
          }
          points.push(from);
          return points.reverse();
        }
        open.delete(current);
        const col = current % mask.columns;
        const row = Math.floor(current / mask.columns);
        for (const [dx, dy, distance] of neighbors) {
          const nextCol = col + dx;
          const nextRow = row + dy;
          if (nextCol < 0 || nextRow < 0 || nextCol >= mask.columns || nextRow >= mask.rows || !isWalkable(nextCol, nextRow)) continue;
          const nextKey = key(nextCol, nextRow);
          const tentative = (gScore.get(current) ?? Infinity) + distance;
          if (tentative >= (gScore.get(nextKey) ?? Infinity)) continue;
          cameFrom.set(nextKey, current);
          gScore.set(nextKey, tentative);
          fScore.set(nextKey, tentative + Math.hypot(end.col - nextCol, end.row - nextRow));
          open.add(nextKey);
        }
      }

      return [from, to];
    }

    private cellFromWorld(point: { x: number; y: number }, config: WorldMapConfig, mask: Pick<WorldTerrainMaskData, "columns" | "rows">) {
      const nx = (point.x + config.width / 2) / config.width;
      const ny = (point.y + config.height / 2) / config.height;
      return {
        col: Phaser.Math.Clamp(Math.floor(nx * mask.columns), 0, mask.columns - 1),
        row: Phaser.Math.Clamp(Math.floor(ny * mask.rows), 0, mask.rows - 1),
      };
    }

    private paintTerrain(pointer: Phaser.Input.Pointer) {
      const data = this.lastData;
      if (!data?.editorMode || !data.mapConfig || !data.terrainMask) return;
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const cell = this.cellFromWorld(worldPoint, data.mapConfig, data.terrainMask);
      const brushSize = Math.max(0, data.brushSize ?? 1);
      const selectedTerrain = data.selectedTerrain ?? "MOUNTAIN";
      const cells = [...data.terrainMask.cells];
      for (let row = cell.row - brushSize; row <= cell.row + brushSize; row++) {
        for (let col = cell.col - brushSize; col <= cell.col + brushSize; col++) {
          if (row < 0 || col < 0 || row >= data.terrainMask.rows || col >= data.terrainMask.columns) continue;
          if (Math.hypot(col - cell.col, row - cell.row) > brushSize + 0.45) continue;
          cells[row * data.terrainMask.columns + col] = selectedTerrain;
        }
      }
      const nextMask = { ...data.terrainMask, cells };
      this.lastData = { ...data, terrainMask: nextMask };
      this.renderMaskOverlay(data.mapConfig, nextMask);
      this.game.events.emit("worldmap:terrainChanged", nextMask);
    }

    private pointAlongRoute(points: Array<{ x: number; y: number }>, progress: number) {
      if (points.length <= 1) return points[0] ?? { x: 0, y: 0 };
      const segments = points.slice(1).map((point, index) => ({
        from: points[index],
        to: point,
        length: Math.hypot(point.x - points[index].x, point.y - points[index].y),
      }));
      const total = segments.reduce((sum, segment) => sum + segment.length, 0);
      let remaining = Phaser.Math.Clamp(progress, 0, 1) * total;
      for (const segment of segments) {
        if (remaining <= segment.length) {
          const t = segment.length > 0 ? remaining / segment.length : 0;
          return {
            x: Phaser.Math.Linear(segment.from.x, segment.to.x, t),
            y: Phaser.Math.Linear(segment.from.y, segment.to.y, t),
          };
        }
        remaining -= segment.length;
      }
      return points[points.length - 1];
    }

    private renderMovements(movements: Movement[]) {
      const now = Date.now();
      const movementIds = new Set(movements.map(m => m.id));
      
      for (const [id, container] of this.movementSprites.entries()) {
        if (!movementIds.has(id)) {
          container.destroy();
          this.movementSprites.delete(id);
        }
      }

      for (const m of movements) {
        let container = this.movementSprites.get(m.id);
        if (!container) {
          container = this.add.container(0, 0).setDepth(10);
          
          const line = this.add.graphics().setName("line");
          container.add(line);
          
          const texture = m.type === "TRADE" ? "caravan_walk" : (m.type === "BARBARIAN_ATTACK" || m.type === "BARBARIAN_RAID" ? "barbarian_walk" : "army_walk");
          const hasTexture = this.textures.exists(texture);
          let icon;
          if (hasTexture) {
            const sprite = this.add.sprite(0, 0, texture, 0).setScale(0.36).setName("icon");
            const animKey = `anim:${texture}`;
            if (!this.anims.exists(animKey)) {
              this.anims.create({
                key: animKey,
                frames: this.anims.generateFrameNumbers(texture, { start: 0, end: Math.max(0, this.textures.get(texture).frameTotal - 1) }),
                frameRate: 8,
                repeat: -1,
              });
            }
            sprite.play(animKey);
            icon = sprite;
          } else {
            icon = this.add.circle(0, 0, 6, m.type === "TRADE" ? 0xffff00 : 0xff3333).setName("icon");
            container.add(this.add.circle(0, 0, 9, m.type === "TRADE" ? 0xffff00 : 0xff3333, 0.25).setName("glow"));
          }
          container.add(icon);
          
          this.movementsLayer.add(container);
          this.movementSprites.set(m.id, container);
        }

        const line = container.getByName("line") as Phaser.GameObjects.Graphics;
        const icon = container.getByName("icon") as Phaser.GameObjects.Image | Phaser.GameObjects.Arc;
        const glow = container.getByName("glow") as Phaser.GameObjects.Arc | undefined;
        
        const isReturning = m.status === "RETURNING" && !!m.returnsAt;
        const startT = isReturning
          ? new Date(m.resolvedAt ?? m.arrivesAt).getTime()
          : new Date(m.startedAt).getTime();
        const endT = isReturning
          ? new Date(m.returnsAt!).getTime()
          : new Date(m.arrivesAt).getTime();
        const duration = endT - startT;
        const elapsed = now - startT;
        const visualDuration = duration > 0 ? Math.min(duration, 8 * 60 * 1000) : duration;
        let progress = visualDuration > 0 ? Phaser.Math.Clamp(elapsed / visualDuration, 0, 1) : NaN;

        // Fallback visual animation when timeline fields are missing/invalid.
        if (!Number.isFinite(progress)) {
          const hash = [...m.id].reduce((acc, ch) => ((acc * 31) ^ ch.charCodeAt(0)) >>> 0, 0);
          const cycleMs = 45000 + (hash % 12000);
          const phase = ((now + (hash % cycleMs)) % cycleMs) / cycleMs;
          progress = 0.08 + phase * 0.84;
        }

        const origin = isReturning ? m.to : m.from;
        const destination = isReturning ? m.from : m.to;
        const route = this.resolveMaskRoute(origin, destination);
        const current = this.pointAlongRoute(route, progress);
        let currentX = current.x;
        let currentY = current.y;
        const dx = destination.x - origin.x;
        const dy = destination.y - origin.y;
        const length = Math.hypot(dx, dy);
        if (length > 1) {
          const nx = -dy / length;
          const ny = dx / length;
          const wobble = Math.sin(now / 450 + (m.id.length % 13)) * 2.4;
          currentX += nx * wobble;
          currentY += ny * wobble;
        }
        
        icon.setPosition(currentX, currentY);
        if ("setFlipX" in icon && typeof (icon as Phaser.GameObjects.Sprite).setFlipX === "function") {
          (icon as Phaser.GameObjects.Sprite).setFlipX(dx < 0);
        }
        if (glow) glow.setPosition(currentX, currentY);
        if ("setScale" in icon && typeof (icon as Phaser.GameObjects.Image).setScale === "function" && !("play" in icon)) {
          const pulse = 1 + Math.sin(now / 280) * 0.06;
          (icon as Phaser.GameObjects.Image).setScale(0.14 * pulse);
        }
        
        line.clear();
        line.lineStyle(2.5, m.type === "TRADE" ? 0xfff0aa : 0xffaaaa, 0.45);
        line.beginPath();
        const visualRoute = this.resolveMaskRoute(m.from, m.to);
        line.moveTo(visualRoute[0]?.x ?? m.from.x, visualRoute[0]?.y ?? m.from.y);
        for (const point of visualRoute.slice(1)) {
          line.lineTo(point.x, point.y);
        }
        line.strokePath();
      }
    }

    private ensureBackground(config: WorldMapConfig) {
      if (this.loadedBackgroundPath === config.backgroundAssetPath && this.ground && !this.backgroundFailed) return;

      const textureKey = `world-bg:${config.backgroundAssetPath}`;
      const buildGround = () => {
        this.backgroundFailed = false;
        this.loadedBackgroundPath = config.backgroundAssetPath;
        this.ground?.destroy();
        this.ground = this.add
          .image(0, 0, textureKey)
          .setOrigin(0.5, 0.5)
          .setDisplaySize(config.width, config.height)
          .setDepth(0);
        const texture = this.textures.get(textureKey);
        texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
      };

      if (this.textures.exists(textureKey)) {
        buildGround();
        return;
      }

      this.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => {
        this.backgroundFailed = true;
        this.loadedBackgroundPath = config.backgroundAssetPath;
        this.ground?.destroy();
        this.ground = this.add
          .rectangle(0, 0, config.width, config.height, 0x1a2d3b, 1)
          .setOrigin(0.5, 0.5)
          .setDepth(0) as unknown as Phaser.GameObjects.Image;
      });
      this.load.image(textureKey, config.backgroundAssetPath);
      this.load.once(Phaser.Loader.Events.COMPLETE, buildGround);
      this.load.start();
    }

    private applyWorldBounds(config: WorldMapConfig) {
      const halfW = Math.floor(config.width / 2);
      const halfH = Math.floor(config.height / 2);
      this.worldHalfWidth = halfW;
      this.worldHalfHeight = halfH;
      this.cameras.main.setBounds(-halfW, -halfH, config.width, config.height);
      this.fogLayer.setPosition(-halfW, -halfH);
      this.fogLayer.resize(config.width, config.height);
    }

    private renderTerrainOverlay(config: WorldMapConfig) {
      this.terrainOverlayLayer.removeAll(true);
      if (!config.terrainOverlayEnabled) return;
      const halfW = Math.floor(config.width / 2);
      const halfH = Math.floor(config.height / 2);
      for (const area of WORLD_TERRAIN_AREAS) {
        const color = TERRAIN_COLORS[area.kind];
        if (area.shape === "rect") {
          const x = -halfW + area.x * config.width;
          const y = -halfH + area.y * config.height;
          const rect = this.add
            .rectangle(x, y, area.w * config.width, area.h * config.height, color, 0.16)
            .setOrigin(0)
            .setStrokeStyle(1, color, 0.38);
          this.terrainOverlayLayer.add(rect);
        } else {
          const x = -halfW + area.x * config.width;
          const y = -halfH + area.y * config.height;
          const circle = this.add
            .circle(x, y, area.r * Math.min(config.width, config.height), color, 0.14)
            .setStrokeStyle(1, color, 0.36);
          this.terrainOverlayLayer.add(circle);
        }
      }
    }

    private renderMaskOverlay(config: WorldMapConfig, mask: WorldTerrainMaskData | null) {
      this.maskOverlayLayer.removeAll(true);
      if (!this.lastData?.editorMode || !this.lastData.showTerrainOverlay || !mask) return;
      const cellW = config.width / mask.columns;
      const cellH = config.height / mask.rows;
      const halfW = config.width / 2;
      const halfH = config.height / 2;
      for (let row = 0; row < mask.rows; row++) {
        for (let col = 0; col < mask.columns; col++) {
          const kind = mask.cells[row * mask.columns + col] ?? "PLAINS";
          const color = Number.parseInt(TERRAIN_COLOR_HEX[kind].slice(1), 16);
          const alpha = kind === "PLAINS" ? 0.34 : kind === "WATER" ? 0.54 : 0.42;
          const rect = this.add
            .rectangle(-halfW + col * cellW, -halfH + row * cellH, cellW, cellH, color, alpha)
            .setOrigin(0)
            .setStrokeStyle(1, color, kind === "PLAINS" ? 0.34 : 0.22);
          this.maskOverlayLayer.add(rect);
        }
      }
    }

    private clampCamera() {
      if (!this.lastData?.mapConfig) return;
      const camera = this.cameras.main;
      const visibleW = camera.width / camera.zoom;
      const visibleH = camera.height / camera.zoom;
      const editorPaddingX = this.lastData.editorMode ? visibleW * 0.45 : 0;
      const editorPaddingY = this.lastData.editorMode ? visibleH * 0.35 : 0;
      const minScrollX = -this.worldHalfWidth - editorPaddingX;
      const maxScrollX = this.worldHalfWidth - visibleW + editorPaddingX;
      const minScrollY = -this.worldHalfHeight - editorPaddingY;
      const maxScrollY = this.worldHalfHeight - visibleH + editorPaddingY;

      camera.scrollX = minScrollX > maxScrollX ? -visibleW / 2 : Phaser.Math.Clamp(camera.scrollX, minScrollX, maxScrollX);
      camera.scrollY = minScrollY > maxScrollY ? -visibleH / 2 : Phaser.Math.Clamp(camera.scrollY, minScrollY, maxScrollY);
    }

    public centerOnCity(cityId: string) {
      const target = this.citySprites.get(cityId);
      const data = this.lastData;
      if (!data?.mapConfig) return;
      const camera = this.cameras.main;

      if (target) {
        camera.centerOn(target.x, target.y);
      } else {
        const normalizedCities = this.getNormalizedCities(data.cities);
        const fallback = normalizedCities.find((c) => c.id === cityId) ?? normalizedCities[0];
        if (!fallback) return;
        camera.centerOn(fallback.posX, fallback.posY);
      }
      camera.setZoom(data.mapConfig.cameraInitialZoom);
      this.clampCamera();
    }

    public centerOnAnyKnownCity() {
      if (!this.lastData?.cities.length) return;
      this.centerOnCity(this.lastData.cities[0].id);
    }

    private renderCities(cities: WorldCity[], myCityId: string | null) {
      for (const [id, obj] of this.citySprites.entries()) {
        if (!cities.some((c) => c.id === id)) {
          obj.destroy(true);
          this.citySprites.delete(id);
        }
      }

      for (const city of cities) {
        const existing = this.citySprites.get(city.id);
        if (existing) {
          existing.setPosition(city.posX, city.posY);
          const label = existing.getByName("label") as Phaser.GameObjects.Text | null;
          if (label) label.setText(city.name);
          const marker = existing.getByName("marker") as Phaser.GameObjects.Image | null;
          if (marker) this.applyRelationTint(marker, city.relation);
          continue;
        }

        const container = this.add.container(city.posX, city.posY).setDepth(20);
        const markerTexture = this.textures.exists("player_village") ? "player_village" : "city_marker";
        const marker = this.add
          .image(0, 0, markerTexture)
          .setOrigin(0.5, 0.85)
          .setScale(markerTexture === "player_village" ? 0.32 : 0.16)
          .setName("marker")
          .setInteractive({ useHandCursor: true });
        this.applyRelationTint(marker, city.relation);

        if (myCityId && city.id === myCityId) {
          marker.setScale(markerTexture === "player_village" ? 0.4 : 0.22);
          container.add(this.add.circle(0, 4, 18, 0x2ec7c9, 0.12));
        }

        marker.on("pointerdown", (pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
          event.stopPropagation();
          this.game.events.emit("worldmap:selectCity", city.id, { x: pointer.x, y: pointer.y });
        });

        const label = this.add
          .text(0, 18, city.name, {
            fontFamily: "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
            fontSize: "10px",
            color: "#e7d6a8",
            align: "center",
            backgroundColor: "rgba(5,7,7,0.58)",
            padding: { left: 6, right: 6, top: 3, bottom: 3 },
          })
          .setOrigin(0.5, 0)
          .setName("label");

        container.add([marker, label]);
        this.citiesLayer.add(container);
        this.citySprites.set(city.id, container);
      }
    }

    private applyRelationTint(marker: Phaser.GameObjects.Image, relation: WorldCity["relation"]) {
      if (relation === "ally") marker.setTint(0x49f0c5);
      else if (relation === "peace") marker.setTint(0x6fc8ff);
      else if (relation === "hostile") marker.setTint(0xd75f43);
      else marker.clearTint();
    }

    private renderBarbarianCamps(camps: BarbarianCamp[]) {
      const campIds = new Set(camps.map((c) => c.id));
      for (const [id, obj] of this.campSprites.entries()) {
        if (!campIds.has(id)) {
          obj.destroy(true);
          this.campSprites.delete(id);
        }
      }

      for (const camp of camps) {
        if (camp.status !== "ACTIVE") continue;

        const existing = this.campSprites.get(camp.id);
        if (existing) {
          existing.setPosition(camp.posX, camp.posY);
          continue;
        }

        const container = this.add.container(camp.posX, camp.posY).setDepth(15);
        const tint = ARCHETYPE_TINTS[camp.archetype] ?? 0xd75f43;

        const marker = this.textures.exists("barbarian_camp")
          ? this.add.image(0, 0, "barbarian_camp").setScale(0.2).setTint(tint).setName("marker").setInteractive({ useHandCursor: true })
          : this.add.triangle(0, 0, 0, -8, 8, 6, -8, 6, tint, 0.9).setStrokeStyle(1.5, 0xffffff, 0.5).setName("marker").setInteractive({ useHandCursor: true });

        const label = this.add
          .text(0, 10, camp.name, {
            fontFamily: "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
            fontSize: "9px",
            color: "#e7d6a8",
            align: "center",
            backgroundColor: "rgba(5,7,7,0.6)",
            padding: { left: 4, right: 4, top: 2, bottom: 2 },
          })
          .setOrigin(0.5, 0)
          .setName("label");

        const levelBadge = this.add
          .text(0, -12, `Lv.${camp.level}`, {
            fontSize: "8px",
            color: "#ff6b6b",
            fontStyle: "bold",
            backgroundColor: "rgba(5,7,7,0.6)",
            padding: { left: 3, right: 3, top: 1, bottom: 1 },
          })
          .setOrigin(0.5, 1)
          .setName("level");

        marker.on("pointerdown", (pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
          event.stopPropagation();
          this.game.events.emit("worldmap:selectCamp", camp, { x: pointer.x, y: pointer.y });
        });

        container.add([marker, label, levelBadge]);
        this.citiesLayer.add(container);
        this.campSprites.set(camp.id, container);
      }
    }
  };
}
