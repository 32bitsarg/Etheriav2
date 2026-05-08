import { prisma } from "@etheria/database";

type Filter = { key: string; value: unknown };

const MODEL_BY_COLLECTION: Record<string, string> = {
  users: "user",
  cities: "city",
  buildings: "building",
  units: "cityUnit",
  build_queues: "buildQueue",
  training_queues: "trainingQueue",
  battles: "battle",
  battle_reports: "battleReport",
  research_queues: "researchQueue",
  city_techs: "cityTech",
  alliances: "alliance",
  alliance_members: "allianceMember",
  chat_messages: "chatMessage",
  mail_messages: "mailMessage",
  alliance_diplomacy: "allianceDiplomacy",
  alliance_diplomacy_events: "allianceDiplomacyEvent",
  alliance_effects: "allianceEffect",
  world_season_state: "worldSeasonState",
  barbarian_camps: "barbarianCamp",
  barbarian_armies: "barbarianArmy",
  barbarian_battles: "barbarianBattle",
  barbarian_attacks: "barbarianAttack",
  barbarian_attack_alerts: "barbarianAttackAlert",
  trade_caravans: "tradeCaravan",
  game_reports: "gameReport",
  player_quests: "playerQuest",
  market_offers: "marketOffer",
  alliance_objectives: "allianceObjective",
  alliance_objective_contributions: "allianceObjectiveContribution",
  bot_players: "botPlayer",
  bot_action_logs: "botActionLog",
  bot_metrics_snapshots: "botMetricsSnapshot",
};

function modelFor(collection: string): any {
  const modelName = MODEL_BY_COLLECTION[collection];
  if (!modelName) throw new Error(`[postgres] Unsupported collection: ${collection}`);
  return (prisma as any)[modelName];
}

function toPrismaField(key: string) {
  if (key === "created_at") return "createdAt";
  if (key === "updated_at") return "updatedAt";
  return key;
}

function normalizeValue(value: unknown) {
  if (value instanceof Date) return value;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value);
  return value;
}

function buildWhere(filters: Filter[]) {
  return Object.fromEntries(filters.map((filter) => [toPrismaField(filter.key), normalizeValue(filter.value)]));
}

function normalizeRecord(record: any): any {
  if (!record || typeof record !== "object") return record;
  const normalized: Record<string, unknown> = { ...record };

  for (const [key, value] of Object.entries(normalized)) {
    if (value instanceof Date) normalized[key] = value.toISOString();
  }

  if (record.createdAt) normalized.created_at = record.createdAt instanceof Date ? record.createdAt.toISOString() : record.createdAt;
  if (record.updatedAt) normalized.updated_at = record.updatedAt instanceof Date ? record.updatedAt.toISOString() : record.updatedAt;
  normalized.collection = normalized.collection ?? null;
  normalized.expires_at = normalized.expires_at ?? null;
  normalized.deleted_at = normalized.deleted_at ?? null;
  normalized.search_vector = normalized.search_vector ?? null;

  return normalized;
}

function normalizeWriteData(data: Record<string, any>) {
  const normalized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    const prismaKey = toPrismaField(key);
    if (value === undefined) continue;
    if (value instanceof Date) {
      normalized[prismaKey] = value;
    } else if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      normalized[prismaKey] = new Date(value);
    } else {
      normalized[prismaKey] = value;
    }
  }
  return normalized;
}

class PostgresQueryBuilder {
  private filters: Filter[] = [];
  private take = 50;
  private mode: "select" | "merge" | "delete" = "select";
  private patch: Record<string, any> = {};

  constructor(private readonly collection: string) {}

  eq(key: string, value: unknown) {
    this.filters.push({ key, value });
    return this;
  }

  limit(count: number) {
    this.take = Math.max(1, Math.min(5000, count));
    return this;
  }

  merge(patch: Record<string, any>) {
    this.mode = "merge";
    this.patch = patch;
    return this;
  }

  delete() {
    this.mode = "delete";
    return this;
  }

  async get() {
    try {
      const model = modelFor(this.collection);
      const rows = await model.findMany({
        where: buildWhere(this.filters),
        take: this.take,
        orderBy: this.collection === "chat_messages" || this.collection === "mail_messages" ? { createdAt: "desc" } : undefined,
      });
      return { data: rows.map(normalizeRecord), error: null };
    } catch (error) {
      return { data: [], error };
    }
  }

  async getFirst() {
    try {
      const model = modelFor(this.collection);
      const row = await model.findFirst({ where: buildWhere(this.filters) });
      return { data: normalizeRecord(row), error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async execute() {
    try {
      const model = modelFor(this.collection);
      const where = buildWhere(this.filters);

      if (this.mode === "delete") {
        const result = await model.deleteMany({ where });
        return { ok: true, count: result.count, error: null };
      }

      if (this.mode === "merge") {
        await model.updateMany({ where, data: normalizeWriteData(this.patch) });
        const rows = await model.findMany({ where, take: this.take });
        return { data: rows.map(normalizeRecord), error: null };
      }

      return this.get();
    } catch (error) {
      return { data: null, ok: false, error };
    }
  }
}

export const postgresCompatDb = {
  from(collection: string) {
    return new PostgresQueryBuilder(collection);
  },

  async insert(collection: string, data: Record<string, any>) {
    const model = modelFor(collection);
    const row = await model.create({ data: normalizeWriteData(data) });
    return { data: normalizeRecord(row), error: null };
  },
};

export function createPostgresCollectionClient(collection: string) {
  return {
    eq(key: string, value: unknown) {
      return new PostgresQueryBuilder(collection).eq(key, value);
    },
    limit(count: number) {
      return new PostgresQueryBuilder(collection).limit(count);
    },
    get() {
      return new PostgresQueryBuilder(collection).get();
    },
    getFirst() {
      return new PostgresQueryBuilder(collection).getFirst();
    },
    insert(data: Record<string, any>) {
      return postgresCompatDb.insert(collection, data);
    },
  };
}

export const postgresDb = {
  from(collection: string) {
    return createPostgresCollectionClient(collection);
  },
};
