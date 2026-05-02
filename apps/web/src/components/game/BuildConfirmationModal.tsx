"use client";

import { useGameStore } from "@/stores/gameStore";
import { useBuildBuilding } from "@/hooks/useCity";
import { BUILDING_INFO, BUILDING_SIZES } from "@/lib/constants";
import { Panel } from "@/components/ui/Panel";
import { toastError, toastSuccess } from "@/stores/toastStore";

export function BuildConfirmationModal() {
  const store = useGameStore();
  const buildMutation = useBuildBuilding();

  const { buildMode, selectedBuildingType, selectedTile, cityId } = store;

  if (!buildMode || !selectedBuildingType || !selectedTile || !cityId) return null;

  const info = BUILDING_INFO[selectedBuildingType];
  const size = BUILDING_SIZES[selectedBuildingType] ?? { w: 1, h: 1 };

  const handleBuild = () => {
    buildMutation.mutate(
      {
        cityId,
        type: selectedBuildingType,
        positionX: selectedTile.x,
        positionY: selectedTile.y,
      },
      {
        onSuccess: () => {
          store.setBuildMode(false);
          store.setSelectedBuildingType(null);
          store.setSelectedTile(null);
          toastSuccess("Construction Started", `${info?.name} is being built at (${selectedTile.x}, ${selectedTile.y})`);
        },
        onError: (err) => {
          toastError("Build Failed", err.message);
        },
      }
    );
  };

  const handleCancel = () => {
    store.setBuildMode(false);
    store.setSelectedBuildingType(null);
    store.setSelectedTile(null);
  };

  return (
    <div className="pointer-events-auto absolute bottom-20 left-1/2 -translate-x-1/2 z-30">
      <Panel animation="slide-up" className="min-w-[340px]">
        <div className="p-4">
          {/* Building Preview */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-lg bg-etheria-bg-light/50 border border-etheria-border flex items-center justify-center text-2xl">
              {info?.icon ?? "🏗️"}
            </div>
            <div>
              <h3 className="font-display font-bold text-etheria-gold text-sm">{info?.name}</h3>
              <p className="text-[10px] text-etheria-text-dim">
                Position: ({selectedTile.x}, {selectedTile.y}) • Size: {size.w}×{size.h}
              </p>
            </div>
          </div>

          {/* Description */}
          {info?.description && (
            <p className="text-xs text-etheria-text-muted mb-4 leading-relaxed">{info.description}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleBuild}
              disabled={buildMutation.isPending}
              className="flex-1 bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 disabled:from-slate-700 disabled:to-slate-600 text-white font-bold py-2.5 px-4 rounded-lg transition-all text-sm uppercase tracking-wider shadow-lg"
            >
              {buildMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span> Building...
                </span>
              ) : (
                "Confirm Build"
              )}
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 bg-etheria-bg-light border border-etheria-border hover:bg-etheria-panel-hover text-etheria-text font-bold py-2.5 px-4 rounded-lg transition-all text-sm"
            >
              Cancel
            </button>
          </div>

          {buildMutation.isError && (
            <p className="mt-2 text-xs text-red-400 text-center">{buildMutation.error.message}</p>
          )}
        </div>
      </Panel>
    </div>
  );
}
