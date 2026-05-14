import { create } from "zustand";
import type { AllianceMembership, Resources, BuildingType, Building, BuildQueue, ResearchQueue, TrainingQueue, Unit, TechBonuses, UnitType, BarbarianCampMapItem, WorldSeasonState } from "@etheria/shared";

export interface BarbarianAttackAlert {
  id: string;
  cityId: string;
  campId: string;
  campName: string;
  archetype: string;
  estimatedPower: number;
  arrivesAt: string;
  warnedAt: string;
  read: boolean;
}

export interface RuntimeUnreadCounts {
  mail: number;
  gameReports: number;
  battleReports: number;
}

export interface RuntimeBattleReport {
  id: string;
  battleId: string;
  cityId: string;
  attackerCityId: string;
  defenderCityId: string;
  attackerName?: string;
  defenderName?: string;
  status: "VICTORY" | "DEFEAT";
  attackerLosses: Record<string, number>;
  defenderLosses: Record<string, number>;
  loot?: Resources;
  read: boolean;
  createdAt: string;
  isBarbarianAttack?: boolean;
}

export interface RuntimeActiveBattle {
  id: string;
  attackerCityId: string;
  defenderCityId: string;
  status: "MARCHING" | "RETURNING";
  arrivesAt: string;
  returnsAt?: string;
  units: { type: string; count: number }[];
}

export interface CityState {
  cityId: string | null;
  name: string;
  resources: Resources;
  production: {
    goldPerHour: number;
    woodPerHour: number;
    stonePerHour: number;
    foodPerHour: number;
  };
  storage: {
    maxGold: number;
    maxWood: number;
    maxStone: number;
    maxFood: number;
  };
  buildings: Building[];
  units: Unit[];
  buildQueues: BuildQueue[];
  trainingQueues: TrainingQueue[];
  cityTechs: { techId: string; level: number }[];
  researchQueue: ResearchQueue[];
  activeResearch: ResearchQueue | null;
  allianceMembership: AllianceMembership | null;
  techBonuses: TechBonuses;
  lastResourceUpdate: string | null;
  posX: number;
  posY: number;
}

interface GameState extends CityState {
  // Loading
  isLoading: boolean;
  error: string | null;

  // Building mode
  buildMode: boolean;
  setBuildMode: (active: boolean) => void;
  selectedBuildingType: BuildingType | null;
  setSelectedBuildingType: (type: BuildingType | null) => void;

  // Selection
  selectedTile: { x: number; y: number } | null;
  setSelectedTile: (tile: { x: number; y: number } | null) => void;
  selectedBuilding: Building | null;
  setSelectedBuilding: (building: Building | null) => void;

  // Research panel
  showResearch: boolean;
  setShowResearch: (show: boolean) => void;

  // Barbarian camps
  barbarianCamps: BarbarianCampMapItem[];
  setBarbarianCamps: (camps: BarbarianCampMapItem[]) => void;
  selectedCamp: BarbarianCampMapItem | null;
  setSelectedCamp: (camp: BarbarianCampMapItem | null) => void;
  showCampModal: boolean;
  setShowCampModal: (show: boolean) => void;

  // Barbarian attack alerts
  barbarianAlerts: BarbarianAttackAlert[];
  setBarbarianAlerts: (alerts: BarbarianAttackAlert[]) => void;
  markAlertRead: (alertId: string) => void;

  // Runtime data hydrated from play-initial
  activeBattles: RuntimeActiveBattle[];
  setActiveBattles: (battles: RuntimeActiveBattle[]) => void;
  battleReports: RuntimeBattleReport[];
  setBattleReports: (reports: RuntimeBattleReport[]) => void;
  unreadCounts: RuntimeUnreadCounts;
  setUnreadCounts: (counts: Partial<RuntimeUnreadCounts>) => void;
  seasonState: WorldSeasonState | null;
  setSeasonState: (seasonState: WorldSeasonState | null) => void;
  playInitialLoadedAt: string | null;
  setPlayInitialLoadedAt: (loadedAt: string | null) => void;

  // City data
  setCity: (city: Partial<CityState>) => void;
  updateResources: (resources: Resources) => void;
  addBuilding: (building: Building) => void;
  updateBuilding: (building: Building) => void;
  removeBuilding: (id: string) => void;
  startUpgrade: (buildingId: string) => void;
  setBuildQueues: (queues: BuildQueue[]) => void;
  addBuildQueue: (queue: BuildQueue) => void;

  // Training
  startTraining: (unitType: UnitType, count: number, completesAt: string) => void;

  // Research
  startResearch: (techId: string, level: number) => void;

  // Derived: calculate live resources client-side
  getLiveResources: () => Resources;
}

export const useGameStore = create<GameState>((set, get) => ({
  // Initial state
  cityId: null,
  name: '',
  resources: { gold: 0, wood: 0, stone: 0, food: 0, gems: 0 },
  production: { goldPerHour: 0, woodPerHour: 0, stonePerHour: 0, foodPerHour: 0 },
  storage: { maxGold: 1000, maxWood: 1000, maxStone: 500, maxFood: 500 },
  buildings: [],
  units: [],
  buildQueues: [],
  trainingQueues: [],
  cityTechs: [],
  researchQueue: [],
  activeResearch: null,
  allianceMembership: null,
  techBonuses: {
    unitAttackBonus: {},
    unitHpBonus: {},
    unitDefenseBonus: {},
    unitSpeedBonus: {},
    unitApBonus: {},
    resourceProdBonus: {},
    trainingCostReduction: 0,
    wallBonusMultiplier: 1,
    towerDamageBonus: 0,
  },
  lastResourceUpdate: null,
  posX: 0,
  posY: 0,

  isLoading: true,
  error: null,

  buildMode: false,
  setBuildMode: (buildMode) => set({ buildMode }),
  selectedBuildingType: null,
  setSelectedBuildingType: (selectedBuildingType) => set({ selectedBuildingType }),

  selectedTile: null,
  setSelectedTile: (selectedTile) => set({ selectedTile }),
  selectedBuilding: null,
  setSelectedBuilding: (selectedBuilding) => set({ selectedBuilding }),

  showResearch: false,
  setShowResearch: (showResearch) => set({ showResearch }),

  barbarianCamps: [],
  setBarbarianCamps: (barbarianCamps) => set({ barbarianCamps }),
  selectedCamp: null,
  setSelectedCamp: (selectedCamp) => set({ selectedCamp }),
  showCampModal: false,
  setShowCampModal: (showCampModal) => set({ showCampModal }),

  barbarianAlerts: [],
  setBarbarianAlerts: (barbarianAlerts) => set({ barbarianAlerts }),
  markAlertRead: (alertId) => set((state) => ({
    barbarianAlerts: state.barbarianAlerts.map((a) =>
      a.id === alertId ? { ...a, read: true } : a
    ),
  })),

  activeBattles: [],
  setActiveBattles: (activeBattles) => set({ activeBattles }),
  battleReports: [],
  setBattleReports: (battleReports) => set({ battleReports }),
  unreadCounts: { mail: 0, gameReports: 0, battleReports: 0 },
  setUnreadCounts: (counts) => set((state) => ({ unreadCounts: { ...state.unreadCounts, ...counts } })),
  seasonState: null,
  setSeasonState: (seasonState) => set({ seasonState }),
  playInitialLoadedAt: null,
  setPlayInitialLoadedAt: (playInitialLoadedAt) => set({ playInitialLoadedAt }),

  setCity: (city) => set((state) => ({ ...state, ...city, isLoading: false })),

  updateResources: (resources) => set({ resources }),

  addBuilding: (building) =>
    set((state) => ({ buildings: [...state.buildings, building] })),

  updateBuilding: (building) =>
    set((state) => ({
      buildings: state.buildings.map((b) => (b.id === building.id ? building : b)),
    })),

  removeBuilding: (id) =>
    set((state) => ({
      buildings: state.buildings.filter((b) => b.id !== id),
    })),

  startUpgrade: (buildingId) =>
    set((state) => {
      const building = state.buildings.find((b) => b.id === buildingId);
      if (!building) return state;
      return {
        buildings: state.buildings.map((b) =>
          b.id === buildingId ? { ...b, level: b.level + 1 } : b
        ),
      };
    }),

  setBuildQueues: (buildQueues) => set({ buildQueues }),

  addBuildQueue: (queue) =>
    set((state) => ({
      buildQueues: [...state.buildQueues, queue],
    })),

  startTraining: (unitType, count, completesAt) =>
    set((state) => ({
      trainingQueues: [
        ...state.trainingQueues,
        {
          id: crypto.randomUUID(),
          cityId: state.cityId ?? "",
          unitType,
          count,
          startedAt: new Date().toISOString(),
          completesAt,
          isComplete: false,
        },
      ],
    })),

  startResearch: (techId, level) =>
    set((state) => {
      const existing = state.cityTechs.find((t) => t.techId === techId);
      if (existing) {
        return {
          cityTechs: state.cityTechs.map((t) =>
            t.techId === techId ? { ...t, level: t.level + 1 } : t
          ),
        };
      }
      return {
        cityTechs: [...state.cityTechs, { techId, level }],
      };
    }),

  getLiveResources: () => {
    const state = get();
    if (!state.lastResourceUpdate) return state.resources;

    const now = new Date();
    const lastUpdate = new Date(state.lastResourceUpdate);
    const hoursElapsed = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

    return {
      gold: Math.min(state.storage.maxGold, Math.floor(state.resources.gold + state.production.goldPerHour * hoursElapsed)),
      wood: Math.min(state.storage.maxWood, Math.floor(state.resources.wood + state.production.woodPerHour * hoursElapsed)),
      stone: Math.min(state.storage.maxStone, Math.floor(state.resources.stone + state.production.stonePerHour * hoursElapsed)),
      food: Math.min(state.storage.maxFood, Math.floor(state.resources.food + state.production.foodPerHour * hoursElapsed)),
      gems: state.resources.gems,
    };
  },
}));
