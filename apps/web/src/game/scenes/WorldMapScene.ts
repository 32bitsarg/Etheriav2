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
};

type WorldMapPayload = {
  mapConfig: WorldMapConfig | null;
  cities: WorldCity[];
  myCityId?: string | null;
  barbarianCamps?: BarbarianCamp[];
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
    private dragSurface!: Phaser.GameObjects.Zone;

    private dragStart?: { x: number; y: number; camX: number; camY: number };
    private lastData?: WorldMapPayload;
    private hasCentered = false;
    private worldHalfWidth = 0;
    private worldHalfHeight = 0;

    private citySprites = new Map<string, Phaser.GameObjects.Container>();
    private campSprites = new Map<string, Phaser.GameObjects.Container>();
    private loadedBackgroundPath?: string;

    constructor() {
      super({ key: "WorldMapScene" });
    }

    preload() {
      this.load.image("city_marker", "/assets/ui/map-city-marker.png");
    }

    create() {
      this.citiesLayer = this.add.container(0, 0).setDepth(12);
      this.dragSurface = this.add.zone(0, 0, this.scale.width, this.scale.height).setOrigin(0).setScrollFactor(0).setDepth(50);
      this.dragSurface.setInteractive();
      this.setupInput();
      this.isReady = true;
      if (this.lastData) this.setWorldData(this.lastData);
    }

    private setupInput() {
      const camera = this.cameras.main;
      this.input.setTopOnly(false);
      this.scale.on(Phaser.Scale.Events.RESIZE, (gameSize: Phaser.Structs.Size) => {
        this.dragSurface.setSize(gameSize.width, gameSize.height);
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
        this.dragStart = { x: pointer.x, y: pointer.y, camX: camera.scrollX, camY: camera.scrollY };
      });

      this.input.on("pointerup", () => {
        this.dragStart = undefined;
      });

      this.dragSurface.on("pointermove", (pointer: Phaser.Input.Pointer) => {
        if (!this.dragStart || (!pointer.isDown && pointer.buttons !== 1)) return;
        const dx = pointer.x - this.dragStart.x;
        const dy = pointer.y - this.dragStart.y;
        camera.scrollX = this.dragStart.camX - dx / camera.zoom;
        camera.scrollY = this.dragStart.camY - dy / camera.zoom;
        this.clampCamera();
      });
    }

    public setWorldData(data: WorldMapPayload) {
      this.lastData = data;
      if (!this.isReady || !data.mapConfig) return;

      this.ensureBackground(data.mapConfig);
      this.applyWorldBounds(data.mapConfig);
      this.renderCities(data.cities, data.myCityId ?? null);
      this.renderBarbarianCamps(data.barbarianCamps ?? []);

      if (!this.hasCentered) {
        const myId = data.myCityId ?? null;
        if (myId && this.citySprites.has(myId)) {
          this.centerOnCity(myId);
        } else if (data.cities[0]) {
          this.cameras.main.centerOn(data.cities[0].posX, data.cities[0].posY);
          this.cameras.main.setZoom(data.mapConfig.cameraInitialZoom);
        }
        this.clampCamera();
        this.hasCentered = true;
      }
    }

    private ensureBackground(config: WorldMapConfig) {
      if (this.loadedBackgroundPath === config.backgroundAssetPath && this.ground) return;

      const textureKey = `world-bg:${config.backgroundAssetPath}`;
      const buildGround = () => {
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
    }

    private clampCamera() {
      if (!this.lastData?.mapConfig) return;
      const camera = this.cameras.main;
      const visibleW = camera.width / camera.zoom;
      const visibleH = camera.height / camera.zoom;
      const minScrollX = -this.worldHalfWidth;
      const maxScrollX = this.worldHalfWidth - visibleW;
      const minScrollY = -this.worldHalfHeight;
      const maxScrollY = this.worldHalfHeight - visibleH;

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
        const fallback = data.cities.find((c) => c.id === cityId) ?? data.cities[0];
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
        const marker = this.add
          .image(0, 0, "city_marker")
          .setOrigin(0.5, 0.85)
          .setScale(0.16)
          .setName("marker")
          .setInteractive({ useHandCursor: true });
        this.applyRelationTint(marker, city.relation);

        if (myCityId && city.id === myCityId) {
          marker.setScale(0.22);
          container.add(this.add.circle(0, 4, 12, 0x2ec7c9, 0.12));
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
      // Remove camps that no longer exist
      const campIds = new Set(camps.map((c) => c.id));
      for (const [id, obj] of this.campSprites.entries()) {
        if (!campIds.has(id)) {
          obj.destroy(true);
          this.campSprites.delete(id);
        }
      }

      // Add or update camps
      for (const camp of camps) {
        if (camp.status !== "ACTIVE") continue;

        const existing = this.campSprites.get(camp.id);
        if (existing) {
          continue;
        }

        const container = this.add.container(camp.posX, camp.posY).setDepth(15);
        const tint = ARCHETYPE_TINTS[camp.archetype] ?? 0xd75f43;

        const marker = this.add
          .triangle(0, 0, 0, -8, 8, 6, -8, 6, tint, 0.9)
          .setStrokeStyle(1.5, 0xffffff, 0.5)
          .setName("marker")
          .setInteractive({ useHandCursor: true });

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
