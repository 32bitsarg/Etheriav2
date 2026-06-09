import type { BuildingType, UnitType } from "@etheria/shared";

export type RaceId = "HUMAN" | "ELF" | "ORC" | "DWARF";

export interface RaceConfig {
  id: RaceId;
  name: string;
  description: string;
  bonuses: {
    startingResources: { gold: number; wood: number; stone: number; food: number };
    extraUnits: { type: UnitType; count: number }[];
    extraBuildings: { type: BuildingType; level: number }[];
    productionBonus: { gold: number; wood: number; stone: number; food: number };
    unitBonus: { attack: number; defense: number; hp: number };
  };
}

export const RACES: Record<RaceId, RaceConfig> = {
  HUMAN: {
    id: "HUMAN",
    name: "Humanos",
    description:
      "Versátiles y diplomáticos. Los humanos se adaptan a cualquier terreno y reciben bonificaciones equilibradas en producción y comercio.",
    bonuses: {
      startingResources: { gold: 400, wood: 100, stone: 100, food: 0 },
      extraUnits: [{ type: "WARRIOR", count: 5 }],
      extraBuildings: [
        { type: "MARKET", level: 2 },
        { type: "FARM", level: 2 },
      ],
      productionBonus: { gold: 1.12, wood: 1.0, stone: 1.0, food: 1.08 },
      unitBonus: { attack: 1.0, defense: 1.05, hp: 1.0 },
    },
  },
  ELF: {
    id: "ELF",
    name: "Elfos",
    description:
      "Maestros del bosque y el arco. Los elfos producen más madera y comida, y sus arqueros son letales.",
    bonuses: {
      startingResources: { gold: 100, wood: 400, stone: 50, food: 200 },
      extraUnits: [{ type: "ARCHER", count: 5 }],
      extraBuildings: [
        { type: "LUMBER_MILL", level: 2 },
        { type: "LIBRARY", level: 2 },
      ],
      productionBonus: { gold: 1.0, wood: 1.15, stone: 0.95, food: 1.10 },
      unitBonus: { attack: 1.08, defense: 0.95, hp: 0.95 },
    },
  },
  ORC: {
    id: "ORC",
    name: "Orcos",
    description:
      "Brutales guerreros nacidos para la batalla. Los orcos producen más piedra y sus unidades son más resistentes.",
    bonuses: {
      startingResources: { gold: 200, wood: 50, stone: 400, food: 100 },
      extraUnits: [{ type: "WARRIOR", count: 8 }],
      extraBuildings: [
        { type: "BARRACKS", level: 2 },
        { type: "QUARRY", level: 2 },
      ],
      productionBonus: { gold: 1.0, wood: 0.95, stone: 1.15, food: 0.92 },
      unitBonus: { attack: 1.10, defense: 1.0, hp: 1.10 },
    },
  },
  DWARF: {
    id: "DWARF",
    name: "Enanos",
    description:
      "Forjadores insuperables. Los enanos extraen oro y piedra más rápido, y sus defensas son impenetrables.",
    bonuses: {
      startingResources: { gold: 300, wood: 0, stone: 300, food: 150 },
      extraUnits: [{ type: "SIEGE", count: 2 }],
      extraBuildings: [
        { type: "GOLD_MINE", level: 2 },
        { type: "TOWER", level: 2 },
      ],
      productionBonus: { gold: 1.12, wood: 0.92, stone: 1.10, food: 1.0 },
      unitBonus: { attack: 0.95, defense: 1.15, hp: 1.05 },
    },
  },
};
