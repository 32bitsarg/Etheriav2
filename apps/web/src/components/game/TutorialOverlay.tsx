"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/i18n";

const STEPS = [
  { key: "welcome", emoji: "🏰" },
  { key: "farm", emoji: "🌾" },
  { key: "barracks", emoji: "⚔️" },
  { key: "map", emoji: "🗺️" },
];

interface Props {
  initialStep: number;
  onComplete?: () => void;
}

export function TutorialOverlay({ initialStep, onComplete }: Props) {
  const { t } = useI18n();
  const [step, setStep] = useState(initialStep);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (step >= STEPS.length || dismissed) return;
  }, [step, dismissed]);

  if (step >= STEPS.length || dismissed) return null;

  const current = STEPS[step];

  async function advance() {
    const next = step + 1;
    if (next >= STEPS.length) {
      await fetch("/api/tutorial/complete", { method: "POST" }).catch(() => {});
      onComplete?.();
      setDismissed(true);
      return;
    }
    await fetch("/api/tutorial/advance", { method: "POST" }).catch(() => {});
    setStep(next);
  }

  async function skip() {
    await fetch("/api/tutorial/complete", { method: "POST" }).catch(() => {});
    onComplete?.();
    setDismissed(true);
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex justify-center px-4 sm:bottom-6">
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-4 rounded-2xl border border-etheria-gold/30 bg-[#0b1111]/95 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.7)] backdrop-blur-xl">
        <span className="shrink-0 text-4xl">{current?.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-etheria-gold/70 uppercase tracking-wide">
            {t("play.tutorial.step")} {step + 1}/{STEPS.length}
          </p>
          <p className="mt-0.5 text-sm font-medium text-white">
            {t(`play.tutorial.step${step + 1}.title`)}
          </p>
          <p className="mt-0.5 text-xs text-white/50 leading-relaxed">
            {t(`play.tutorial.step${step + 1}.body`)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          <button
            onClick={advance}
            className="min-h-[40px] rounded-xl bg-etheria-gold px-4 text-xs font-bold text-black hover:bg-amber-400"
          >
            {step + 1 >= STEPS.length ? t("play.tutorial.finish") : t("play.tutorial.next")}
          </button>
          <button
            onClick={skip}
            className="text-center text-[10px] text-white/30 hover:text-white/60"
          >
            {t("play.tutorial.skip")}
          </button>
        </div>
      </div>
    </div>
  );
}
