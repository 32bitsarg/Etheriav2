"use client";

import { useState } from "react";
import { useGameStore } from "@/stores/gameStore";
import type { BuildingType } from "@etheria/shared";
import { BUILDING_INFO, CATEGORY_LABELS, CATEGORY_ICONS } from "@/lib/constants";
import { Panel } from "./Panel";
import { Tooltip } from "./Tooltip";
import { useI18n } from "@/i18n";
import { getBuildingNameKey, getBuildingDescriptionKey } from "@/lib/constants";

type BuildingCategory = "economic" | "military" | "civic";

export function BuildingMenu() {
  const { t } = useI18n();
  const { buildMode, selectedBuildingType, setBuildMode, setSelectedBuildingType, buildings, resources } = useGameStore();
  const [expandedCategories, setExpandedCategories] = useState<Set<BuildingCategory>>(new Set(["economic", "military", "civic"]));

  const CATEGORIES: { id: BuildingCategory; label: string; icon: string }[] = [
    { id: "economic", label: t(CATEGORY_LABELS.economic), icon: CATEGORY_ICONS.economic },
    { id: "military", label: t(CATEGORY_LABELS.military), icon: CATEGORY_ICONS.military },
    { id: "civic", label: t(CATEGORY_LABELS.civic), icon: CATEGORY_ICONS.civic },
  ];

  const toggleCategory = (cat: BuildingCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const selectBuilding = (type: BuildingType) => {
    if (selectedBuildingType === type && buildMode) {
      setBuildMode(false);
      setSelectedBuildingType(null);
    } else {
      setSelectedBuildingType(type);
      setBuildMode(true);
    }
  };

  const getBuildingsByCategory = (cat: BuildingCategory) => {
    return Object.entries(BUILDING_INFO)
      .filter(([, info]) => info.category === cat)
      .map(([type, info]) => ({ type: type as BuildingType, ...info }));
  };

  const getExistingCount = (type: BuildingType) => {
    return buildings.filter((b) => b.type === type).length;
  };

  return (
    <div className="pointer-events-auto absolute left-4 top-[56px] z-20 w-[260px]">
      <Panel animation="slide-left" className="overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-etheria-border bg-gradient-to-r from-etheria-panel to-etheria-panel-light">
          <div className="flex items-center gap-2">
            <span className="text-base">🏗️</span>
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-etheria-gold">Buildings</h3>
          </div>
          {buildMode && (
            <span className="text-[10px] text-amber-400 font-bold uppercase animate-pulse">
              Placing...
            </span>
          )}
        </div>

        {/* Categories */}
        <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
          {CATEGORIES.map((cat) => {
            const categoryBuildings = getBuildingsByCategory(cat.id);
            const isExpanded = expandedCategories.has(cat.id);

            return (
              <div key={cat.id} className="border-b border-etheria-border/50 last:border-b-0">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-etheria-panel-hover/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>{cat.icon}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-etheria-text-muted">{cat.label}</span>
                  </div>
                  <span className={`text-[10px] text-etheria-text-dim transition-transform ${isExpanded ? "rotate-90" : ""}`}>
                    ▶
                  </span>
                </button>

                {/* Category Buildings */}
                {isExpanded && (
                  <div className="px-2 pb-2 grid grid-cols-2 gap-1.5">
                    {categoryBuildings.map((b) => {
                      const count = getExistingCount(b.type);
                      const isSelected = selectedBuildingType === b.type && buildMode;

                      return (
                          <Tooltip
                            key={b.type}
                            content={
                              <div className="space-y-1">
                                <p className="font-bold text-etheria-gold">{t(getBuildingNameKey(b.type))}</p>
                                <p className="text-etheria-text-muted">{t(getBuildingDescriptionKey(b.type))}</p>
                                {count > 0 && <p className="text-etheria-text-dim">Built: {count}</p>}
                              </div>
                            }
                          >
                          <button
                            onClick={() => selectBuilding(b.type)}
                            className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 transition-all ${
                              isSelected
                                ? "border-etheria-gold bg-etheria-gold/10 text-etheria-gold shadow-[0_0_12px_rgba(251,191,36,0.2)]"
                                : "border-etheria-border/50 bg-etheria-bg-light/50 hover:bg-etheria-panel-hover hover:border-etheria-border-light"
                            }`}
                          >
                            <span className="text-xl">{b.icon}</span>
                            <span className="text-[9px] font-medium leading-tight text-center">{t(getBuildingNameKey(b.type))}</span>
                            {count > 0 && (
                              <span className="text-[9px] text-etheria-text-dim">×{count}</span>
                            )}
                          </button>
                        </Tooltip>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Cancel button when in build mode */}
        {buildMode && (
          <div className="p-2 border-t border-etheria-border">
            <button
              onClick={() => {
                setBuildMode(false);
                setSelectedBuildingType(null);
              }}
              className="w-full rounded-lg bg-red-900/30 border border-red-700/50 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-900/50 transition-colors uppercase tracking-wider"
            >
              Cancel Build Mode
            </button>
          </div>
        )}
      </Panel>
    </div>
  );
}
