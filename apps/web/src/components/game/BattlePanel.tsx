"use client";

import { useState } from "react";
import { useGameStore } from "@/stores/gameStore";
import { useActiveBattles, useAllCities, useAttackCity, useBattleReports, useMarkReportRead } from "@/hooks/useCity";
import { formatTime, getUnitNameKey, getUnitShortNameKey, UNIT_INFO } from "@/lib/constants";
import { Panel } from "@/components/ui/Panel";
import { PanelHeader } from "@/components/ui/PanelHeader";
import { TabBar } from "@/components/ui/TabBar";
import { Badge } from "@/components/ui/Badge";
import { useCountdown } from "@/hooks/useCountdown";
import { toastError, toastSuccess } from "@/stores/toastStore";
import { useI18n } from "@/i18n";

type Tab = "attack" | "reports" | "active";

export function BattlePanel() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("attack");
  const cityId = useGameStore((s) => s.cityId);
  const [isOpen, setIsOpen] = useState(false);

  if (!cityId) return null;

  return (
    <div className="pointer-events-auto absolute bottom-4 left-4 z-20">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-lg border border-red-700/50 bg-gradient-to-r from-red-900/80 to-red-800/80 px-4 py-2.5 shadow-lg transition-all hover:from-red-800/80 hover:to-red-700/80"
        >
          <span className="text-base">??</span>
          <span className="text-xs font-bold uppercase tracking-wider text-red-300">{t("play.battle.title")}</span>
        </button>
      ) : (
        <Panel animation="slide-left" className="flex max-h-[450px] w-[340px] flex-col">
          <PanelHeader title={t("play.battle.command")} icon="??" onClose={() => setIsOpen(false)} />
          <TabBar
            tabs={[
              { id: "attack", label: t("play.battle.attack"), icon: "??" },
              { id: "reports", label: t("play.battle.reports"), icon: "??" },
              { id: "active", label: t("play.battle.active"), icon: "??" },
            ]}
            activeTab={tab}
            onChange={(id) => setTab(id as Tab)}
          />
          <div className="flex-1 overflow-y-auto p-3">
            {tab === "attack" && <AttackTab cityId={cityId} />}
            {tab === "reports" && <ReportsTab cityId={cityId} />}
            {tab === "active" && <ActiveTab cityId={cityId} />}
          </div>
        </Panel>
      )}
    </div>
  );
}

function AttackTab({ cityId }: { cityId: string }) {
  const { t } = useI18n();
  const { data: cities } = useAllCities();
  const attackMutation = useAttackCity();
  const units = useGameStore((s) => s.units);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [unitInputs, setUnitInputs] = useState<Record<string, number>>({});

  const handleSendAttack = () => {
    if (!selectedTarget) return;
    const attackUnits = Object.entries(unitInputs)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => ({ type, count }));
    if (attackUnits.length === 0) return;

    attackMutation.mutate(
      { cityId, targetCityId: selectedTarget, units: attackUnits },
      {
        onSuccess: () => {
          setUnitInputs({});
          setSelectedTarget(null);
          toastSuccess(t("play.battle.attackSent"), t("play.battle.attackSentMsg"));
        },
        onError: (err) => toastError(t("play.battle.attackFailed"), err.message),
      }
    );
  };

  const availableCities = cities?.filter((city) => city.id !== cityId) ?? [];

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-etheria-text-dim">{t("play.battle.targetCity")}</label>
        <select
          value={selectedTarget ?? ""}
          onChange={(e) => setSelectedTarget(e.target.value || null)}
          className="w-full rounded-lg border border-etheria-border bg-etheria-bg-light px-3 py-2 text-sm text-etheria-text transition-colors focus:border-etheria-gold focus:outline-none"
        >
          <option value="">{t("play.battle.selectTarget")}</option>
          {availableCities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name} ({city.posX}, {city.posY})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-etheria-text-dim">{t("play.battle.troops")}</label>
        <div className="space-y-1.5">
          {units.length === 0 && <p className="py-2 text-center text-xs italic text-etheria-text-dim">{t("play.battle.noTroops")}</p>}
          {units.map((unit) => {
            const info = UNIT_INFO[unit.type as keyof typeof UNIT_INFO];
            const inputVal = unitInputs[unit.type] ?? 0;
            return (
              <div key={unit.type} className="flex items-center gap-2 rounded bg-etheria-bg-light/30 px-2 py-1.5">
                <span className="text-base">{info?.icon}</span>
                <span className="flex-1 text-xs text-etheria-text">{t(getUnitNameKey(unit.type))}</span>
                <span className="text-[10px] text-etheria-text-dim">({unit.count})</span>
                <input
                  type="number"
                  min={0}
                  max={unit.count}
                  value={inputVal || ""}
                  placeholder="0"
                  onChange={(e) => setUnitInputs((prev) => ({ ...prev, [unit.type]: Math.min(unit.count, Math.max(0, parseInt(e.target.value) || 0)) }))}
                  className="w-16 rounded border border-etheria-border bg-etheria-bg px-2 py-1 text-right text-xs text-etheria-text transition-colors focus:border-etheria-gold focus:outline-none"
                />
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={handleSendAttack}
        disabled={!selectedTarget || attackMutation.isPending}
        className="w-full rounded-lg bg-gradient-to-r from-red-700 to-red-600 px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:from-red-600 hover:to-red-500 disabled:from-slate-700 disabled:to-slate-600"
      >
        {attackMutation.isPending ? t("play.battle.sending") : `?? ${t("play.battle.sendAttack")}`}
      </button>
      {attackMutation.isError && <p className="text-center text-xs text-red-400">{attackMutation.error.message}</p>}
    </div>
  );
}

function ReportsTab({ cityId }: { cityId: string }) {
  const { t } = useI18n();
  const { data: reports } = useBattleReports(cityId);
  const markRead = useMarkReportRead();

  if (!reports || reports.length === 0) {
    return <p className="py-6 text-center text-xs text-etheria-text-dim">{t("play.battle.noReports")}</p>;
  }

  return (
    <div className="space-y-2">
      {reports.map((report) => (
        <div key={report.id} className={`rounded-lg border p-3 text-xs transition-colors ${report.read ? "border-etheria-border/30 bg-etheria-bg-light/30" : "border-etheria-border bg-etheria-panel-light shadow-sm"}`}>
          <div className="mb-2 flex items-start justify-between">
            <Badge variant={report.status === "VICTORY" ? "green" : "red"} size="sm">
              {report.status === "VICTORY" ? t("play.battle.victory") : t("play.battle.defeat")}
            </Badge>
            <span className="text-[10px] text-etheria-text-dim">{new Date(report.createdAt).toLocaleDateString()}</span>
          </div>

          <div className="mb-2 text-etheria-text">{report.attackerName} {"->"} {report.defenderName}</div>

          {(report as any).isBarbarianAttack && (
            <div className="mb-1 flex items-center gap-1 text-[10px] text-orange-400">
              <span>??</span>
              <span>{t("play.battle.barbarianAttack")}</span>
            </div>
          )}

          <div className="mb-2 grid grid-cols-2 gap-2 text-[10px]">
            <div className="rounded bg-etheria-bg-light/30 px-2 py-1">
              <span className="block text-etheria-text-dim">{t("play.battle.attackerLosses")}</span>
              <span className="text-etheria-text">
                {Object.entries(report.attackerLosses).filter(([, count]) => count > 0).map(([type, count]) => `${count} ${t(getUnitShortNameKey(type))}`).join(", ") || t("play.battle.none")}
              </span>
            </div>
            <div className="rounded bg-etheria-bg-light/30 px-2 py-1">
              <span className="block text-etheria-text-dim">{t("play.battle.defenderLosses")}</span>
              <span className="text-etheria-text">
                {Object.entries(report.defenderLosses).filter(([, count]) => count > 0).map(([type, count]) => `${count} ${t(getUnitShortNameKey(type))}`).join(", ") || t("play.battle.none")}
              </span>
            </div>
          </div>

          {report.loot && (
            <div className="mb-2 text-[10px] text-amber-400">
              {t("play.battle.loot")} ??{report.loot.gold} ??{report.loot.wood} ??{report.loot.stone} ??{report.loot.food}
            </div>
          )}

          {!report.read && (
            <button onClick={() => markRead.mutate({ cityId, reportId: report.id })} className="text-[10px] text-etheria-text-dim transition-colors hover:text-etheria-text">
              {t("play.battle.markRead")}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function ActiveTab({ cityId }: { cityId: string }) {
  const { t } = useI18n();
  const { data: battles } = useActiveBattles(cityId);
  if (!battles || battles.length === 0) return <p className="py-6 text-center text-xs text-etheria-text-dim">{t("play.battle.noActiveBattles")}</p>;
  return <div className="space-y-2">{battles.map((battle) => <BattleTimer key={battle.id} battle={battle} cityId={cityId} />)}</div>;
}

function BattleTimer({ battle, cityId }: { battle: import("@/hooks/useCity").ActiveBattle; cityId: string }) {
  const { t } = useI18n();
  const isBarbarian = !!(battle as any).isBarbarian;
  const { remaining } = useCountdown(battle.status === "MARCHING" ? battle.arrivesAt : battle.returnsAt ?? battle.arrivesAt);
  const seconds = remaining() ?? 0;
  const isAttacker = battle.attackerCityId === cityId;
  const label = isBarbarian
    ? battle.status === "MARCHING" ? t("play.battle.marchingBarbarian") : t("play.battle.returningHome")
    : battle.status === "MARCHING"
      ? isAttacker ? t("play.battle.marching") : t("play.battle.enemyApproaching")
      : isAttacker ? t("play.battle.returningHome") : t("play.battle.enemyReturning");

  return (
    <div className={`rounded-lg border p-3 ${isBarbarian ? "border-amber-700/50 bg-amber-950/30" : "border-etheria-border/50 bg-etheria-bg-light/50"}`}>
      <div className="mb-2 flex items-start justify-between">
        <span className={`text-[10px] font-bold uppercase tracking-wider ${battle.status === "MARCHING" ? "text-red-400" : "text-blue-400"}`}>
          {battle.status === "MARCHING" ? "⚔️" : "🏠"} {label}
        </span>
        <span className="font-mono text-xs text-amber-400">{formatTime(seconds)}</span>
      </div>
      <div className="text-[10px] text-etheria-text-dim">{battle.units.map((u) => `${u.count} ${t(getUnitShortNameKey(u.type))}`).join(", ")}</div>
    </div>
  );
}
