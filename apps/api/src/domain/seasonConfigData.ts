import type { SeasonConfig, PhaseCurve, Season } from "@etheria/shared";

export type SeasonDurationEntry = {
  serverSpeed: number;
  seasonDurationHours: number;
  transitionDurationHours: number;
};

export const SEASON_DURATION_PRESETS: SeasonDurationEntry[] = [
  { serverSpeed: 1, seasonDurationHours: 336, transitionDurationHours: 48 },   // ~5 semanas
  { serverSpeed: 3, seasonDurationHours: 240, transitionDurationHours: 36 },   // ~10 dias
  { serverSpeed: 5, seasonDurationHours: 120, transitionDurationHours: 24 },   // ~5 dias
  { serverSpeed: 10, seasonDurationHours: 48, transitionDurationHours: 12 },   // ~2 dias
];

export const SEASON_RESOURCE_MODIFIERS: Record<Season, Record<string, number>> = {
  SPRING: { food: 0.10 },
  SUMMER: { gold: 0.05, wood: 0.05, stone: 0.05, food: 0.05 },
  AUTUMN: { food: 0.15 },
  WINTER: { food: -0.15, wood: -0.05 },
};

export const LOCAL_SEASON_CONFIG: SeasonConfig & {
  phaseDurations: {
    startHours: number;
    peakHours: number;
    transitionHours: number;
  };
  resourceModifiers: Record<Season, Record<string, number>>;
} = {
  serverSpeed: Number(process.env.SERVER_SPEED ?? "1"),
  seasonDurationHours: 336,
  transitionDurationHours: 48,
  phaseCurve: "SMOOTH" as PhaseCurve,
  enabled: process.env.SEASONS_ENABLED !== "false",
  phaseDurations: {
    startHours: 48,
    peakHours: 240,
    transitionHours: 48,
  },
  resourceModifiers: SEASON_RESOURCE_MODIFIERS,
};

export function getSeasonDurationHours(): number {
  const speed = LOCAL_SEASON_CONFIG.serverSpeed;
  const preset = SEASON_DURATION_PRESETS.find((p) => p.serverSpeed === speed);
  return preset?.seasonDurationHours ?? LOCAL_SEASON_CONFIG.seasonDurationHours;
}

export function getTransitionDurationHours(): number {
  const speed = LOCAL_SEASON_CONFIG.serverSpeed;
  const preset = SEASON_DURATION_PRESETS.find((p) => p.serverSpeed === speed);
  return preset?.transitionDurationHours ?? LOCAL_SEASON_CONFIG.transitionDurationHours;
}
