import { z } from "zod";

// ─── Season Types ───

export const SeasonSchema = z.enum(["SPRING", "SUMMER", "AUTUMN", "WINTER"]);
export type Season = z.infer<typeof SeasonSchema>;

export const SeasonPhaseSchema = z.enum(["START", "PEAK", "TRANSITION"]);
export type SeasonPhase = z.infer<typeof SeasonPhaseSchema>;

export const PhaseCurveSchema = z.enum(["LINEAR", "SMOOTH", "HARSH"]);
export type PhaseCurve = z.infer<typeof PhaseCurveSchema>;

// ─── World Season State ───

export const WorldSeasonStateSchema = z.object({
  id: z.string().uuid(),
  worldId: z.string().optional(),
  currentSeason: SeasonSchema,
  nextSeason: SeasonSchema,
  phase: SeasonPhaseSchema,
  intensity: z.number().min(0).max(1).default(0),
  startedAt: z.string().datetime(),
  peakAt: z.string().datetime(),
  transitionAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type WorldSeasonState = z.infer<typeof WorldSeasonStateSchema>;

// ─── World Zone ───

export const WorldZoneSchema = z.object({
  id: z.string(),
  name: z.string(),
  terrainTags: z.array(z.string()),
  seasonIntensity: z.record(SeasonSchema, z.number()),
  resourceModifiers: z.record(z.string(), z.number()).optional(),
  travelModifiers: z.record(SeasonSchema, z.number()).optional(),
  barbarianSpawnModifier: z.number().optional(),
});

export type WorldZone = z.infer<typeof WorldZoneSchema>;

// ─── World State Response ───

export const WorldZoneSnapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  currentIntensity: z.number(),
  terrainTags: z.array(z.string()),
});

export type WorldZoneSnapshot = z.infer<typeof WorldZoneSnapshotSchema>;

export const WorldStateResponseSchema = z.object({
  season: WorldSeasonStateSchema,
  zones: z.array(WorldZoneSnapshotSchema),
  barbarianCamps: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    level: z.number().int().min(1).max(10),
    archetype: z.enum(["RAIDERS", "HUNTERS", "MARAUDERS", "WARHOST", "NOMADS"]),
    posX: z.number().int(),
    posY: z.number().int(),
    status: z.enum(["ACTIVE", "DEFEATED", "DESPAWNING"]),
    estimatedPower: z.number().int().min(0),
  })).default([]),
});

export type WorldStateResponse = z.infer<typeof WorldStateResponseSchema>;

// ─── Season Config ───

export const SeasonConfigSchema = z.object({
  serverSpeed: z.number().positive().default(1),
  seasonDurationHours: z.number().positive().default(336),
  transitionDurationHours: z.number().positive().default(48),
  phaseCurve: PhaseCurveSchema.default("SMOOTH"),
  enabled: z.boolean().default(true),
});

export type SeasonConfig = z.infer<typeof SeasonConfigSchema>;
