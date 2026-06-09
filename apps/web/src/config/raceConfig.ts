export type RaceId = "HUMAN" | "ELF" | "ORC" | "DWARF";

export interface RaceInfo {
  id: RaceId;
  icon: string;
  nameKey: string;
  descriptionKey: string;
  color: string;
  bonuses: { labelKey: string; value: string }[];
}

export const RACE_INFO: Record<RaceId, RaceInfo> = {
  HUMAN: {
    id: "HUMAN",
    icon: "👑",
    nameKey: "race.human.name",
    descriptionKey: "race.human.description",
    color: "#f5a623",
    bonuses: [
      { labelKey: "race.bonus.goldProduction", value: "+12%" },
      { labelKey: "race.bonus.foodProduction", value: "+8%" },
      { labelKey: "race.bonus.defense", value: "+5%" },
      { labelKey: "race.bonus.extraWarriors", value: "+5" },
      { labelKey: "race.bonus.marketLevel", value: "+1" },
      { labelKey: "race.bonus.startingGold", value: "+400" },
    ],
  },
  ELF: {
    id: "ELF",
    icon: "🏹",
    nameKey: "race.elf.name",
    descriptionKey: "race.elf.description",
    color: "#4cd964",
    bonuses: [
      { labelKey: "race.bonus.woodProduction", value: "+15%" },
      { labelKey: "race.bonus.foodProduction", value: "+10%" },
      { labelKey: "race.bonus.attack", value: "+8%" },
      { labelKey: "race.bonus.extraArchers", value: "+5" },
      { labelKey: "race.bonus.lumberMillLevel", value: "+1" },
      { labelKey: "race.bonus.startingWood", value: "+400" },
    ],
  },
  ORC: {
    id: "ORC",
    icon: "💀",
    nameKey: "race.orc.name",
    descriptionKey: "race.orc.description",
    color: "#e74c3c",
    bonuses: [
      { labelKey: "race.bonus.stoneProduction", value: "+15%" },
      { labelKey: "race.bonus.attack", value: "+10%" },
      { labelKey: "race.bonus.hp", value: "+10%" },
      { labelKey: "race.bonus.extraWarriors", value: "+8" },
      { labelKey: "race.bonus.barracksLevel", value: "+1" },
      { labelKey: "race.bonus.startingStone", value: "+400" },
    ],
  },
  DWARF: {
    id: "DWARF",
    icon: "⚒️",
    nameKey: "race.dwarf.name",
    descriptionKey: "race.dwarf.description",
    color: "#4a90d9",
    bonuses: [
      { labelKey: "race.bonus.goldProduction", value: "+12%" },
      { labelKey: "race.bonus.stoneProduction", value: "+10%" },
      { labelKey: "race.bonus.defense", value: "+15%" },
      { labelKey: "race.bonus.extraSiege", value: "+2" },
      { labelKey: "race.bonus.goldMineLevel", value: "+1" },
      { labelKey: "race.bonus.towerLevel", value: "+1" },
    ],
  },
};
