import type { Resources } from "@etheria/shared";

export type QuestConfig = {
  questId: string;
  type: "BUILD_OR_UPGRADE" | "TRAIN_UNITS" | "RESEARCH" | "OPEN_MAP" | "SEND_TRADE" | "USE_ALLIANCE" | "ATTACK_BARBARIAN";
  titleKey: string;
  summaryKey: string;
  target: number;
  reward: Resources;
  order: number;
  enabled: boolean;
};

export const QUEST_CONFIGS: QuestConfig[] = [
  { questId: "upgrade_building", type: "BUILD_OR_UPGRADE", titleKey: "play.quests.upgrade.title", summaryKey: "play.quests.upgrade.summary", target: 1, reward: { gold: 80, wood: 120, stone: 80, food: 60, gems: 0 }, order: 10, enabled: true },
  { questId: "train_units", type: "TRAIN_UNITS", titleKey: "play.quests.train.title", summaryKey: "play.quests.train.summary", target: 5, reward: { gold: 60, wood: 60, stone: 40, food: 120, gems: 0 }, order: 20, enabled: true },
  { questId: "research_tech", type: "RESEARCH", titleKey: "play.quests.research.title", summaryKey: "play.quests.research.summary", target: 1, reward: { gold: 120, wood: 80, stone: 80, food: 80, gems: 0 }, order: 30, enabled: true },
  { questId: "open_map", type: "OPEN_MAP", titleKey: "play.quests.map.title", summaryKey: "play.quests.map.summary", target: 1, reward: { gold: 40, wood: 40, stone: 40, food: 40, gems: 0 }, order: 40, enabled: true },
  { questId: "send_trade", type: "SEND_TRADE", titleKey: "play.quests.trade.title", summaryKey: "play.quests.trade.summary", target: 1, reward: { gold: 100, wood: 100, stone: 100, food: 100, gems: 0 }, order: 50, enabled: true },
  { questId: "use_alliance", type: "USE_ALLIANCE", titleKey: "play.quests.alliance.title", summaryKey: "play.quests.alliance.summary", target: 1, reward: { gold: 80, wood: 80, stone: 80, food: 80, gems: 0 }, order: 60, enabled: true },
  { questId: "attack_barbarian", type: "ATTACK_BARBARIAN", titleKey: "play.quests.barbarian.title", summaryKey: "play.quests.barbarian.summary", target: 1, reward: { gold: 150, wood: 120, stone: 120, food: 150, gems: 0 }, order: 70, enabled: true },

  // Lore quests — narrative missions tied to LORES.md world
  { questId: "lore_first_winter", type: "BUILD_OR_UPGRADE", titleKey: "play.quests.lore.firstWinter.title", summaryKey: "play.quests.lore.firstWinter.summary", target: 3, reward: { gold: 0, wood: 0, stone: 0, food: 0, gems: 200 }, order: 100, enabled: true },
  { questId: "lore_barbarian_leader", type: "ATTACK_BARBARIAN", titleKey: "play.quests.lore.barbarianLeader.title", summaryKey: "play.quests.lore.barbarianLeader.summary", target: 5, reward: { gold: 300, wood: 300, stone: 0, food: 0, gems: 0 }, order: 110, enabled: true },
  { questId: "lore_alliance_oath", type: "USE_ALLIANCE", titleKey: "play.quests.lore.allianceOath.title", summaryKey: "play.quests.lore.allianceOath.summary", target: 1, reward: { gold: 0, wood: 0, stone: 0, food: 0, gems: 150 }, order: 120, enabled: true },
  { questId: "lore_market_deal", type: "SEND_TRADE", titleKey: "play.quests.lore.marketDeal.title", summaryKey: "play.quests.lore.marketDeal.summary", target: 3, reward: { gold: 400, wood: 400, stone: 0, food: 0, gems: 0 }, order: 130, enabled: true },
  { questId: "lore_wonder_gaze", type: "ATTACK_BARBARIAN", titleKey: "play.quests.lore.wonderGaze.title", summaryKey: "play.quests.lore.wonderGaze.summary", target: 1, reward: { gold: 500, wood: 0, stone: 500, food: 0, gems: 0 }, order: 140, enabled: true },
];

export function getQuestConfigs() {
  return QUEST_CONFIGS.filter((quest) => quest.enabled).sort((a, b) => a.order - b.order);
}
