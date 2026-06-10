"use client";

import Link from "next/link";
import { useI18n } from "@/i18n";
import { RaceEmblem } from "@/components/RaceEmblem";

const DISPLAY_FONT = "var(--font-fredoka, Fredoka, system-ui, sans-serif)";

type RaceId = "human" | "elf" | "orc" | "dwarf";

interface RaceDisplay {
  id: RaceId;
  emoji: string;
  gradient: string;
  nameKey: string;
  descKey: string;
  loreTitleKey: string;
  loreKey: string;
  color: string;
  bonusKeys: string[];
  bonusValues: string[];
}

export function LoreSection() {
  const { t } = useI18n();

  const RACES: RaceDisplay[] = [
    {
      id: "human",
      emoji: "👑",
      gradient: "linear-gradient(135deg, #fde68a 0%, #f5a623 100%)",
      nameKey: "race.human.name",
      descKey: "race.human.description",
      loreTitleKey: "race.human.loreTitle",
      loreKey: "race.human.lore",
      color: "#f5a623",
      bonusKeys: ["race.bonus.goldProduction", "race.bonus.foodProduction", "race.bonus.defense"],
      bonusValues: ["+12%", "+8%", "+5%"],
    },
    {
      id: "elf",
      emoji: "🏹",
      gradient: "linear-gradient(135deg, #a8e6cf 0%, #4cd964 100%)",
      nameKey: "race.elf.name",
      descKey: "race.elf.description",
      loreTitleKey: "race.elf.loreTitle",
      loreKey: "race.elf.lore",
      color: "#4cd964",
      bonusKeys: ["race.bonus.woodProduction", "race.bonus.foodProduction", "race.bonus.attack"],
      bonusValues: ["+15%", "+10%", "+8%"],
    },
    {
      id: "orc",
      emoji: "💀",
      gradient: "linear-gradient(135deg, #fecaca 0%, #e74c3c 100%)",
      nameKey: "race.orc.name",
      descKey: "race.orc.description",
      loreTitleKey: "race.orc.loreTitle",
      loreKey: "race.orc.lore",
      color: "#e74c3c",
      bonusKeys: ["race.bonus.stoneProduction", "race.bonus.attack", "race.bonus.hp"],
      bonusValues: ["+15%", "+10%", "+10%"],
    },
    {
      id: "dwarf",
      emoji: "⚒️",
      gradient: "linear-gradient(135deg, #bfdbfe 0%, #4a90d9 100%)",
      nameKey: "race.dwarf.name",
      descKey: "race.dwarf.description",
      loreTitleKey: "race.dwarf.loreTitle",
      loreKey: "race.dwarf.lore",
      color: "#4a90d9",
      bonusKeys: ["race.bonus.goldProduction", "race.bonus.stoneProduction", "race.bonus.defense"],
      bonusValues: ["+12%", "+10%", "+15%"],
    },
  ];

  return (
    <section id="facciones" className="px-6 py-16" style={{ background: "#fdf7ee" }}>
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="inline-block rounded-full bg-purple-100 px-3.5 py-1 text-[13px] font-semibold text-purple-700" style={{ fontFamily: DISPLAY_FONT }}>
            {t("race.title")}
          </span>
          <h2 className="mt-4 text-4xl font-bold text-[#2c2118] sm:text-5xl" style={{ fontFamily: DISPLAY_FONT }}>
            {t("landing.chooseFaction")}
          </h2>
          <p className="mt-3 text-[16px] text-[#6f6052]">
            {t("landing.fourRaces")}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {RACES.map((race) => (
            <div key={race.id} className="group overflow-hidden rounded-[1.8rem] border border-[#f6ebdb] bg-white shadow-[0_10px_26px_-14px_rgba(60,40,20,.3)] transition-transform hover:-translate-y-1">
              <div className="relative h-44 overflow-hidden">
                <img
                  src={`/assets/races/${race.id}.webp`}
                  alt={t(race.nameKey)}
                  className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <RaceEmblem race={race.id} className="absolute bottom-2 right-2 h-10 w-10 drop-shadow-lg" />
              </div>

              <div className="p-5">
                <h3 className="text-xl font-bold text-[#2c2118]" style={{ fontFamily: DISPLAY_FONT }}>
                  {t(race.nameKey)}
                </h3>

                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.1em] italic" style={{ color: race.color }}>
                  {t(race.loreTitleKey)}
                </p>

                <p className="mt-2 text-[13px] leading-relaxed text-[#6f6052]">
                  {t(race.descKey)}
                </p>

                <div className="mt-3 rounded-xl bg-stone-50 border border-stone-100 p-3">
                  <p className="text-[12px] leading-relaxed text-stone-500 italic">
                    {t(race.loreKey)}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {race.bonusKeys.map((key, i) => (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold"
                      style={{ background: race.color + "18", color: race.color }}
                    >
                      {t(key)} {race.bonusValues[i]}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/registro"
            className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-8 py-3.5 text-[16px] font-semibold text-white shadow-[0_14px_30px_-8px_rgba(124,58,237,.6)] transition-transform hover:-translate-y-0.5 hover:bg-purple-700"
            style={{ fontFamily: DISPLAY_FONT }}
          >
            {t("race.selectPrompt")} →
          </Link>
        </div>
      </div>
    </section>
  );
}
