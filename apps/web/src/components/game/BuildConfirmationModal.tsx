"use client";

import { useGameStore } from "@/stores/gameStore";
import { useBuildBuilding } from "@/hooks/useCity";
import { BUILDING_INFO, BUILDING_SIZES, getBuildingDescriptionKey, getBuildingNameKey } from "@/lib/constants";
import { Panel } from "@/components/ui/Panel";
import { toastError, toastSuccess } from "@/stores/toastStore";
import { useI18n } from "@/i18n";

export function BuildConfirmationModal() {
  const { t } = useI18n();
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
          toastSuccess(
            t("play.buildConfirm.started"),
            `${t(getBuildingNameKey(selectedBuildingType))} ${t("play.buildConfirm.startedAt")} (${selectedTile.x}, ${selectedTile.y})`
          );
        },
        onError: (err) => {
          toastError(t("play.buildConfirm.failed"), err.message);
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
    <div className="pointer-events-auto absolute bottom-20 left-1/2 z-30 -translate-x-1/2">
      <Panel animation="slide-up" className="min-w-[340px]">
        <div className="p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-etheria-border bg-etheria-bg-light/50 text-2xl">
              {info?.icon ?? "???"}
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-etheria-gold">{t(getBuildingNameKey(selectedBuildingType))}</h3>
              <p className="text-[10px] text-etheria-text-dim">
                {t("play.buildConfirm.position")}: ({selectedTile.x}, {selectedTile.y}) · {t("play.buildConfirm.size")}: {size.w}x{size.h}
              </p>
            </div>
          </div>

          <p className="mb-4 text-xs leading-relaxed text-etheria-text-muted">{t(getBuildingDescriptionKey(selectedBuildingType))}</p>

          <div className="flex gap-2">
            <button
              onClick={handleBuild}
              disabled={buildMutation.isPending}
              className="flex-1 rounded-lg bg-gradient-to-r from-emerald-700 to-emerald-600 px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:from-emerald-600 hover:to-emerald-500 disabled:from-slate-700 disabled:to-slate-600"
            >
              {buildMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">?</span> {t("play.buildConfirm.building")}
                </span>
              ) : (
                t("play.buildConfirm.confirm")
              )}
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 rounded-lg border border-etheria-border bg-etheria-bg-light px-4 py-2.5 text-sm font-bold text-etheria-text transition-all hover:bg-etheria-panel-hover"
            >
              {t("play.buildConfirm.cancel")}
            </button>
          </div>

          {buildMutation.isError && (
            <p className="mt-2 text-center text-xs text-red-400">{buildMutation.error.message}</p>
          )}
        </div>
      </Panel>
    </div>
  );
}
