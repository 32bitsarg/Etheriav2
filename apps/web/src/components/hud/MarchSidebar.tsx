"use client";

import { memo } from "react";
import { useActiveBattles, useWorldMovements } from "@/hooks/useCity";
import { useGameStore } from "@/stores/gameStore";
import { useCountdown } from "@/hooks/useCountdown";
import { useI18n } from "@/i18n";
import { formatTime, getUnitShortNameKey } from "@/lib/constants";
import type { WorldMovement } from "@etheria/shared";
import type { ActiveBattle } from "@/hooks/useCity";

// ── Individual row ──────────────────────────────────────────────────────────

function MarchRow({ label, eta, status, units, accent }: {
  label: string;
  eta: string;
  status: "MARCHING" | "RETURNING";
  units?: { type: string; count: number }[];
  accent: "red" | "blue" | "amber" | "green";
}) {
  const { t } = useI18n();
  const accentClass: Record<string, string> = {
    red:   "border-red-500/40 bg-red-950/30",
    blue:  "border-blue-500/30 bg-blue-950/25",
    amber: "border-amber-500/30 bg-amber-950/25",
    green: "border-green-500/30 bg-green-950/25",
  };
  const dotClass: Record<string, string> = {
    red:   "bg-red-400",
    blue:  "bg-blue-400",
    amber: "bg-amber-400",
    green: "bg-green-400",
  };
  const statusIcon = status === "MARCHING" ? "⚔️" : "🏠";

  return (
    <div className={`rounded-lg border px-2 py-1.5 text-[10px] ${accentClass[accent]}`}>
      <div className="flex items-center justify-between gap-1 mb-0.5">
        <span className="font-semibold text-white/80 truncate flex-1">{statusIcon} {label}</span>
        <span className="font-mono text-amber-300 shrink-0">{eta}</span>
      </div>
      {units && units.length > 0 && (
        <div className="text-white/40 truncate">
          {units.slice(0, 4).map(u => `${u.count}${getUnitShortNameKey(u.type).split(".").pop() ?? ""}`).join(" · ")}
        </div>
      )}
    </div>
  );
}

// ── Battle row (own marches / incoming) ────────────────────────────────────

function BattleRow({ battle, cityId }: { battle: ActiveBattle; cityId: string }) {
  const { t } = useI18n();
  const isAttacker = battle.attackerCityId === cityId;
  const isReturning = battle.status === "RETURNING";
  const etaDate = isReturning ? (battle.returnsAt ?? battle.arrivesAt) : battle.arrivesAt;
  const { remaining } = useCountdown(etaDate);
  const secs = remaining() ?? 0;

  let label: string;
  let accent: "red" | "blue" | "amber" | "green";

  if (isAttacker && !isReturning) {
    label = t("play.battle.marching");
    accent = "amber";
  } else if (isAttacker && isReturning) {
    label = t("play.battle.returningHome");
    accent = "blue";
  } else if (!isAttacker && !isReturning) {
    label = t("play.battle.enemyApproaching");
    accent = "red";
  } else {
    label = t("play.battle.enemyReturning");
    accent = "green";
  }

  return (
    <MarchRow
      label={label}
      eta={formatTime(secs)}
      status={battle.status}
      units={battle.units}
      accent={accent}
    />
  );
}

// ── World-movement row (all players' marches visible on map) ──────────────

function WorldMarchRow({ m, cityId }: { m: WorldMovement & { relation?: string }; cityId: string }) {
  const { t } = useI18n();
  const isReturning = m.status === "RETURNING" && !!m.returnsAt;
  const etaDate = isReturning ? m.returnsAt! : m.arrivesAt;
  const { remaining } = useCountdown(etaDate);
  const secs = remaining() ?? 0;

  const isOwn = m.playerName == null; // own movements have no playerName in some APIs
  const isTrade = m.type === "TRADE" || m.type === "BARBARIAN_TRADE";

  let label: string;
  let accent: "red" | "blue" | "amber" | "green";

  if (m.type === "BARBARIAN_MOVE") { label = `Barb → ${m.to.name}`; accent = "amber"; }
  else if (m.type === "BARBARIAN_VS_BARBARIAN") { label = "Barb clash"; accent = "red"; }
  else if (isTrade) { label = `${m.from.name} → ${m.to.name}`; accent = "green"; }
  else if (m.relation === "own") {
    label = isReturning ? t("play.battle.returningHome") : `→ ${m.to.name}`;
    accent = isReturning ? "blue" : "amber";
  } else if (m.relation === "hostile") {
    label = `${m.playerName ?? "?"} → ${m.to.name}`;
    accent = "red";
  } else {
    label = `${m.playerName ?? "?"} → ${m.to.name}`;
    accent = "blue";
  }

  return (
    <MarchRow
      label={label}
      eta={formatTime(secs)}
      status={m.status}
      accent={accent}
    />
  );
}

// ── Main sidebar ─────────────────────────────────────────────────────────────

export const MarchSidebar = memo(function MarchSidebar() {
  const { t } = useI18n();
  const cityId = useGameStore((s) => s.cityId);
  const { data: battles } = useActiveBattles(cityId, true);
  const { data: movements } = useWorldMovements(true);

  if (!cityId) return null;

  const myBattles = (battles ?? []);
  // Own movements from world movements (relation === "own")
  const ownMoves = (movements ?? []).filter((m) => (m as any).relation === "own");
  // Incoming hostile not already in myBattles (avoid duplicates)
  const battleIds = new Set(myBattles.map(b => b.id));
  const hostileMoves = (movements ?? []).filter(
    (m) => (m as any).relation === "hostile" && !battleIds.has(m.id)
  );

  const hasAnything = myBattles.length > 0 || ownMoves.length > 0 || hostileMoves.length > 0;

  if (!hasAnything) return null;

  return (
    <aside className="march-sidebar pointer-events-auto">
      <div className="px-2 pt-2 pb-1">
        <div className="text-[8px] font-bold uppercase tracking-widest text-amber-400/60 mb-1.5">
          {t("play.sidebar.marches")}
        </div>
        <div className="flex flex-col gap-1.5">
          {myBattles.map((b) => (
            <BattleRow key={b.id} battle={b} cityId={cityId} />
          ))}
          {hostileMoves.map((m) => (
            <WorldMarchRow key={m.id} m={m as any} cityId={cityId} />
          ))}
          {ownMoves.map((m) => (
            <WorldMarchRow key={m.id} m={m as any} cityId={cityId} />
          ))}
        </div>
      </div>
    </aside>
  );
});
