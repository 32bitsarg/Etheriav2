import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { etaInterval } from "./pollingIntervals";
import type { AllianceMembership, ChatChannel, ChatMessage, City, Building, BuildQueue, MailMessage, ResearchQueue, SendChatMessageRequest, SendMailMessageRequest, TrainingQueue, Unit, Resources, WorldSeasonState, WorldStateResponse, BarbarianCampMapItem, BarbarianCampDetail, WorldMovement, GameReport, PlayerQuest, MarketOffer } from "@etheria/shared";
import type { VillageLayoutData } from "@/lib/villageLayout";
import type { WorldTerrainMaskData } from "@/lib/worldTerrainMask";
import villageLayoutJson from "@/data/village-layout.json";
import { normalizeVillageLayout } from "@/lib/villageLayout";
import { adminHeaders } from "@/lib/adminClient";
const API_BASE = "/api";
const pendingUpgradeKeys = new Set<string>();
export const PLAY_INITIAL_TIMEOUT_MS = 15_000;

export async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 12_000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if ((error as any)?.name === "AbortError") {
      const timeoutError = new Error("Request timed out") as Error & { code?: string };
      timeoutError.code = "REQUEST_TIMEOUT";
      throw timeoutError;
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

function updatePlayInitialCity(queryClient: ReturnType<typeof useQueryClient>, cityId: string, updater: (city: any) => any) {
  queryClient.setQueryData(["play-initial", cityId], (current: any) => {
    if (!current?.city) return current;
    return { ...current, city: updater(current.city) };
  });
}

function setRuntimeCityData(queryClient: ReturnType<typeof useQueryClient>, cityId: string, updater: (city: any) => any) {
  queryClient.setQueryData(["city", cityId], (current: any) => (current ? updater(current) : current));
  updatePlayInitialCity(queryClient, cityId, updater);
}

function invalidateCityRuntime(queryClient: ReturnType<typeof useQueryClient>, cityId: string) {
  queryClient.invalidateQueries({ queryKey: ["city", cityId] });
  queryClient.invalidateQueries({ queryKey: ["play-initial", cityId] });
}

function shouldRetryAuthQuery(failureCount: number, error: any) {
  if (error?.status === 401) return false;
  return failureCount < 1;
}

function getAuthHeaders(): Record<string, string> {
  return {};
}

async function fetchCity(cityId: string): Promise<City & {
  buildings: Building[];
  units: Unit[];
  buildQueues: BuildQueue[];
  trainingQueues: TrainingQueue[];
  cityTechs: { techId: string; level: number }[];
  researchQueue: ResearchQueue[];
  activeResearch: { techId: string; targetLevel: number; startedAt: string; completesAt: string } | null;
  allianceMembership: AllianceMembership | null;
  resources: Resources;
  goldPerHour: number;
  woodPerHour: number;
  stonePerHour: number;
  foodPerHour: number;
  maxGold: number;
  maxWood: number;
  maxStone: number;
  maxFood: number;
}> {
  const res = await fetch(`${API_BASE}/city/${cityId}`, { cache: "no-store" });
  if (!res.ok) {
    const error = new Error(res.status === 404 ? "City not found" : "Failed to fetch city") as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export interface PlayInitialData {
  city: Awaited<ReturnType<typeof fetchCity>>;
  techs?: {
    techs: TechData[];
    activeResearch: { techId: string; targetLevel: number; startedAt: string; completesAt: string } | null;
    researchQueue: ResearchQueue[];
  };
  activeBattles: ActiveBattle[];
  battleReports: BattleReport[];
  unreadCounts: {
    mail: number;
    gameReports: number;
    battleReports: number;
  };
  barbarianAlerts: BarbarianAttackAlert[];
  seasonState: WorldSeasonState | null;
  serverTime?: string;
  cacheHints?: {
    seasonPollMs: number;
    battlePollMs: number;
    reportsPollMs: number;
    worldMovementsPollMs: number;
  };
}

export function usePlayInitial(cityId: string | null) {
  return useQuery({
    queryKey: ["play-initial", cityId],
    queryFn: async () => {
      const res = await fetchWithTimeout(`${API_BASE}/city/${cityId}/play-initial`, { cache: "no-store" }, PLAY_INITIAL_TIMEOUT_MS);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const error = new Error(data.error || "Failed to fetch play initial") as Error & { status?: number; code?: string };
        error.status = res.status;
        error.code = data.code;
        throw error;
      }
      return data as PlayInitialData;
    },
    enabled: !!cityId,
    staleTime: 15_000,
    retry: (failureCount, error: any) => {
      if (error?.status === 404) return false;
      return failureCount < 1;
    },
  });
}

export function useCity(cityId: string | null) {
  return useQuery({
    queryKey: ["city", cityId],
    queryFn: () => fetchCity(cityId!),
    enabled: !!cityId,
    staleTime: 10_000,
    retry: (failureCount, error: any) => {
      if (error?.status === 404) return false;
      return failureCount < 1;
    },
    refetchInterval: (query) => {
      const data = query.state.data as
        | {
            buildQueues?: { completesAt: string }[];
            trainingQueues?: { completesAt: string }[];
            activeResearch?: { completesAt: string } | null;
          }
        | undefined;

      if (!data) return false;

      const hasActiveBuilds = (data.buildQueues?.length ?? 0) > 0;
      const hasActiveTraining = (data.trainingQueues?.length ?? 0) > 0;
      const hasActiveResearch = !!data.activeResearch;

      if (!hasActiveBuilds && !hasActiveTraining && !hasActiveResearch) return false;

      // Poll faster when any queue is close to completing (< 10s remaining)
      const now = Date.now();
      const allCompletesAt = [
        ...(data.buildQueues?.map((q) => q.completesAt) ?? []),
        ...(data.trainingQueues?.map((q) => q.completesAt) ?? []),
        ...(data.activeResearch ? [data.activeResearch.completesAt] : []),
      ];
      const soonest = allCompletesAt
        .map((t) => new Date(t).getTime() - now)
        .sort((a, b) => a - b)[0] ?? Infinity;

      // Countdown display is client-side (useCountdown); polling only needs to
      // catch completions, so back off when nothing finishes soon.
      if (soonest < 10_000) return 1_000;
      if (soonest < 60_000) return 5_000;
      return 20_000;
    },
    refetchIntervalInBackground: false,
  });
}

export function useBuildBuilding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cityId,
      type,
      positionX,
      positionY,
    }: {
      cityId: string;
      type: string;
      positionX: number;
      positionY: number;
    }) => {
      const res = await fetch(`${API_BASE}/city/${cityId}/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, positionX, positionY }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Build failed");
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      if (data?.queue) {
        setRuntimeCityData(queryClient, variables.cityId, (current: any) => {
          if (!current) return current;
          const nextQueues = [...(current.buildQueues ?? []), data.queue]
            .sort((a: any, b: any) => new Date(a.completesAt ?? 0).getTime() - new Date(b.completesAt ?? 0).getTime());
          return {
            ...current,
            buildQueues: nextQueues,
            ...(data.resources ? { resources: data.resources, lastResourceUpdate: new Date().toISOString() } : {}),
          };
        });
      }
      invalidateCityRuntime(queryClient, variables.cityId);
    },
  });
}

export function useUpgradeBuilding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cityId,
      buildingId,
    }: {
      cityId: string;
      buildingId: string;
    }) => {
      const lockKey = `${cityId}:${buildingId}`;
      if (pendingUpgradeKeys.has(lockKey)) {
        throw new Error("Upgrade already in progress");
      }

      pendingUpgradeKeys.add(lockKey);
      try {
        const res = await fetch(`${API_BASE}/city/${cityId}/buildings/${buildingId}/upgrade`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Upgrade failed");
        }
        return res.json();
      } finally {
        pendingUpgradeKeys.delete(lockKey);
      }
    },
    onSuccess: (data, variables) => {
      if (data?.queue) {
        setRuntimeCityData(queryClient, variables.cityId, (current: any) => {
          if (!current) return current;
          const nextQueues = [...(current.buildQueues ?? []).filter((queue: any) => queue.buildingId !== data.queue.buildingId), data.queue];
          nextQueues.sort((a, b) => new Date(a.completesAt).getTime() - new Date(b.completesAt).getTime());
          return {
            ...current,
            buildQueues: nextQueues,
            ...(data.resources ? { resources: data.resources, lastResourceUpdate: new Date().toISOString() } : {}),
          };
        });
        // Schedule local notification for when the build completes
        import("../lib/native").then(({ scheduleLocalNotification }) => {
          const buildingName = data.queue.buildingType ?? "Building";
          scheduleLocalNotification({
            id: Math.abs(data.queue.buildingId?.split("").reduce((a: number, c: string) => a + c.charCodeAt(0), 0) ?? Math.random() * 10000) % 100000,
            title: "Construcción completada",
            body: `${buildingName} nivel ${data.queue.targetLevel} listo en tu ciudad.`,
            scheduleAt: new Date(data.queue.completesAt),
          });
        });
      }
      invalidateCityRuntime(queryClient, variables.cityId);
    },
  });
}

export function useCancelBuildQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cityId,
      queueId,
    }: {
      cityId: string;
      queueId: string;
    }) => {
      const res = await fetch(`${API_BASE}/city/${cityId}/build-queues/${queueId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Cancel build failed");
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      setRuntimeCityData(queryClient, variables.cityId, (current: any) => {
        if (!current) return current;
        return {
          ...current,
          buildQueues: (current.buildQueues ?? []).filter((queue: any) => queue.id !== data.queueId),
          ...(data.resources ? { resources: data.resources, lastResourceUpdate: new Date().toISOString() } : {}),
        };
      });
      invalidateCityRuntime(queryClient, variables.cityId);
    },
  });
}

function useCancelQueue(endpoint: "training-queues" | "research-queues", queryField: "trainingQueues" | "researchQueue") {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cityId,
      queueId,
    }: {
      cityId: string;
      queueId: string;
    }) => {
      const res = await fetch(`${API_BASE}/city/${cityId}/${endpoint}/${queueId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Cancel queue failed");
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      setRuntimeCityData(queryClient, variables.cityId, (current: any) => {
        if (!current) return current;
        const next = {
          ...current,
          [queryField]: (current[queryField] ?? []).filter((queue: any) => queue.id !== data.queueId),
          ...(data.resources ? { resources: data.resources, lastResourceUpdate: new Date().toISOString() } : {}),
        };
        if (queryField === "researchQueue") {
          next.activeResearch = next.researchQueue[0] ?? null;
        }
        return next;
      });
      invalidateCityRuntime(queryClient, variables.cityId);
      if (queryField === "researchQueue") {
        queryClient.invalidateQueries({ queryKey: ["techs", variables.cityId] });
      }
    },
  });
}

export function useCancelTrainingQueue() {
  return useCancelQueue("training-queues", "trainingQueues");
}

export function useCancelResearchQueue() {
  return useCancelQueue("research-queues", "researchQueue");
}

export function useTrainUnits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cityId,
      unitType,
      count,
    }: {
      cityId: string;
      unitType: string;
      count: number;
    }) => {
      const res = await fetch(`${API_BASE}/city/${cityId}/train`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitType, count }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Training failed");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      invalidateCityRuntime(queryClient, variables.cityId);
    },
  });
}

export function useCreateCity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name?: string) => {
      const res = await fetch(`${API_BASE}/city/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(name ? { name } : {}),
      });
      if (!res.ok) throw new Error("Failed to create city");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["city", data.city.id], data.city);
    },
  });
}

export function useRenameCity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ cityId, name }: { cityId: string; name: string }) => {
      const res = await fetch(`${API_BASE}/city/${cityId}/name`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error ?? "Failed to rename city");
      }
      return res.json();
    },
    onSuccess: (_data, vars) => {
      invalidateCityRuntime(queryClient, vars.cityId);
      queryClient.invalidateQueries({ queryKey: ["cities", "all"] });
      queryClient.invalidateQueries({ queryKey: ["cities", "ranking"] });
    },
  });
}

// ─── Battle Hooks ───

interface TargetCity {
  id: string;
  name: string;
  userId?: string;
  allianceId?: string | null;
  posX: number;
  posY: number;
  level?: number;
  power?: number;
}

export interface CityRankingEntry {
  rank: number;
  cityId: string;
  cityName: string;
  userId: string;
  posX: number;
  posY: number;
  power: number;
  powerBreakdown: {
    buildings: number;
    army: number;
    research: number;
  };
}

export function useAllCities(enabled = true) {
  return useQuery({
    queryKey: ["cities", "all"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/city/list/all`);
      if (!res.ok) throw new Error("Failed to fetch cities");
      const data = await res.json();
      return data.cities as TargetCity[];
    },
    staleTime: 30000,
    enabled,
  });
}

export function useCityRanking() {
  return useQuery({
    queryKey: ["cities", "ranking"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/city/ranking/all`);
      if (!res.ok) throw new Error("Failed to fetch city ranking");
      const data = await res.json();
      return data.ranking as CityRankingEntry[];
    },
    staleTime: 30000,
  });
}

export interface WorldMapConfig {
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
}

export interface WorldSpawnConfig {
  strategy: "soft-clusters";
  minCityDistance: number;
  clusterRadius: number;
  clusterTargetPlayers: number;
  clusterSearchStep: number;
  edgePadding: number;
  maxPlacementAttempts: number;
}

export function useWorldMap(worldId?: string | null) {
  return useQuery({
    queryKey: ["world", "map", worldId],
    queryFn: async () => {
      const params = worldId ? `?worldId=${encodeURIComponent(worldId)}` : "";
      const res = await fetch(`${API_BASE}/city/world-map${params}`);
      if (!res.ok) throw new Error("Failed to fetch world map");
      const data = await res.json();
      return {
        map: data.map as WorldMapConfig,
        spawn: data.spawn as WorldSpawnConfig,
        cities: data.cities as TargetCity[],
        barbarianCamps: data.barbarianCamps as BarbarianCampMapItem[],
      };
    },
    staleTime: 30000,
  });
}

export function useWorldMovements(enabled = true) {
  return useQuery({
    queryKey: ["world", "movements"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/city/world/movements`);
      if (!res.ok) throw new Error("Failed to fetch movements");
      const data = await res.json();
      return data.movements as WorldMovement[];
    },
    staleTime: 5000,
    enabled,
    refetchInterval: enabled
      ? etaInterval<WorldMovement[]>(
          (ms) => ms.flatMap((m) => [m.arrivesAt, m.returnsAt]),
          { idleMs: 30_000, nearMs: 3_000, midMs: 8_000, farMs: 20_000 }
        )
      : false,
    refetchIntervalInBackground: false,
  });
}

export function useVillageLayout() {
  return useQuery({
    queryKey: ["village", "layout"],
    placeholderData: normalizeVillageLayout(villageLayoutJson as VillageLayoutData),
    queryFn: async () => {
      const res = await fetch("/api/editor/layout", { cache: "no-store", headers: adminHeaders() });
      if (!res.ok) throw new Error("Failed to fetch village layout");
      return await res.json() as VillageLayoutData;
    },
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function useSaveVillageLayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (layout: VillageLayoutData) => {
      const res = await fetch("/api/editor/layout", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify(layout),
      });
      if (!res.ok) throw new Error("Failed to save village layout");
      return await res.json() as VillageLayoutData;
    },
    onSuccess: (layout) => {
      queryClient.setQueryData(["village", "layout"], layout);
      queryClient.invalidateQueries({ queryKey: ["village", "layout"] });
    },
  });
}

export function useWorldTerrainMask() {
  return useQuery({
    queryKey: ["editor", "world-terrain-mask"],
    queryFn: async () => {
      const res = await fetch("/api/editor/world-terrain", { cache: "no-store", headers: adminHeaders() });
      if (!res.ok) throw new Error("Failed to fetch world terrain mask");
      return await res.json() as WorldTerrainMaskData;
    },
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function useSaveWorldTerrainMask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mask: WorldTerrainMaskData) => {
      const res = await fetch("/api/editor/world-terrain", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify(mask),
      });
      if (!res.ok) throw new Error("Failed to save world terrain mask");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["editor", "world-terrain-mask"] });
    },
  });
}

export function useAttackCity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cityId,
      targetCityId,
      units,
    }: {
      cityId: string;
      targetCityId: string;
      units: { type: string; count: number }[];
    }) => {
      const res = await fetch(`${API_BASE}/city/${cityId}/attack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetCityId, units }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Attack failed");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      invalidateCityRuntime(queryClient, variables.cityId);
      queryClient.invalidateQueries({ queryKey: ["battles", "active", variables.cityId] });
    },
  });
}

export interface BattleReport {
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

export function useBattleReports(cityId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["battles", "reports", cityId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/city/${cityId}/battles/reports`);
      if (!res.ok) throw new Error("Failed to fetch reports");
      const data = await res.json();
      return data.reports as BattleReport[];
    },
    enabled: !!cityId && enabled,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useMarkReportRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cityId, reportId }: { cityId: string; reportId: string }) => {
      const res = await fetch(`${API_BASE}/city/${cityId}/battles/reports/${reportId}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to mark report as read");
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["battles", "reports", variables.cityId] });
    },
  });
}

export interface ActiveBattle {
  id: string;
  attackerCityId: string;
  defenderCityId: string;
  status: "MARCHING" | "RETURNING";
  arrivesAt: string;
  returnsAt?: string;
  units: { type: string; count: number }[];
}

export function useActiveBattles(cityId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["battles", "active", cityId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/city/${cityId}/battles/active`);
      if (!res.ok) throw new Error("Failed to fetch active battles");
      const data = await res.json();
      return data.battles as ActiveBattle[];
    },
    enabled: !!cityId && enabled,
    staleTime: 15_000,
    refetchInterval: etaInterval<ActiveBattle[]>(
      (bs) => bs.flatMap((b) => [b.arrivesAt, b.returnsAt]),
      { idleMs: 45_000, nearMs: 2_000, midMs: 5_000, farMs: 15_000 }
    ),
    refetchIntervalInBackground: false,
    retry: 1,
  });
}

// ─── Tech / Research Hooks ───

export interface TechData {
  id: string;
  techId: string;
  name: string;
  description: string;
  category: string;
  maxLevel: number;
  currentLevel: number;
  canResearch: boolean;
  researchBlockedReason?: string;
  nextLevelCost: { gold: number; wood: number; stone: number; food: number } | null;
  nextLevelTime: number | null;
}

export function useTechs(cityId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["techs", cityId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/city/${cityId}/techs`);
      if (!res.ok) throw new Error("Failed to fetch techs");
      const data = await res.json();
      return {
        techs: data.techs as TechData[],
        activeResearch: data.activeResearch as { techId: string; targetLevel: number; completesAt: string } | null,
        researchQueue: data.researchQueue as ResearchQueue[],
      };
    },
    enabled: !!cityId && enabled,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useAllianceMembership(enabled = true) {
  return useQuery({
    queryKey: ["alliance", "me"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/alliances/me`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const error = new Error("Failed to fetch alliance membership") as Error & { status?: number };
        error.status = res.status;
        throw error;
      }
      const data = await res.json();
      return data as {
        gate: { allowed: boolean; reason?: string | null };
        membership: AllianceMembership | null;
        alliances: any[];
        members: any[];
        diplomacy: any[];
        events: any[];
        effects: any[];
        objectives: any[];
        objectiveContributions: any[];
      };
    },
    enabled,
    staleTime: 10_000,
    retry: shouldRetryAuthQuery,
  });
}

export function useGameReports(enabled = true) {
  return useQuery({
    queryKey: ["game-reports"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/reports`, { headers: getAuthHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const error = new Error(data.error || "Failed to fetch reports") as Error & { status?: number };
        error.status = res.status;
        throw error;
      }
      return { reports: data.reports as GameReport[], unreadCount: Number(data.unreadCount ?? 0) };
    },
    enabled,
    staleTime: 10_000,
    refetchInterval: enabled ? 60_000 : false,
    retry: shouldRetryAuthQuery,
  });
}

export function useMarkGameReportRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reportId: string) => {
      const res = await fetch(`${API_BASE}/reports/${reportId}/read`, { method: "POST", headers: getAuthHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to mark report read");
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["game-reports"] }),
  });
}

export function usePlayerQuests(cityId: string | null) {
  return useQuery({
    queryKey: ["quests", cityId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/quests?cityId=${cityId}`, { headers: getAuthHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to fetch quests");
      return data.quests as PlayerQuest[];
    },
    enabled: !!cityId,
    staleTime: 10_000,
  });
}

export function useClaimQuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (questId: string) => {
      const res = await fetch(`${API_BASE}/quests/${questId}/claim`, { method: "POST", headers: getAuthHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to claim quest");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quests"] });
      queryClient.invalidateQueries({ queryKey: ["city"] });
      queryClient.invalidateQueries({ queryKey: ["game-reports"] });
    },
  });
}

export function useMarkMapOpened() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cityId: string) => {
      const res = await fetch(`${API_BASE}/quests/events/open-map`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ cityId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update quest");
      return data;
    },
    onSuccess: (_data, cityId) => queryClient.invalidateQueries({ queryKey: ["quests", cityId] }),
  });
}

export function useMarketOffers() {
  return useQuery({
    queryKey: ["market", "offers"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/market/offers`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to fetch market offers");
      return data.offers as MarketOffer[];
    },
    staleTime: 15_000,
  });
}

export function useCreateMarketOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { cityId: string; giveResource: string; giveAmount: number; wantResource: string; wantAmount: number }) => {
      const res = await fetch(`${API_BASE}/market/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create offer");
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["market", "offers"] });
      invalidateCityRuntime(queryClient, variables.cityId);
      queryClient.invalidateQueries({ queryKey: ["game-reports"] });
    },
  });
}

export function useAcceptMarketOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ offerId, cityId }: { offerId: string; cityId: string }) => {
      const res = await fetch(`${API_BASE}/market/offers/${offerId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ cityId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to accept offer");
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["market", "offers"] });
      invalidateCityRuntime(queryClient, variables.cityId);
      queryClient.invalidateQueries({ queryKey: ["quests", variables.cityId] });
      queryClient.invalidateQueries({ queryKey: ["game-reports"] });
    },
  });
}

export function useScoutTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { cityId: string; targetType: "CITY" | "BARBARIAN_CAMP"; targetId: string }) => {
      const res = await fetch(`${API_BASE}/world/scout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to scout");
      return data;
    },
    onSuccess: (_data, variables) => {
      invalidateCityRuntime(queryClient, variables.cityId);
      queryClient.invalidateQueries({ queryKey: ["game-reports"] });
    },
  });
}

export function useContributeAllianceObjective() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ objectiveId, cityId, resources }: { objectiveId: string; cityId: string; resources: Resources }) => {
      const res = await fetch(`${API_BASE}/alliances/objectives/${objectiveId}/contribute`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ cityId, resources }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to contribute");
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["alliance", "me"] });
      invalidateCityRuntime(queryClient, variables.cityId);
      queryClient.invalidateQueries({ queryKey: ["quests", variables.cityId] });
      queryClient.invalidateQueries({ queryKey: ["game-reports"] });
    },
  });
}

export function useUpdateAlliance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { publicIntro?: string; forumText?: string }) => {
      const res = await fetch(`${API_BASE}/alliances/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update alliance");
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alliance", "me"] }),
  });
}

export function useProposePeace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { targetAllianceId: string; durationHours: number }) => {
      const res = await fetch(`${API_BASE}/alliances/diplomacy/peace`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to propose peace");
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alliance", "me"] }),
  });
}

export function useBreakTreaty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/alliances/diplomacy/${id}/break`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to break treaty");
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alliance", "me"] }),
  });
}

export function useCreateAlliance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, tag }: { name: string; tag: string }) => {
      const res = await fetch(`${API_BASE}/alliances`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ name, tag }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create alliance");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alliance", "me"] });
      queryClient.invalidateQueries({ queryKey: ["city"] });
    },
  });
}

export function useJoinAlliance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (allianceId: string) => {
      const res = await fetch(`${API_BASE}/alliances/${allianceId}/join`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to join alliance");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alliance", "me"] });
      queryClient.invalidateQueries({ queryKey: ["cities", "all"] });
      queryClient.invalidateQueries({ queryKey: ["city"] });
    },
  });
}

function useAllianceActionMutation<TInput>(pathBuilder: (input: TInput) => string, method: "POST" | "PATCH" = "POST") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: TInput) => {
      const res = await fetch(`${API_BASE}${pathBuilder(input)}`, {
        method,
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: method === "PATCH" ? JSON.stringify(input) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Alliance action failed");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alliance", "me"] });
      queryClient.invalidateQueries({ queryKey: ["cities", "all"] });
      queryClient.invalidateQueries({ queryKey: ["city"] });
    },
  });
}

export function useLeaveAlliance() {
  return useAllianceActionMutation<void>(() => "/alliances/me/leave");
}

export function useDisbandAlliance() {
  return useAllianceActionMutation<void>(() => "/alliances/me/disband");
}

export function useKickAllianceMember() {
  return useAllianceActionMutation<string>((memberId) => `/alliances/members/${memberId}/kick`);
}

export function useTransferAllianceLeadership() {
  return useAllianceActionMutation<string>((memberId) => `/alliances/members/${memberId}/transfer`);
}

export function useUpdateAllianceMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: "MEMBER" | "OFFICER" | "DIPLOMAT" }) => {
      const res = await fetch(`${API_BASE}/alliances/members/${memberId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update role");
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alliance", "me"] }),
  });
}

export function useChatMessages(channel: ChatChannel, enabled = true) {
  return useQuery({
    queryKey: ["chat", channel],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/chat/messages?channel=${channel}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to fetch chat messages");
      return data.messages as ChatMessage[];
    },
    enabled,
    staleTime: 4_000,
    refetchInterval: enabled ? 5_000 : false,
    refetchIntervalInBackground: false,
  });
}

export function useSendChatMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SendChatMessageRequest) => {
      const res = await fetch(`${API_BASE}/chat/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to send message");
      return data.message as ChatMessage;
    },
    onSuccess: (message) => {
      queryClient.setQueryData(["chat", message.channel], (current: ChatMessage[] | undefined) => {
        const next = [...(current ?? []).filter((item) => item.id !== message.id), message];
        return next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      });
    },
  });
}

export function useMailMessages(enabled = true) {
  return useQuery({
    queryKey: ["mail", "messages"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/mail/messages`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const error = new Error(data.error || "Failed to fetch mail") as Error & { status?: number };
        error.status = res.status;
        throw error;
      }
      return {
        inbox: data.inbox as MailMessage[],
        sent: data.sent as MailMessage[],
        unreadCount: Number(data.unreadCount ?? 0),
      };
    },
    enabled,
    staleTime: 10_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    retry: shouldRetryAuthQuery,
  });
}

export function useSendMailMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SendMailMessageRequest) => {
      const res = await fetch(`${API_BASE}/mail/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to send mail");
      return data.message as MailMessage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mail", "messages"] });
    },
  });
}

export function useMarkMailRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, read }: { id: string; read: boolean }) => {
      const res = await fetch(`${API_BASE}/mail/messages/${id}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ read }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update mail");
      return data as { id: string; readAt: string | null };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["mail", "messages"], (current: any) => {
        if (!current) return current;
        const inbox = (current.inbox ?? []).map((message: MailMessage) =>
          message.id === data.id ? { ...message, readAt: data.readAt } : message
        );
        return {
          ...current,
          inbox,
          unreadCount: inbox.filter((message: MailMessage) => !message.readAt).length,
        };
      });
    },
  });
}

export function useResearchTech() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cityId, techId }: { cityId: string; techId: string }) => {
      const res = await fetch(`${API_BASE}/city/${cityId}/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ techId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Research failed");
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      if (data?.queue) {
        setRuntimeCityData(queryClient, variables.cityId, (current: any) => {
          if (!current) return current;
          const nextQueue = [...(current.researchQueue ?? []), data.queue]
            .sort((a: any, b: any) => new Date(a.completesAt ?? 0).getTime() - new Date(b.completesAt ?? 0).getTime());
          return {
            ...current,
            researchQueue: nextQueue,
            activeResearch: nextQueue[0] ?? null,
            ...(data.resources ? { resources: data.resources, lastResourceUpdate: new Date().toISOString() } : {}),
          };
        });
      }
      queryClient.invalidateQueries({ queryKey: ["techs", variables.cityId] });
      invalidateCityRuntime(queryClient, variables.cityId);
    },
  });
}

// ─── World Season Hooks ───

export function useWorldSeason(enabled = true) {
  return useQuery({
    queryKey: ["world", "season"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/world/season`);
      if (!res.ok) throw new Error("Failed to fetch season");
      const data = await res.json();
      return data as { season: WorldSeasonState };
    },
    staleTime: 15_000,
    enabled,
    refetchInterval: enabled ? 60_000 : false,
  });
}

export function useWorldState() {
  return useQuery({
    queryKey: ["world", "state"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/world/state`);
      if (!res.ok) throw new Error("Failed to fetch world state");
      const data = await res.json();
      return data as WorldStateResponse;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

// ─── Barbarian Hooks ───

export function useBarbarianCamps() {
  return useQuery({
    queryKey: ["world", "barbarians"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/world/barbarians`);
      if (!res.ok) throw new Error("Failed to fetch barbarian camps");
      const data = await res.json();
      return data.camps as BarbarianCampMapItem[];
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useBarbarianCampDetail(campId: string | null) {
  return useQuery({
    queryKey: ["world", "barbarians", campId],
    queryFn: async () => {
      if (!campId) throw new Error("No camp ID");
      const res = await fetch(`${API_BASE}/world/barbarians/${campId}`);
      if (!res.ok) throw new Error("Failed to fetch camp detail");
      const data = await res.json();
      return data as {
        camp: BarbarianCampDetail;
        army: { units: Record<string, number>; power: number };
        estimatedReward: { gold: number; wood: number; stone: number; food: number };
      };
    },
    enabled: !!campId,
    staleTime: 15_000,
  });
}

export function useAttackBarbarianCamp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campId,
      cityId,
      units,
    }: {
      campId: string;
      cityId: string;
      units: { type: string; count: number }[];
    }) => {
      const res = await fetch(`${API_BASE}/world/barbarians/${campId}/attack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cityId, units }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Attack failed");
      }
      return res.json() as Promise<{
        battleId: string;
        travelTime: number;
        arrivesAt: string;
      }>;
    },
    onSuccess: (_data, variables) => {
      invalidateCityRuntime(queryClient, variables.cityId);
      queryClient.invalidateQueries({ queryKey: ["world", "barbarians"] });
    },
  });
}

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

export function useBarbarianAttackAlerts(cityId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["barbarian", "attack-alerts", cityId],
    queryFn: async () => {
      if (!cityId) throw new Error("No city ID");
      const res = await fetch(`${API_BASE}/world/barbarian-alerts/${cityId}`);
      if (!res.ok) throw new Error("Failed to fetch attack alerts");
      const data = await res.json();
      return data.alerts as BarbarianAttackAlert[];
    },
    enabled: !!cityId && enabled,
    staleTime: 15_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
}

export function useMarkBarbarianAlertRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ alertId }: { alertId: string }) => {
      const res = await fetch(`${API_BASE}/world/barbarian-alerts/${alertId}/read`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to mark alert as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barbarian", "attack-alerts"] });
    },
  });
}

// ─── Winter Pressure Hooks ───

export interface WinterPressureData {
  cityId: string;
  zone: { id: string; name: string; intensity: number };
  isWinter: boolean;
  currentSeason: string;
  hourlyConsumption: number;
  effectiveProduction: number;
  netFoodPerHour: number;
  hoursUntilStarvation: number;
  currentFood: number;
  minimumReserve: number;
  winterState: {
    foodBalance: number;
    starvationHours: number;
    isStarving: boolean;
    combatPenalty: number;
    desertionLosses: Record<string, number>;
  } | null;
}

export function useWinterPressure(cityId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["world", "winter-pressure", cityId],
    queryFn: async () => {
      if (!cityId) throw new Error("No city ID");
      const res = await fetch(`${API_BASE}/world/winter-pressure/${cityId}`);
      if (!res.ok) throw new Error("Failed to fetch winter pressure");
      const data = await res.json();
      return data as WinterPressureData;
    },
    enabled: !!cityId && enabled,
    staleTime: 15_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
}

export function usePublicCityProfile(cityId: string | null) {
  return useQuery({
    queryKey: ["city", "public", cityId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/city/${cityId}/public`);
      if (!res.ok) throw new Error("City not found");
      return res.json() as Promise<{ id: string; name: string; race: string; posX: number; posY: number; createdAt: string; power: number; allianceName: string | null; allianceTag: string | null; rank: number }>;
    },
    enabled: !!cityId,
    staleTime: 30_000,
  });
}

export function useActiveRallies(cityId: string | null) {
  return useQuery({
    queryKey: ["rallies", "active", cityId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/rally/active?cityId=${cityId}`);
      if (!res.ok) throw new Error("Failed to fetch rallies");
      return res.json() as Promise<{ rallies: any[] }>;
    },
    enabled: !!cityId,
    staleTime: 15_000,
    refetchInterval: 15_000,
  });
}

export function useCreateRally() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { cityId: string; targetCityId?: string; targetCampId?: string; minutesUntilLaunch: number }) => {
      const res = await fetch(`${API_BASE}/rally`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed to create rally"); }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rallies"] }),
  });
}

export function useJoinRally() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ rallyId, cityId, units }: { rallyId: string; cityId: string; units: { type: string; count: number }[] }) => {
      const res = await fetch(`${API_BASE}/rally/${rallyId}/join`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cityId, units }) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed to join rally"); }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rallies"] }),
  });
}

export function useCancelRally() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ rallyId, cityId }: { rallyId: string; cityId: string }) => {
      const res = await fetch(`${API_BASE}/rally/${rallyId}/cancel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cityId }) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed to cancel rally"); }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rallies"] }),
  });
}

export function useTutorialStep() {
  return useQuery({
    queryKey: ["tutorial", "step"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/tutorial/step`);
      if (!res.ok) return { step: 5 };
      return res.json() as Promise<{ step: number }>;
    },
    staleTime: Infinity,
  });
}

export function useConquestStatus(cityId: string | null) {
  return useQuery({
    queryKey: ["conquest-status", cityId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/conquest/status/${cityId}`);
      if (!res.ok) return { incoming: [], outgoing: [] };
      return res.json() as Promise<{ incoming: Array<{ attackerCityId: string; attackerCityName: string; wins: number; winsRequired: number }>; outgoing: Array<{ defenderCityId: string; defenderCityName: string; wins: number; winsRequired: number }> }>;
    },
    enabled: !!cityId,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
}
