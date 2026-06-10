"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMatecitoAuth } from "@/hooks/useMatecitoAuth";
import { useI18n } from "@/i18n";
import { RACE_INFO, type RaceId } from "@/config/raceConfig";
import { getCityId } from "@/lib/guestAuth";
import { useIsMobile } from "@/hooks/useIsMobile";
import { MobileSelectCarousel } from "@/components/ui/MobileSelectCarousel";
import { RaceEmblem } from "@/components/RaceEmblem";
import { SelectBackdrop } from "@/components/SelectBackdrop";

const PENDING_RACE_KEY = "etheria_pending_race";

type RaceEntry = (typeof RACE_INFO)[RaceId] & { id: RaceId };

function RaceCard({
  race,
  isSelected,
  onSelect,
  t,
  mobile = false,
}: {
  race: RaceEntry;
  isSelected: boolean;
  onSelect: () => void;
  t: (key: string) => string;
  mobile?: boolean;
}) {
  return (
    <button
      onClick={onSelect}
      className={`relative w-full overflow-hidden rounded-2xl border text-left transition-all duration-200 ${
        mobile ? "flex h-full flex-col" : ""
      } ${
        isSelected
          ? "border-[var(--race-color)] bg-[var(--race-color)]/10 shadow-[0_0_28px_var(--race-color)]/25 scale-[1.02]"
          : "border-etheria-border-dim bg-black/45 hover:border-etheria-border hover:bg-black/55"
      } backdrop-blur-md`}
      style={{ "--race-color": race.color } as React.CSSProperties}
    >
      {/* Race portrait */}
      <div className={`relative w-full overflow-hidden ${mobile ? "h-44" : "h-36"}`}>
        <img
          src={`/assets/races/${race.id.toLowerCase()}.webp`}
          alt={t(race.nameKey)}
          className="h-full w-full object-cover object-top"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2.5 px-4 pb-2.5">
          <RaceEmblem race={race.id} className={mobile ? "h-10 w-10" : "h-9 w-9"} />
          <div>
            <div className={`font-display font-bold text-white drop-shadow ${mobile ? "text-xl" : "text-lg"}`}>
              {t(race.nameKey)}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-white/60">
              {race.id}
            </div>
          </div>
        </div>
        {isSelected && (
          <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--race-color)] text-sm font-bold text-black shadow-lg">
            ✓
          </span>
        )}
      </div>
      <div className={`p-4 ${mobile ? "flex flex-1 flex-col" : ""}`}>
      <p className={`mb-3 leading-relaxed text-stone-400 ${mobile ? "flex-1 text-[14px]" : "text-[13px]"}`}>
        {t(race.descriptionKey)}
      </p>
      <div className="space-y-1">
        {race.bonuses.map((bonus) => (
          <div
            key={bonus.labelKey}
            className={`flex items-center justify-between ${mobile ? "text-[13px]" : "text-[12px]"}`}
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
      </div>
    </button>
  );
}

export default function SelectRacePage() {
  const router = useRouter();
  const auth = useMatecitoAuth();
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [selected, setSelected] = useState<RaceId | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const races = useMemo<RaceEntry[]>(() => {
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

  const confirmLabel = submitting
    ? t("race.creating")
    : selected
      ? `${t("race.confirmPrefix")} ${t(RACE_INFO[selected].nameKey)}`
      : t("race.selectPrompt");

  // ─── Mobile: full-screen snap carousel, thumb-zone CTA ───
  if (isMobile) {
    return (
      <div
        className="relative flex h-dvh flex-col bg-[#0b1111]"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 20px)" }}
      >
        <SelectBackdrop src="/assets/backgrounds/village-fullscreen.webp" />
        <div className="relative z-10 px-6 text-center">
          <h1 className="text-2xl font-display font-bold text-etheria-gold-soft" style={{ letterSpacing: "-0.02em" }}>
            {t("race.title")}
          </h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-stone-400">
            {t("race.subtitle")}
          </p>
        </div>

        <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-center py-4">
          <MobileSelectCarousel
            items={races.map((r) => ({ key: r.id }))}
            onActiveChange={(i) => setSelected(races[i]?.id ?? null)}
            renderItem={(i, isActive) => (
              <RaceCard mobile race={races[i]} isSelected={isActive} onSelect={() => setSelected(races[i].id)} t={t} />
            )}
          />
        </div>

        <div
          className="relative z-10 px-6"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
        >
          <button
            onClick={handleConfirm}
            disabled={!selected || submitting}
            className="w-full rounded-xl bg-amber-500 px-6 py-4 text-base font-display font-bold text-white shadow-lg shadow-amber-500/25 transition-all active:scale-[0.98] disabled:opacity-40"
          >
            {confirmLabel}
          </button>
          <p className="mt-2 pb-1 text-center text-[11px] text-stone-600">
            {t("race.permanentChoice")}
          </p>
        </div>
      </div>
    );
  }

  // ─── Desktop: grid ───
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#0b1111] px-4 py-12">
      <SelectBackdrop src="/assets/backgrounds/village-fullscreen.webp" />
      <div className="relative z-10 w-full max-w-2xl">
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
          {races.map((race) => (
            <RaceCard
              key={race.id}
              race={race}
              isSelected={selected === race.id}
              onSelect={() => setSelected(race.id)}
              t={t}
            />
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={handleConfirm}
            disabled={!selected || submitting}
            className="w-full max-w-xs rounded-xl bg-amber-500 px-6 py-3.5 text-base font-display font-bold text-white shadow-lg shadow-amber-500/25 transition-all hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {confirmLabel}
          </button>
        </div>

        <p className="mt-4 text-center text-[12px] text-stone-600">
          {t("race.permanentChoice")}
        </p>
      </div>
    </div>
  );
}
