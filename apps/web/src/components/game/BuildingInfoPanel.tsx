"use client";

import { useGameStore } from "@/stores/gameStore";
import { useUpgradeBuilding } from "@/hooks/useCity";
import { BUILDING_INFO, BUILDING_SIZES, formatTime } from "@/lib/constants";
import { Panel } from "@/components/ui/Panel";
import { PanelHeader } from "@/components/ui/PanelHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { toastError } from "@/stores/toastStore";

export function BuildingInfoPanel() {
  const selectedBuilding = useGameStore((s) => s.selectedBuilding);
  const cityId = useGameStore((s) => s.cityId);
  const resources = useGameStore((s) => s.resources);
  const setSelectedBuilding = useGameStore((s) => s.setSelectedBuilding);
  const setShowResearch = useGameStore((s) => s.setShowResearch);
  const upgradeMutation = useUpgradeBuilding();

  if (!selectedBuilding || !cityId) return null;

  const info = BUILDING_INFO[selectedBuilding.type];
  const size = BUILDING_SIZES[selectedBuilding.type] ?? { w: 1, h: 1 };

  const handleUpgrade = () => {
    upgradeMutation.mutate(
      { cityId, buildingId: selectedBuilding.id },
      {
        onSuccess: () => {
          setSelectedBuilding(null);
        },
        onError: (err) => {
          toastError("Upgrade Failed", err.message);
        },
      }
    );
  };

  return (
    <div className="pointer-events-auto absolute left-4 top-[56px] z-30 w-[300px]">
      <Panel animation="slide-left" className="overflow-hidden">
        <PanelHeader
          title={info?.name ?? selectedBuilding.type}
          icon={info?.icon}
          onClose={() => setSelectedBuilding(null)}
        />

        <div className="p-4 space-y-4">
          {/* Level Badge */}
          <div className="flex items-center justify-between">
            <Badge variant="gold" size="lg">Level {selectedBuilding.level}</Badge>
            <span className="text-xs text-etheria-text-dim">
              {size.w}×{size.h} tiles
            </span>
          </div>

          {/* Description */}
          {info?.description && (
            <p className="text-xs text-etheria-text-muted leading-relaxed">{info.description}</p>
          )}

          {/* Stats */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-etheria-text-dim">Position</span>
              <span className="text-etheria-text">({selectedBuilding.positionX}, {selectedBuilding.positionY})</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-etheria-text-dim">Built</span>
              <span className="text-etheria-text">
                {new Date(selectedBuilding.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Upgrade Section */}
          <div className="border-t border-etheria-border pt-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-etheria-gold mb-3">Upgrade to Level {selectedBuilding.level + 1}</h4>

            {/* Placeholder costs - server will validate */}
            <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
              <div className="bg-etheria-bg-light/50 rounded px-2 py-1.5">
                <span className="text-etheria-text-dim">Gold</span>
                <p className="text-amber-400 font-bold">Server calculated</p>
              </div>
              <div className="bg-etheria-bg-light/50 rounded px-2 py-1.5">
                <span className="text-etheria-text-dim">Time</span>
                <p className="text-blue-400 font-bold">Server calculated</p>
              </div>
            </div>

            <button
              onClick={handleUpgrade}
              disabled={upgradeMutation.isPending}
              className="w-full bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 disabled:from-slate-700 disabled:to-slate-600 text-white font-bold py-2.5 px-4 rounded-lg transition-all text-sm uppercase tracking-wider shadow-lg"
            >
              {upgradeMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span> Upgrading...
                </span>
              ) : (
                "⬆ Upgrade"
              )}
            </button>

            {upgradeMutation.isError && (
              <p className="mt-2 text-xs text-red-400 text-center">{upgradeMutation.error.message}</p>
            )}
          </div>

          {/* Special Actions */}
          {selectedBuilding.type === "LIBRARY" && (
            <button
              onClick={() => {
                setShowResearch(true);
                setSelectedBuilding(null);
              }}
              className="w-full bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm uppercase tracking-wider"
            >
              📚 Open Research
            </button>
          )}

          {selectedBuilding.type === "BARRACKS" && (
            <div className="text-xs text-etheria-text-dim text-center">
              Train units from the Battle Panel
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
