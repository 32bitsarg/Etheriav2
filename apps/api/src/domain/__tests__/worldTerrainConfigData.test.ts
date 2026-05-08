import { describe, expect, it } from "vitest";
import {
  calculatePathSpeedMultiplier,
  findNearestBuildablePoint,
  isBuildableTerrain,
  resolveTerrainAt,
  worldToNormalized,
} from "../worldTerrainConfigData.js";

const size = { width: 1000, height: 800 };

describe("world terrain config", () => {
  it("converts centered world coordinates to normalized map coordinates", () => {
    expect(worldToNormalized(0, 0, size.width, size.height)).toEqual({ x: 0.5, y: 0.5 });
    expect(worldToNormalized(-500, -400, size.width, size.height)).toEqual({ x: 0, y: 0 });
    expect(worldToNormalized(500, 400, size.width, size.height)).toEqual({ x: 1, y: 1 });
  });

  it("marks local mountain and water zones as blocked when no editor mask overrides them", () => {
    expect(resolveTerrainAt(0, -360, size.width, size.height).kind).toBe("MOUNTAIN");
    expect(isBuildableTerrain(430, 0, size.width, size.height)).toBe(false);
  });

  it("finds a nearby buildable point when the requested point is blocked", () => {
    const point = findNearestBuildablePoint(430, 0, size.width, size.height);

    expect(isBuildableTerrain(point.x, point.y, size.width, size.height)).toBe(true);
  });

  it("keeps path speed multipliers bounded for terrain-aware travel", () => {
    const multiplier = calculatePathSpeedMultiplier(-250, 0, 250, 0, size.width, size.height);

    expect(multiplier).toBeGreaterThanOrEqual(0.15);
    expect(multiplier).toBeLessThanOrEqual(1.4);
  });
});
