import { z } from "zod";
import { TechBonusesSchema } from "./tech";

// ─── Resources ───
export const ResourcesSchema = z.object({
  gold: z.number().int().min(0).default(0),
  wood: z.number().int().min(0).default(0),
  stone: z.number().int().min(0).default(0),
  food: z.number().int().min(0).default(0),
  gems: z.number().int().min(0).default(0),
});

export type Resources = z.infer<typeof ResourcesSchema>;

// ─── Building Types ───
export const BuildingTypeSchema = z.enum([
  "TOWN_HALL",
  "GOLD_MINE",
  "LUMBER_MILL",
  "QUARRY",
  "FARM",
  "BARRACKS",
  "STABLE",
  "ALLIANCE_CENTER",
  "LIBRARY",
  "STORAGE",
  "TOWER",
  "MARKET",
]);

export type BuildingType = z.infer<typeof BuildingTypeSchema>;

export const BuildingSchema = z.object({
  id: z.string().uuid(),
  type: BuildingTypeSchema,
  level: z.number().int().min(1),
  positionX: z.number().int(),
  positionY: z.number().int(),
  cityId: z.string().uuid(),
  createdAt: z.string().datetime(),
  upgradedAt: z.string().datetime(),
});

export type Building = z.infer<typeof BuildingSchema>;

export const STARTER_BUILDING_LAYOUT = [
  { type: "TOWN_HALL", x: 10, y: 10 },
  { type: "BARRACKS", x: 2, y: 10 },
  { type: "FARM", x: 10, y: 2 },
  { type: "QUARRY", x: 2, y: 2 },
  { type: "GOLD_MINE", x: 18, y: 2 },
  { type: "STABLE", x: 16, y: 10 },
  { type: "ALLIANCE_CENTER", x: 2, y: 18 },
  { type: "LIBRARY", x: 10, y: 18 },
  { type: "STORAGE", x: 18, y: 18 },
  { type: "LUMBER_MILL", x: 2, y: 6 },
  { type: "MARKET", x: 16, y: 14 },
  { type: "TOWER", x: 22, y: 10 },
] as const satisfies ReadonlyArray<{ type: BuildingType; x: number; y: number }>;

// ─── Unit Types ───
export const UnitTypeSchema = z.enum([
  "WARRIOR",
  "ARCHER",
  "CAVALRY",
  "SIEGE",
  "SPY",
  "PIKEMAN",
  "CROSSBOWMAN",
  "CATAPULT",
]);

export type UnitType = z.infer<typeof UnitTypeSchema>;

export const UnitSchema = z.object({
  id: z.string().uuid(),
  type: UnitTypeSchema,
  count: z.number().int().min(0),
  cityId: z.string().uuid(),
});

export type Unit = z.infer<typeof UnitSchema>;

// ─── City Winter State ───
export const CityWinterStateSchema = z.object({
  cityId: z.string().uuid(),
  foodBalance: z.number(),
  starvationHours: z.number(),
  isStarving: z.boolean(),
  combatPenalty: z.number(),
  desertionLosses: z.record(UnitTypeSchema, z.number().int()),
});

export type CityWinterState = z.infer<typeof CityWinterStateSchema>;

// ─── City ───
export const CitySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(30),
  userId: z.string().uuid(),
  resources: ResourcesSchema,
  resourcesPerHour: ResourcesSchema,
  maxStorage: ResourcesSchema,
  buildings: z.array(BuildingSchema),
  units: z.array(UnitSchema),
  posX: z.number().int(),
  posY: z.number().int(),
  islandId: z.string().uuid().nullable().optional(),
  slotId: z.string().uuid().nullable().optional(),
  cityTechs: z.array(z.object({ techId: z.string(), level: z.number() })).optional(),
  techBonuses: TechBonusesSchema.optional(),
  winterState: CityWinterStateSchema.optional(),
  lastWinterEvaluatedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type City = z.infer<typeof CitySchema>;

// ─── World Map ───
export const WorldMapConfigSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  cameraMinZoom: z.number().positive(),
  cameraMaxZoom: z.number().positive(),
  cameraInitialZoom: z.number().positive(),
  backgroundAssetPath: z.string(),
  terrainSeed: z.number().int(),
  decorDensity: z.number().nonnegative(),
  decorSafeRadius: z.number().int().nonnegative(),
  terrainOverlayEnabled: z.boolean().optional(),
});

export type WorldMapConfig = z.infer<typeof WorldMapConfigSchema>;

export const WorldSpawnConfigSchema = z.object({
  strategy: z.literal("soft-clusters"),
  minCityDistance: z.number().int().positive(),
  clusterRadius: z.number().int().positive(),
  clusterTargetPlayers: z.number().int().positive(),
  clusterSearchStep: z.number().int().positive(),
  edgePadding: z.number().int().nonnegative(),
  maxPlacementAttempts: z.number().int().positive(),
});

export type WorldSpawnConfig = z.infer<typeof WorldSpawnConfigSchema>;

// ─── Build Queue ───
export const BuildQueueSchema = z.object({
  id: z.string().uuid(),
  cityId: z.string().uuid(),
  buildingId: z.string().uuid(),
  buildingType: BuildingTypeSchema,
  targetLevel: z.number().int(),
  startedAt: z.string().datetime(),
  completesAt: z.string().datetime(),
  isComplete: z.boolean().default(false),
});

export type BuildQueue = z.infer<typeof BuildQueueSchema>;

// ─── Training Queue ───
export const TrainingQueueSchema = z.object({
  id: z.string().uuid(),
  cityId: z.string().uuid(),
  unitType: UnitTypeSchema,
  count: z.number().int(),
  startedAt: z.string().datetime(),
  completesAt: z.string().datetime(),
  isComplete: z.boolean().default(false),
});

export type TrainingQueue = z.infer<typeof TrainingQueueSchema>;

export const ResearchQueueSchema = z.object({
  id: z.string().uuid(),
  cityId: z.string().uuid(),
  techId: z.string(),
  targetLevel: z.number().int().min(1),
  startedAt: z.string().datetime(),
  completesAt: z.string().datetime(),
  isComplete: z.boolean().default(false),
});

export type ResearchQueue = z.infer<typeof ResearchQueueSchema>;

export const ChatChannelSchema = z.enum(["GLOBAL", "ALLIANCE"]);

export type ChatChannel = z.infer<typeof ChatChannelSchema>;

export const AllianceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(32),
  tag: z.string().min(2).max(6),
  ownerUserId: z.string().uuid(),
  publicIntro: z.string().optional(),
  forumText: z.string().optional(),
  honorScore: z.number().int().optional(),
  treatiesSigned: z.number().int().optional(),
  treatiesBroken: z.number().int().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Alliance = z.infer<typeof AllianceSchema>;

export const AllianceMembershipSchema = z.object({
  id: z.string().uuid(),
  allianceId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["LEADER", "OFFICER", "DIPLOMAT", "MEMBER", "RECRUIT"]),
  createdAt: z.string().datetime(),
  alliance: AllianceSchema.optional(),
});

export type AllianceMembership = z.infer<typeof AllianceMembershipSchema>;

export const ChatMessageSchema = z.object({
  id: z.string().uuid(),
  channel: ChatChannelSchema,
  senderUserId: z.string().uuid(),
  senderName: z.string().min(1).max(40),
  message: z.string().min(1).max(280),
  allianceId: z.string().uuid().nullable().optional(),
  createdAt: z.string().datetime(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const CreateAllianceRequestSchema = z.object({
  name: z.string().min(2).max(32),
  tag: z.string().min(2).max(6),
});

export type CreateAllianceRequest = z.infer<typeof CreateAllianceRequestSchema>;

export const UpdateAllianceRequestSchema = z.object({
  publicIntro: z.string().trim().max(600).optional(),
  forumText: z.string().trim().max(2400).optional(),
});

export const ProposePeaceRequestSchema = z.object({
  targetAllianceId: z.string().uuid(),
  durationHours: z.number().int().min(1).max(168).default(24),
});

export const SendChatMessageRequestSchema = z.object({
  channel: ChatChannelSchema,
  message: z.string().trim().min(1).max(280),
});

export type SendChatMessageRequest = z.infer<typeof SendChatMessageRequestSchema>;

export const MailMessageSchema = z.object({
  id: z.string().uuid(),
  senderUserId: z.string().uuid(),
  senderName: z.string().min(1).max(40),
  recipientUserId: z.string().uuid(),
  recipientName: z.string().min(1).max(40),
  recipientCityId: z.string().uuid().nullable().optional(),
  recipientCityName: z.string().nullable().optional(),
  subject: z.string().min(1).max(80),
  body: z.string().min(1).max(1200),
  readAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
});

export type MailMessage = z.infer<typeof MailMessageSchema>;

export const SendMailMessageRequestSchema = z.object({
  recipientCityId: z.string().uuid(),
  subject: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(1200),
});

export type SendMailMessageRequest = z.infer<typeof SendMailMessageRequestSchema>;

// ─── Attack / Battle ───
export const BattleStatusSchema = z.enum([
  "MARCHING",
  "ONGOING",
  "VICTORY",
  "DEFEAT",
  "RETURNING",
]);

export type BattleStatus = z.infer<typeof BattleStatusSchema>;

export const BattleSchema = z.object({
  id: z.string().uuid(),
  attackerCityId: z.string().uuid(),
  defenderCityId: z.string().uuid(),
  units: z.array(
    z.object({
      type: UnitTypeSchema,
      count: z.number().int().min(1),
    })
  ),
  status: BattleStatusSchema,
  startedAt: z.string().datetime(),
  arrivesAt: z.string().datetime(),
  resolvedAt: z.string().datetime().optional(),
  returnsAt: z.string().datetime().optional(),
  loot: ResourcesSchema.optional(),
  result: z.object({
    victory: z.boolean(),
    attackerLosses: z.record(UnitTypeSchema, z.number().int()),
    defenderLosses: z.record(UnitTypeSchema, z.number().int()),
    attackerSurvivors: z.record(UnitTypeSchema, z.number().int()),
  }).optional(),
});

export type Battle = z.infer<typeof BattleSchema>;

// ─── Battle Report ───
export const BattleReportSchema = z.object({
  id: z.string().uuid(),
  battleId: z.string().uuid(),
  cityId: z.string().uuid(), // recipient city
  attackerCityId: z.string().uuid(),
  defenderCityId: z.string().uuid(),
  attackerName: z.string().optional(),
  defenderName: z.string().optional(),
  status: z.enum(["VICTORY", "DEFEAT"]), // from recipient's perspective
  attackerLosses: z.record(z.string(), z.number().int()),
  defenderLosses: z.record(z.string(), z.number().int()),
  loot: ResourcesSchema.optional(),
  read: z.boolean().default(false),
  createdAt: z.string().datetime(),
});

export type BattleReport = z.infer<typeof BattleReportSchema>;

// ─── API Contracts ───
export const CreateBuildingRequestSchema = z.object({
  type: BuildingTypeSchema,
  positionX: z.number().int().min(0).max(24),
  positionY: z.number().int().min(0).max(24),
});

export type CreateBuildingRequest = z.infer<typeof CreateBuildingRequestSchema>;

export const UpgradeBuildingRequestSchema = z.object({
  buildingId: z.string().uuid(),
});

export type UpgradeBuildingRequest = z.infer<typeof UpgradeBuildingRequestSchema>;

export const TrainUnitsRequestSchema = z.object({
  unitType: UnitTypeSchema,
  count: z.number().int().min(1).max(1000),
});

export type TrainUnitsRequest = z.infer<typeof TrainUnitsRequestSchema>;

export const AttackRequestSchema = z.object({
  targetCityId: z.string().uuid(),
  units: z.array(
    z.object({
      type: UnitTypeSchema,
      count: z.number().int().min(1),
    })
  ),
});

export type AttackRequest = z.infer<typeof AttackRequestSchema>;

export const SendResourcesRequestSchema = z.object({
  recipientCityId: z.string().uuid(),
  resources: ResourcesSchema,
});

export type SendResourcesRequest = z.infer<typeof SendResourcesRequestSchema>;

export const GameReportTypeSchema = z.enum([
  "BATTLE",
  "TRADE",
  "BARBARIAN",
  "SYSTEM",
  "ALLIANCE",
  "MARKET",
  "QUEST",
  "SPY_INTEL",
  "INCOMING_ATTACK",
  "SPY_DETECTED",
]);

export type GameReportType = z.infer<typeof GameReportTypeSchema>;

export const GameReportSchema = z.object({
  id: z.string().uuid(),
  type: GameReportTypeSchema,
  userId: z.string().uuid(),
  cityId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(120),
  summary: z.string().min(1).max(600),
  payload: z.record(z.any()).default({}),
  readAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
});

export type GameReport = z.infer<typeof GameReportSchema>;

export const QuestStatusSchema = z.enum(["ACTIVE", "CLAIMABLE", "CLAIMED"]);

export const PlayerQuestSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  cityId: z.string().uuid(),
  questId: z.string(),
  type: z.enum(["BUILD_OR_UPGRADE", "TRAIN_UNITS", "RESEARCH", "OPEN_MAP", "SEND_TRADE", "USE_ALLIANCE", "ATTACK_BARBARIAN"]),
  titleKey: z.string(),
  summaryKey: z.string(),
  target: z.number().int().positive(),
  progress: z.number().int().min(0),
  reward: ResourcesSchema,
  status: QuestStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  claimedAt: z.string().datetime().nullable().optional(),
});

export type PlayerQuest = z.infer<typeof PlayerQuestSchema>;

export const MarketOfferStatusSchema = z.enum(["OPEN", "ACCEPTED", "EXPIRED", "CANCELLED"]);

export const MarketOfferSchema = z.object({
  id: z.string().uuid(),
  creatorUserId: z.string().uuid(),
  creatorCityId: z.string().uuid(),
  giveResource: z.enum(["gold", "wood", "stone", "food"]),
  giveAmount: z.number().int().positive(),
  wantResource: z.enum(["gold", "wood", "stone", "food"]),
  wantAmount: z.number().int().positive(),
  feeRate: z.number().min(0).max(1),
  status: MarketOfferStatusSchema,
  acceptedByUserId: z.string().uuid().nullable().optional(),
  acceptedByCityId: z.string().uuid().nullable().optional(),
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  acceptedAt: z.string().datetime().nullable().optional(),
});

export type MarketOffer = z.infer<typeof MarketOfferSchema>;

export const CreateMarketOfferRequestSchema = z.object({
  cityId: z.string().uuid(),
  giveResource: z.enum(["gold", "wood", "stone", "food"]),
  giveAmount: z.number().int().positive(),
  wantResource: z.enum(["gold", "wood", "stone", "food"]),
  wantAmount: z.number().int().positive(),
});

export type CreateMarketOfferRequest = z.infer<typeof CreateMarketOfferRequestSchema>;

export const AcceptMarketOfferRequestSchema = z.object({
  cityId: z.string().uuid(),
});

export type AcceptMarketOfferRequest = z.infer<typeof AcceptMarketOfferRequestSchema>;

export const ScoutTargetRequestSchema = z.object({
  cityId: z.string().uuid(),
  targetType: z.enum(["CITY", "BARBARIAN_CAMP"]),
  targetId: z.string().uuid(),
});

export type ScoutTargetRequest = z.infer<typeof ScoutTargetRequestSchema>;

export const AllianceObjectiveSchema = z.object({
  id: z.string().uuid(),
  allianceId: z.string().uuid(),
  title: z.string(),
  summary: z.string(),
  target: ResourcesSchema,
  progress: ResourcesSchema,
  rewardEffect: z.object({
    type: z.string(),
    value: z.number(),
    durationHours: z.number().int().positive(),
  }),
  status: z.enum(["ACTIVE", "COMPLETED", "EXPIRED"]),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable().optional(),
});

export type AllianceObjective = z.infer<typeof AllianceObjectiveSchema>;

export const ContributeAllianceObjectiveRequestSchema = z.object({
  cityId: z.string().uuid(),
  resources: ResourcesSchema,
});

export type ContributeAllianceObjectiveRequest = z.infer<typeof ContributeAllianceObjectiveRequestSchema>;

export const WorldMovementSchema = z.object({
  id: z.string(),
  type: z.enum(["ATTACK", "BARBARIAN_ATTACK", "BARBARIAN_RAID", "TRADE"]),
  status: z.enum(["MARCHING", "RETURNING"]),
  from: z.object({
    x: z.number(),
    y: z.number(),
    name: z.string(),
  }),
  to: z.object({
    x: z.number(),
    y: z.number(),
    name: z.string(),
  }),
  startedAt: z.string().datetime(),
  arrivesAt: z.string().datetime(),
  resolvedAt: z.string().datetime().optional(),
  returnsAt: z.string().datetime().optional(),
});

export type WorldMovement = z.infer<typeof WorldMovementSchema>;

// Tech / Research re-exports
export * from "./tech";

// Season / World re-exports
export * from "./season";

// Barbarian re-exports
export * from "./barbarians";
