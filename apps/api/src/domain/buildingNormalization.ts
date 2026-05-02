import type { BuildingType } from "@etheria/shared";

export type BuildingRecord = {
  id: string;
  type: BuildingType | string;
  level: number;
  positionX: number;
  positionY: number;
  createdAt?: string;
  upgradedAt?: string;
};

export function normalizeBuildingsByType<T extends BuildingRecord>(buildings: T[], prioritizedBuildingIds: Set<string> = new Set()) {
  const byType = new Map<string, T[]>();

  for (const building of buildings) {
    const list = byType.get(building.type) ?? [];
    list.push(building);
    byType.set(building.type, list);
  }

  const kept: T[] = [];
  const removed: T[] = [];
  const primaryByType = new Map<string, T>();

  for (const group of byType.values()) {
    group.sort((a, b) => {
      const aPriority = prioritizedBuildingIds.has(a.id) ? 1 : 0;
      const bPriority = prioritizedBuildingIds.has(b.id) ? 1 : 0;
      if (aPriority !== bPriority) return bPriority - aPriority;
      if ((a.level ?? 0) !== (b.level ?? 0)) return (b.level ?? 0) - (a.level ?? 0);
      const aTime = new Date(a.upgradedAt ?? a.createdAt ?? 0).getTime();
      const bTime = new Date(b.upgradedAt ?? b.createdAt ?? 0).getTime();
      if (aTime !== bTime) return bTime - aTime;
      if ((a.positionY ?? 0) !== (b.positionY ?? 0)) return (a.positionY ?? 0) - (b.positionY ?? 0);
      return (a.positionX ?? 0) - (b.positionX ?? 0);
    });

    const [primary, ...duplicates] = group;
    if (primary) kept.push(primary);
    if (primary) primaryByType.set(String(primary.type), primary);
    removed.push(...duplicates);
  }

  kept.sort((a, b) => (a.positionY - b.positionY) || (a.positionX - b.positionX));

  return { kept, removed, primaryByType };
}
