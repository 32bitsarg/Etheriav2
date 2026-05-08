import { db, COLLECTIONS } from "./matecito.js";

type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
type RecordLike = Record<string, any>;

type SelectorField = string;

const RECORD_SELECTORS: Partial<Record<CollectionName, SelectorField[]>> = {
  [COLLECTIONS.CITIES]: ["created_at", "userId", "posX", "posY"],
  [COLLECTIONS.BUILDINGS]: ["created_at", "cityId", "type", "positionX", "positionY"],
  [COLLECTIONS.BUILD_QUEUES]: ["created_at", "cityId", "buildingType", "buildingId", "startedAt"],
  [COLLECTIONS.TRAINING_QUEUES]: ["created_at", "cityId", "unitType", "startedAt"],
  [COLLECTIONS.UNITS]: ["created_at", "cityId", "type"],
  [COLLECTIONS.BATTLES]: ["created_at", "attackerCityId", "defenderCityId", "startedAt"],
  [COLLECTIONS.BATTLE_REPORTS]: ["created_at", "cityId", "battleId"],
  [COLLECTIONS.RESEARCH_QUEUES]: ["created_at", "cityId", "techId", "startedAt"],
  [COLLECTIONS.CITY_TECHS]: ["created_at", "cityId", "techId"],
  [COLLECTIONS.USERS]: ["created_at", "email"],
  [COLLECTIONS.ALLIANCES]: ["created_at", "name"],
  [COLLECTIONS.ALLIANCE_MEMBERS]: ["created_at", "userId", "allianceId"],
  [COLLECTIONS.CHAT_MESSAGES]: ["created_at", "channel", "userId"],
  [COLLECTIONS.BOT_PLAYERS]: ["id", "createdAt", "userId", "cityId"],
  [COLLECTIONS.BOT_ACTION_LOGS]: ["id", "createdAt", "botId", "cityId", "actionType"],
  [COLLECTIONS.BOT_METRICS_SNAPSHOTS]: ["id", "createdAt", "windowEndedAt"],
};

const USE_POSTGRES = process.env.DB_PROVIDER === "postgres";

function getSelectorFields(collection: CollectionName, record: RecordLike): SelectorField[] {
  // PostgreSQL has real primary keys — use "id" as the universal selector
  if (USE_POSTGRES) {
    if (record.id) return ["id"];
    throw new Error(`[matecitoRecord] Record for "${collection}" is missing "id" field`);
  }

  // MatecitoDB requires explicit selector configuration
  const configured = RECORD_SELECTORS[collection];
  if (!configured || configured.length === 0) {
    throw new Error(`[matecitoRecord] No selector configured for collection "${collection}"`);
  }

  const available = configured.filter((field) => record[field] !== undefined && record[field] !== null);
  if (available.length === 0) {
    throw new Error(`[matecitoRecord] Record for "${collection}" is missing selector fields`);
  }

  return available;
}

function buildQuery(collection: CollectionName, record: RecordLike) {
  let query = db.from(collection);
  for (const field of getSelectorFields(collection, record)) {
    query = query.eq(field, record[field]);
  }
  return query;
}

export async function mergeRecordBySelector(
  collection: CollectionName,
  record: RecordLike,
  patch: RecordLike
) {
  return buildQuery(collection, record).merge(patch).execute();
}

export async function deleteRecordBySelector(collection: CollectionName, record: RecordLike) {
  return buildQuery(collection, record).delete().execute();
}

export async function getRecordByLogicalId(collection: CollectionName, id: string) {
  return db.from(collection).eq("id", id).getFirst() as any;
}

export async function mergeRecordByLogicalId(
  collection: CollectionName,
  id: string,
  patch: RecordLike
) {
  // PostgreSQL: merge directly by id without fetching the record first
  if (USE_POSTGRES) {
    return db.from(collection).eq("id", id).merge(patch).execute() as any;
  }

  // MatecitoDB: fetch record to get selector fields, then merge
  const recordRes = await getRecordByLogicalId(collection, id);
  const record = recordRes?.data ?? null;
  if (!record) return { data: null, error: { message: "Record not found" } };
  return mergeRecordBySelector(collection, record, patch);
}

export async function deleteRecordByLogicalId(collection: CollectionName, id: string) {
  // PostgreSQL: delete directly by id
  if (USE_POSTGRES) {
    return db.from(collection).eq("id", id).delete().execute() as any;
  }

  // MatecitoDB: fetch record to get selector fields, then delete
  const recordRes = await getRecordByLogicalId(collection, id);
  const record = recordRes?.data ?? null;
  if (!record) return { ok: false, error: { message: "Record not found" } };
  return deleteRecordBySelector(collection, record);
}
