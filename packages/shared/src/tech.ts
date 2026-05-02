import { z } from "zod";

export const TechCategorySchema = z.enum([
  "ECONOMY",
  "MILITARY",
  "DEFENSE",
]);

export type TechCategory = z.infer<typeof TechCategorySchema>;

export const TechTypeSchema = z.enum([
  "COLLECTION_EFFICIENT_I",
  "COLLECTION_EFFICIENT_II",
  "COLLECTION_EFFICIENT_III",
  "ADVANCED_STORAGE",
  "WARTIME_ECONOMY",
  "TRADE",
  "WEAPON_FORGE_I",
  "WEAPON_FORGE_II",
  "REINFORCED_BOWS",
  "HORSE_BREEDING",
  "HEAVY_CAVALRY",
  "SIEGE_ENGINEERING",
  "BALLISTICS",
  "GUERRILLA_TACTICS",
  "MASONRY",
  "STONE_WALLS",
  "WATCHTOWER",
  "POISONED_ARROWS",
  "FORTIFICATIONS",
  "SPY_NETWORK",
  "SPEC_SIEGE",
  "SPEC_CAVALRY",
]);

export type TechType = z.infer<typeof TechTypeSchema>;

export const TechEffectSchema = z.object({
  type: z.enum(["UNIT_STAT", "BUILDING_STAT", "RESOURCE_PROD", "UNLOCK_UNIT", "UNLOCK_BUILDING", "GLOBAL_BONUS"]),
  target: z.string(),
  stat: z.string(),
  value: z.number(),
  operation: z.enum(["ADD", "MULTIPLY"]),
});

export type TechEffect = z.infer<typeof TechEffectSchema>;

export const TechConfigSchema = z.object({
  id: z.string().uuid(),
  techId: TechTypeSchema,
  name: z.string(),
  description: z.string(),
  category: TechCategorySchema,
  maxLevel: z.number().int().min(1),
  costGold: z.number().int().min(0),
  costWood: z.number().int().min(0),
  costStone: z.number().int().min(0),
  costFood: z.number().int().min(0),
  researchTimeSeconds: z.number().int().min(1),
  prerequisites: z.array(TechTypeSchema),
  mutuallyExclusive: z.array(TechTypeSchema),
  effects: z.array(TechEffectSchema),
});

export type TechConfig = z.infer<typeof TechConfigSchema>;

export const CityTechSchema = z.object({
  id: z.string().uuid(),
  cityId: z.string().uuid(),
  techId: TechTypeSchema,
  level: z.number().int().min(1),
  unlockedAt: z.string().datetime(),
});

export type CityTech = z.infer<typeof CityTechSchema>;

export const ResearchQueueSchema = z.object({
  id: z.string().uuid(),
  cityId: z.string().uuid(),
  techId: TechTypeSchema,
  targetLevel: z.number().int().min(1),
  startedAt: z.string().datetime(),
  completesAt: z.string().datetime(),
  isComplete: z.boolean().default(false),
});

export type ResearchQueue = z.infer<typeof ResearchQueueSchema>;

export const TechBonusesSchema = z.object({
  unitAttackBonus: z.record(z.string(), z.number()).default({}),
  unitHpBonus: z.record(z.string(), z.number()).default({}),
  unitDefenseBonus: z.record(z.string(), z.number()).default({}),
  unitSpeedBonus: z.record(z.string(), z.number()).default({}),
  unitApBonus: z.record(z.string(), z.number()).default({}),
  resourceProdBonus: z.record(z.string(), z.number()).default({}),
  trainingCostReduction: z.number().default(0),
  wallBonusMultiplier: z.number().default(1),
  towerDamageBonus: z.number().default(0),
});

export type TechBonuses = z.infer<typeof TechBonusesSchema>;

export const StartResearchRequestSchema = z.object({
  techId: TechTypeSchema,
});

export type StartResearchRequest = z.infer<typeof StartResearchRequestSchema>;
