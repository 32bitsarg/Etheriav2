"use client";

import { useEffect } from "react";
import { useCity } from "@/hooks/useCity";
import { useGameStore } from "@/stores/gameStore";

function mapCityToStore(cityData: any) {
  const buildQueues = Array.isArray(cityData.buildQueues)
    ? [...cityData.buildQueues]
        .sort((a: any, b: any) => {
          const completesDiff = new Date(a.completesAt ?? 0).getTime() - new Date(b.completesAt ?? 0).getTime();
          if (completesDiff !== 0) return completesDiff;
          return new Date(a.startedAt ?? 0).getTime() - new Date(b.startedAt ?? 0).getTime();
        })
        .reduce((acc: any[], queue: any) => {
          const existing = acc.find((item) => item.buildingId === queue.buildingId);
          if (!existing) acc.push(queue);
          return acc;
        }, [])
    : [];

  return {
    cityId: cityData.id,
    name: cityData.name,
    resources: cityData.resources ?? { gold: 0, wood: 0, stone: 0, food: 0, gems: 0 },
    production: {
      goldPerHour: cityData.production?.goldPerHour ?? cityData.goldPerHour ?? 0,
      woodPerHour: cityData.production?.woodPerHour ?? cityData.woodPerHour ?? 0,
      stonePerHour: cityData.production?.stonePerHour ?? cityData.stonePerHour ?? 0,
      foodPerHour: cityData.production?.foodPerHour ?? cityData.foodPerHour ?? 0,
    },
    storage: cityData.storage ?? { maxGold: 1000, maxWood: 1000, maxStone: 500, maxFood: 500 },
    buildings: cityData.buildings ?? [],
    units: cityData.units ?? [],
    buildQueues,
    trainingQueues: cityData.trainingQueues ?? [],
    cityTechs: cityData.cityTechs ?? [],
    researchQueue: cityData.researchQueue ?? [],
    activeResearch: cityData.activeResearch ?? null,
    allianceMembership: cityData.allianceMembership ?? null,
    techBonuses: cityData.techBonuses ?? {},
    lastResourceUpdate: cityData.lastResourceUpdate ?? null,
    posX: cityData.posX ?? 0,
    posY: cityData.posY ?? 0,
  };
}

/**
 * CityDataSync — keeps the game store in sync with the city polling hook.
 *
 * useCity(cityId) polls adaptively (every 1-20s) based on queue completion
 * times. This component feeds that data into the Zustand store so the UI
 * always reflects the latest server state, including building levels and
 * queue completions, without waiting for a page reload.
 */
export function CityDataSync() {
  const cityId = useGameStore((s) => s.cityId);
  const setCity = useGameStore((s) => s.setCity);
  
  // useCity does adaptive polling (1s near completion, 20s otherwise)
  const { data, isSuccess } = useCity(cityId);

  useEffect(() => {
    if (isSuccess && data) {
      setCity(mapCityToStore(data));
    }
  }, [data, isSuccess, setCity]);

  return null;
}
