"use client";

import { useState } from "react";
import { useGameStore } from "@/stores/gameStore";
import {
  useAllCities,
  useAttackCity,
  useBattleReports,
  useMarkReportRead,
  useActiveBattles,
} from "@/hooks/useCity";
import { UNIT_INFO, formatTime, formatShortTime } from "@/lib/constants";
import { Panel } from "@/components/ui/Panel";
import { PanelHeader } from "@/components/ui/PanelHeader";
import { TabBar } from "@/components/ui/TabBar";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { useCountdown } from "@/hooks/useCountdown";
import { toastError, toastSuccess } from "@/stores/toastStore";

type Tab = "attack" | "reports" | "active";

export function BattlePanel() {
  const [tab, setTab] = useState<Tab>("attack");
  const cityId = useGameStore((s) => s.cityId);
  const [isOpen, setIsOpen] = useState(false);

  if (!cityId) return null;

  return (
    <div className="pointer-events-auto absolute bottom-4 left-4 z-20">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-red-900/80 to-red-800/80 border border-red-700/50 rounded-lg px-4 py-2.5 shadow-lg hover:from-red-800/80 hover:to-red-700/80 transition-all"
        >
          <span className="text-base">⚔️</span>
          <span className="text-xs font-bold uppercase tracking-wider text-red-300">Battle</span>
        </button>
      ) : (
        <Panel animation="slide-left" className="w-[340px] max-h-[450px] flex flex-col">
          <PanelHeader
            title="Battle Command"
            icon="⚔️"
            onClose={() => setIsOpen(false)}
          />

          <TabBar
            tabs={[
              { id: "attack", label: "Attack", icon: "⚔️" },
              { id: "reports", label: "Reports", icon: "📜" },
              { id: "active", label: "Active", icon: "🚶" },
            ]}
            activeTab={tab}
            onChange={(id) => setTab(id as Tab)}
          />

          <div className="p-3 overflow-y-auto flex-1">
            {tab === "attack" && <AttackTab cityId={cityId} />}
            {tab === "reports" && <ReportsTab cityId={cityId} />}
            {tab === "active" && <ActiveTab cityId={cityId} />}
          </div>
        </Panel>
      )}
    </div>
  );
}

// ─── Attack Tab ───

function AttackTab({ cityId }: { cityId: string }) {
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
          toastSuccess("Attack Sent", "Your troops are marching to the target.");
        },
        onError: (err) => {
          toastError("Attack Failed", err.message);
        },
      }
    );
  };

  const availableCities = cities?.filter((c) => c.id !== cityId) ?? [];

  return (
    <div className="space-y-3">
      {/* Target selection */}
      <div>
        <label className="text-[10px] text-etheria-text-dim uppercase font-bold mb-1 block tracking-wider">Target City</label>
        <select
          value={selectedTarget ?? ""}
          onChange={(e) => setSelectedTarget(e.target.value || null)}
          className="w-full bg-etheria-bg-light border border-etheria-border rounded-lg px-3 py-2 text-sm text-etheria-text focus:outline-none focus:border-etheria-gold transition-colors"
        >
          <option value="">Select a target...</option>
          {availableCities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name} ({city.posX}, {city.posY})
            </option>
          ))}
        </select>
      </div>

      {/* Unit selection */}
      <div>
        <label className="text-[10px] text-etheria-text-dim uppercase font-bold mb-1 block tracking-wider">Troops</label>
        <div className="space-y-1.5">
          {units.length === 0 && (
            <p className="text-xs text-etheria-text-dim italic py-2 text-center">No troops available. Train units in Barracks.</p>
          )}
          {units.map((unit) => {
            const info = UNIT_INFO[unit.type as keyof typeof UNIT_INFO];
            const inputVal = unitInputs[unit.type] ?? 0;
            return (
              <div key={unit.type} className="flex items-center gap-2 bg-etheria-bg-light/30 rounded px-2 py-1.5">
                <span className="text-base">{info?.icon}</span>
                <span className="text-xs text-etheria-text flex-1">{info?.name ?? unit.type}</span>
                <span className="text-[10px] text-etheria-text-dim">({unit.count})</span>
                <input
                  type="number"
                  min={0}
                  max={unit.count}
                  value={inputVal || ""}
                  placeholder="0"
                  onChange={(e) =>
                    setUnitInputs((prev) => ({
                      ...prev,
                      [unit.type]: Math.min(unit.count, Math.max(0, parseInt(e.target.value) || 0)),
                    }))
                  }
                  className="w-16 bg-etheria-bg border border-etheria-border rounded px-2 py-1 text-xs text-etheria-text text-right focus:outline-none focus:border-etheria-gold transition-colors"
                />
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={handleSendAttack}
        disabled={!selectedTarget || attackMutation.isPending}
        className="w-full bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 disabled:from-slate-700 disabled:to-slate-600 text-white font-bold py-2.5 px-4 rounded-lg transition-all text-sm uppercase tracking-wider shadow-lg"
      >
        {attackMutation.isPending ? "Sending..." : "⚔️ Send Attack"}
      </button>

      {attackMutation.isError && (
        <p className="text-xs text-red-400 text-center">{attackMutation.error.message}</p>
      )}
    </div>
  );
}

// ─── Reports Tab ───

function ReportsTab({ cityId }: { cityId: string }) {
  const { data: reports } = useBattleReports(cityId);
  const markRead = useMarkReportRead();

  if (!reports || reports.length === 0) {
    return <p className="text-xs text-etheria-text-dim text-center py-6">No battle reports yet.</p>;
  }

  return (
    <div className="space-y-2">
      {reports.map((report) => (
        <div
          key={report.id}
          className={`rounded-lg p-3 border text-xs transition-colors ${
            report.read
              ? "bg-etheria-bg-light/30 border-etheria-border/30"
              : "bg-etheria-panel-light border-etheria-border shadow-sm"
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <Badge variant={report.status === "VICTORY" ? "green" : "red"} size="sm">
              {report.status === "VICTORY" ? "Victory" : "Defeat"}
            </Badge>
            <span className="text-[10px] text-etheria-text-dim">
              {new Date(report.createdAt).toLocaleDateString()}
            </span>
          </div>

          <div className="text-etheria-text mb-2">
            {report.attackerName} → {report.defenderName}
          </div>

          {/* Barbarian attack indicator */}
          {(report as any).isBarbarianAttack && (
            <div className="text-[10px] text-orange-400 mb-1 flex items-center gap-1">
              <span>🏹</span>
              <span>Barbarian Attack</span>
            </div>
          )}

          {/* Losses */}
          <div className="grid grid-cols-2 gap-2 mb-2 text-[10px]">
            <div className="bg-etheria-bg-light/30 rounded px-2 py-1">
              <span className="text-etheria-text-dim block">Attacker losses:</span>
              <span className="text-etheria-text">
                {Object.entries(report.attackerLosses)
                  .filter(([, count]) => count > 0)
                  .map(([type, count]) => `${count} ${UNIT_INFO[type as keyof typeof UNIT_INFO]?.shortName ?? type}`)
                  .join(", ") || "None"}
              </span>
            </div>
            <div className="bg-etheria-bg-light/30 rounded px-2 py-1">
              <span className="text-etheria-text-dim block">Defender losses:</span>
              <span className="text-etheria-text">
                {Object.entries(report.defenderLosses)
                  .filter(([, count]) => count > 0)
                  .map(([type, count]) => `${count} ${UNIT_INFO[type as keyof typeof UNIT_INFO]?.shortName ?? type}`)
                  .join(", ") || "None"}
              </span>
            </div>
          </div>

          {/* Loot */}
          {report.loot && (
            <div className="text-[10px] text-amber-400 mb-2">
              Loot: 🪙{report.loot.gold} 🪵{report.loot.wood} 🪨{report.loot.stone} 🍖{report.loot.food}
            </div>
          )}

          {!report.read && (
            <button
              onClick={() => markRead.mutate({ cityId, reportId: report.id })}
              className="text-[10px] text-etheria-text-dim hover:text-etheria-text transition-colors"
            >
              Mark as read
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Active Battles Tab ───

function ActiveTab({ cityId }: { cityId: string }) {
  const { data: battles } = useActiveBattles(cityId);

  if (!battles || battles.length === 0) {
    return <p className="text-xs text-etheria-text-dim text-center py-6">No active battles.</p>;
  }

  return (
    <div className="space-y-2">
      {battles.map((battle) => (
        <BattleTimer key={battle.id} battle={battle} cityId={cityId} />
      ))}
    </div>
  );
}

function BattleTimer({ battle, cityId }: { battle: import("@/hooks/useCity").ActiveBattle; cityId: string }) {
  const { remaining } = useCountdown(battle.status === "MARCHING" ? battle.arrivesAt : battle.returnsAt ?? battle.arrivesAt);
  const seconds = remaining() ?? 0;

  const isAttacker = battle.attackerCityId === cityId;
  const label = battle.status === "MARCHING"
    ? isAttacker ? "Marching to attack" : "Enemy approaching"
    : isAttacker ? "Returning home" : "Enemy returning";

  return (
    <div className="bg-etheria-bg-light/50 rounded-lg p-3 border border-etheria-border/50">
      <div className="flex justify-between items-start mb-2">
        <span className={`text-[10px] font-bold uppercase tracking-wider ${
          battle.status === "MARCHING" ? "text-red-400" : "text-blue-400"
        }`}>
          {battle.status === "MARCHING" ? "🚶" : "🏠"} {label}
        </span>
        <span className="text-xs font-mono text-amber-400">{formatTime(seconds)}</span>
      </div>
      <div className="text-[10px] text-etheria-text-dim">
        {battle.units.map((u) => `${u.count} ${UNIT_INFO[u.type as keyof typeof UNIT_INFO]?.shortName ?? u.type}`).join(", ")}
      </div>
    </div>
  );
}
