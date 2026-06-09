"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMatecitoAuth } from "@/hooks/useMatecitoAuth";
import { useI18n } from "@/i18n";
import { RACE_INFO, type RaceId } from "@/config/raceConfig";
import { getCityId } from "@/lib/guestAuth";

const PENDING_RACE_KEY = "etheria_pending_race";

export default function SelectRacePage() {
  const router = useRouter();
  const auth = useMatecitoAuth();
  const { t } = useI18n();
  const [selected, setSelected] = useState<RaceId | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const races = useMemo(() => {
    try {
      return (Object.entries(RACE_INFO) as [RaceId, (typeof RACE_INFO)[RaceId]][]).map(
        ([id, info]) => ({ ...info, id })
      );
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    if (auth.ready && !auth.isLoggedIn) router.replace("/login");
    if (auth.isLoggedIn && getCityId()) router.replace("/play");
  }, [auth.ready, auth.isLoggedIn, router]);

  function handleSelect(raceId: RaceId) {
    setSelected(raceId);
  }

  function handleConfirm() {
    if (!selected) return;
    setSubmitting(true);
    localStorage.setItem(PENDING_RACE_KEY, selected);
    router.replace("/play");
  }

  if (!auth.ready || !auth.isLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-etheria-bg">
        <div className="text-2xl animate-bounce">⚔️</div>
      </div>
    );
  }

  if (races.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b1111]">
        <div className="text-center">
          <div className="text-xl text-etheria-gold-soft">{t("race.title")}</div>
          <p className="mt-2 text-sm text-stone-400">Cargando razas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0b1111] px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-10 text-center">
          <h1
            className="mb-3 text-4xl font-display font-bold text-etheria-gold-soft"
            style={{ letterSpacing: "-0.02em" }}
          >
            {t("race.title")}
          </h1>
          <p className="mx-auto max-w-md text-[15px] leading-relaxed text-stone-400">
            {t("race.subtitle")}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {races.map((race) => {
            const isSelected = selected === race.id;
            return (
              <button
                key={race.id}
                onClick={() => handleSelect(race.id)}
                className={`relative rounded-2xl border p-5 text-left transition-all duration-200 ${
                  isSelected
                    ? "border-[var(--race-color)] bg-[var(--race-color)]/10 shadow-[0_0_28px_var(--race-color)]/25 scale-[1.02]"
                    : "border-etheria-border-dim bg-black/20 hover:border-etheria-border hover:bg-black/30"
                }`}
                style={{ "--race-color": race.color } as React.CSSProperties}
              >
                <div className="mb-3 flex items-center gap-3">
                  <span className="text-3xl">{race.icon}</span>
                  <div>
                    <div className="text-lg font-display font-bold text-white">
                      {t(race.nameKey)}
                    </div>
                    <div className="text-[11px] uppercase tracking-widest text-stone-500">
                      {race.id}
                    </div>
                  </div>
                  {isSelected && (
                    <span className="ml-auto flex h-7 w-7 items-center justify-center rounded-full bg-[var(--race-color)] text-sm font-bold text-black">
                      ✓
                    </span>
                  )}
                </div>
                <p className="mb-3 text-[13px] leading-relaxed text-stone-400">
                  {t(race.descriptionKey)}
                </p>
                <div className="space-y-1">
                  {race.bonuses.map((bonus) => (
                    <div
                      key={bonus.labelKey}
                      className="flex items-center justify-between text-[12px]"
                    >
                      <span className="text-stone-500">{t(bonus.labelKey)}</span>
                      <span
                        className="font-semibold"
                        style={{ color: bonus.value.startsWith("+") ? "#4cd964" : "#ff6b6b" }}
                      >
                        {bonus.value}
                      </span>
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={handleConfirm}
            disabled={!selected || submitting}
            className="w-full max-w-xs rounded-xl bg-amber-500 px-6 py-3.5 text-base font-display font-bold text-white shadow-lg shadow-amber-500/25 transition-all hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting
              ? t("race.creating")
              : selected
                ? `${t("race.confirmPrefix")} ${t(RACE_INFO[selected].nameKey)}`
                : t("race.selectPrompt")}
          </button>
        </div>

        <p className="mt-4 text-center text-[12px] text-stone-600">
          {t("race.permanentChoice")}
        </p>
      </div>
    </div>
  );
}
