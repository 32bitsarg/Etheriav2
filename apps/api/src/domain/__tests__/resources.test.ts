import { describe, expect, it } from "vitest";
import { addResources, calculateResources, canAfford, clampResources, subtractResources } from "../resources.js";

const base = { gold: 100, wood: 80, stone: 60, food: 40, gems: 5 };
const caps = { maxGold: 150, maxWood: 150, maxStone: 100, maxFood: 100 };

describe("resources", () => {
  it("accrues passive resources up to storage caps and keeps gems unchanged", () => {
    const result = calculateResources(
      base,
      { goldPerHour: 100, woodPerHour: 50, stonePerHour: 20, foodPerHour: 10 },
      caps,
      new Date("2026-05-08T00:00:00.000Z"),
      new Date("2026-05-08T01:00:00.000Z")
    );

    expect(result).toEqual({ gold: 150, wood: 130, stone: 80, food: 50, gems: 5 });
  });

  it("does not reduce resources when last update is ahead of now", () => {
    const result = calculateResources(
      base,
      { goldPerHour: 100, woodPerHour: 100, stonePerHour: 100, foodPerHour: 100 },
      caps,
      new Date("2026-05-08T02:00:00.000Z"),
      new Date("2026-05-08T01:00:00.000Z")
    );

    expect(result).toEqual(base);
  });

  it("checks affordability and applies resource arithmetic deterministically", () => {
    const cost = { gold: 50, wood: 20, stone: 10, food: 5, gems: 1 };

    expect(canAfford(base, cost)).toBe(true);
    expect(subtractResources(base, cost)).toEqual({ gold: 50, wood: 60, stone: 50, food: 35, gems: 4 });
    expect(addResources(base, cost)).toEqual({ gold: 150, wood: 100, stone: 70, food: 45, gems: 6 });
  });

  it("clamps resources between zero and storage caps", () => {
    expect(clampResources({ gold: -1, wood: 999, stone: -30, food: 150, gems: -2 }, caps)).toEqual({
      gold: 0,
      wood: 150,
      stone: 0,
      food: 100,
      gems: 0,
    });
  });
});
