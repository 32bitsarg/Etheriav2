import dotenv from 'dotenv';
if (!process.env.NEXT_PUBLIC_MATECITO_URL) {
  dotenv.config({ path: '../../.env' });
}

import { createClient } from 'matecitodb';
import { postgresDb } from './postgresCompat.js';

const url = process.env.NEXT_PUBLIC_MATECITO_URL!;
const serviceKey = process.env.MATECITO_SERVICE_KEY!;
const usePostgres = process.env.DB_PROVIDER === 'postgres';

if (!usePostgres && (!url || !serviceKey)) {
  throw new Error('Missing matecito credentials. Check your .env file.');
}

export const db = usePostgres
  ? postgresDb as any
  : createClient({ url, apiKey: serviceKey, apiVersion: 'v2' });

// Collections
export const COLLECTIONS = {
  USERS: 'users',
  CITIES: 'cities',
  BUILDINGS: 'buildings',
  BUILDING_CONFIGS: 'building_configs',
  UNITS: 'units',
  UNIT_CONFIGS: 'unit_configs',
  BUILD_QUEUES: 'build_queues',
  TRAINING_QUEUES: 'training_queues',
  BATTLES: 'battles',
  BATTLE_REPORTS: 'battle_reports',
  TECH_CONFIGS: 'tech_configs',
  RESEARCH_QUEUES: 'research_queues',
  CITY_TECHS: 'city_techs',
  ALLIANCES: 'alliances',
  ALLIANCE_MEMBERS: 'alliance_members',
  CHAT_MESSAGES: 'chat_messages',
  MAIL_MESSAGES: 'mail_messages',
  ALLIANCE_DIPLOMACY: 'alliance_diplomacy',
  ALLIANCE_DIPLOMACY_EVENTS: 'alliance_diplomacy_events',
  ALLIANCE_EFFECTS: 'alliance_effects',
  ISLANDS: 'islands',
  ISLAND_SLOTS: 'island_slots',
  SESSIONS: 'sessions',
  WORLD_CONFIG: 'world_config',
  WORLD_SEASON_STATE: 'world_season_state',
  BARBARIAN_CAMPS: 'barbarian_camps',
  BARBARIAN_ARMIES: 'barbarian_armies',
  BARBARIAN_BATTLES: 'barbarian_battles',
  BARBARIAN_ATTACKS: 'barbarian_attacks',
  BARBARIAN_ATTACK_ALERTS: 'barbarian_attack_alerts',
  TRADE_CARAVANS: 'trade_caravans',
  GAME_REPORTS: 'game_reports',
  PLAYER_QUESTS: 'player_quests',
  MARKET_OFFERS: 'market_offers',
  ALLIANCE_OBJECTIVES: 'alliance_objectives',
  ALLIANCE_OBJECTIVE_CONTRIBUTIONS: 'alliance_objective_contributions',
  BOT_PLAYERS: 'bot_players',
  BOT_ACTION_LOGS: 'bot_action_logs',
  BOT_METRICS_SNAPSHOTS: 'bot_metrics_snapshots',
  BOT_MEMORIES: 'bot_memories',
  BOT_RELATIONSHIPS: 'bot_relationships',
} as const;
