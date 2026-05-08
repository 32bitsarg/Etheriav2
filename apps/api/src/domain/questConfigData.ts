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
];

export function getQuestConfigs() {
  return QUEST_CONFIGS.filter((quest) => quest.enabled).sort((a, b) => a.order - b.order);
}
