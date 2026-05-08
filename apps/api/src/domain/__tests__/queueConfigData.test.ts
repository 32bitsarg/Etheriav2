import { afterEach, describe, expect, it } from "vitest";
import { getCityQueueConfig } from "../queueConfigData.js";

const ENV_KEYS = [
  "CITY_QUEUE_CONSTRUCTION_MAX_SLOTS",
  "CITY_QUEUE_TRAINING_MAX_SLOTS",
  "CITY_QUEUE_RESEARCH_MAX_SLOTS",
  "CITY_QUEUE_CONSTRUCTION_ACTIVE_SLOTS",
  "CITY_QUEUE_TRAINING_ACTIVE_SLOTS",
  "CITY_QUEUE_RESEARCH_ACTIVE_SLOTS",
] as const;

afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
});

describe("getCityQueueConfig", () => {
  it("uses default sequential queue limits", () => {
    expect(getCityQueueConfig()).toEqual({
      maxSlots: { construction: 3, training: 3, research: 3 },
      activeSlots: { construction: 1, training: 1, research: 1 },
    });
  });

  it("floors configured values and keeps a minimum of one slot", () => {
    process.env.CITY_QUEUE_CONSTRUCTION_MAX_SLOTS = "4.8";
    process.env.CITY_QUEUE_TRAINING_MAX_SLOTS = "0";
    process.env.CITY_QUEUE_RESEARCH_MAX_SLOTS = "bad";

    expect(getCityQueueConfig().maxSlots).toEqual({ construction: 4, training: 1, research: 3 });
  });

  it("caps active slots to max slots so env mistakes cannot over-enable concurrency", () => {
    process.env.CITY_QUEUE_CONSTRUCTION_MAX_SLOTS = "2";
    process.env.CITY_QUEUE_CONSTRUCTION_ACTIVE_SLOTS = "9";
    process.env.CITY_QUEUE_TRAINING_MAX_SLOTS = "1";
    process.env.CITY_QUEUE_TRAINING_ACTIVE_SLOTS = "3";

    const config = getCityQueueConfig();

    expect(config.activeSlots.construction).toBe(2);
    expect(config.activeSlots.training).toBe(1);
  });
});
