"use client";

import { useState } from "react";
import { useGameStore } from "@/stores/gameStore";
import { useTechs, useResearchTech, type TechData } from "@/hooks/useCity";
import { formatTime, getTechIconPath } from "@/lib/constants";
import { Panel } from "@/components/ui/Panel";
import { PanelHeader } from "@/components/ui/PanelHeader";
import { TabBar } from "@/components/ui/TabBar";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { toastError, toastSuccess } from "@/stores/toastStore";
import { useCountdown } from "@/hooks/useCountdown";

type Category = "ECONOMY" | "MILITARY" | "DEFENSE";

const CATEGORY_LABELS: Record<Category, string> = {
  ECONOMY: "Economy",
  MILITARY: "Military",
  DEFENSE: "Defense",
};

const CATEGORY_ICONS: Record<Category, string> = {
  ECONOMY: "💰",
  MILITARY: "⚔️",
  DEFENSE: "🛡️",
};

const CATEGORY_COLORS: Record<Category, string> = {
  ECONOMY: "text-emerald-400",
  MILITARY: "text-red-400",
  DEFENSE: "text-blue-400",
};

export function ResearchPanel() {
  const [tab, setTab] = useState<Category>("ECONOMY");
  const cityId = useGameStore((s) => s.cityId);
  const setShowResearch = useGameStore((s) => s.setShowResearch);

  if (!cityId) return null;

  return (
    <div className="pointer-events-auto absolute bottom-4 left-[380px] z-20">
      <Panel animation="slide-left" className="w-[380px] max-h-[480px] flex flex-col">
        <PanelHeader
          title="Research Lab"
          icon="📚"
          onClose={() => setShowResearch(false)}
        />

        <TabBar
          tabs={(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => ({
            id: cat,
            label: CATEGORY_LABELS[cat],
            icon: CATEGORY_ICONS[cat],
          }))}
          activeTab={tab}
          onChange={(id) => setTab(id as Category)}
        />

        <div className="p-3 overflow-y-auto flex-1">
          <TechList cityId={cityId} category={tab} />
        </div>
      </Panel>
    </div>
  );
}

function TechList({ cityId, category }: { cityId: string; category: Category }) {
  const { data, isLoading } = useTechs(cityId);
  const researchMutation = useResearchTech();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <span className="text-2xl animate-pulse">📚</span>
          <p className="text-xs text-etheria-text-dim mt-2">Loading technologies...</p>
        </div>
      </div>
    );
  }

  const techs = data?.techs?.filter((t) => t.category === category) ?? [];
  const activeResearch = data?.activeResearch;

  return (
    <div className="space-y-2">
      {activeResearch && (
        <ActiveResearchCard activeResearch={activeResearch} techs={techs} />
      )}

      {techs.length === 0 && (
        <div className="text-etheria-text-dim text-sm text-center py-6">No technologies available</div>
      )}

      {techs.map((tech) => (
        <TechCard
          key={tech.techId}
          tech={tech}
          isResearching={activeResearch?.techId === tech.techId}
          onResearch={() => {
            researchMutation.mutate(
              { cityId, techId: tech.techId },
              {
                onSuccess: () => {
                  toastSuccess("Research Started", `${tech.name} is now being researched.`);
                },
                onError: (err) => {
                  toastError("Research Failed", err.message);
                },
              }
            );
          }}
          isPending={researchMutation.isPending}
        />
      ))}
    </div>
  );
}

function ActiveResearchCard({ activeResearch, techs }: { activeResearch: { techId: string; targetLevel: number; completesAt: string }; techs: TechData[] }) {
  const { remaining, progress } = useCountdown(activeResearch.completesAt);
  const seconds = remaining() ?? 0;
  const tech = techs.find((t) => t.techId === activeResearch.techId);

  return (
    <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg p-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Researching</span>
        <span className="text-[10px] font-mono text-amber-400">{formatTime(seconds)}</span>
      </div>
      <div className="text-sm text-etheria-text mb-1">
        {tech?.name ?? activeResearch.techId} → Level {activeResearch.targetLevel}
      </div>
      <ProgressBar value={progress(new Date())} max={100} size="sm" color="gold" />
    </div>
  );
}

function TechCard({
  tech,
  isResearching,
  onResearch,
  isPending,
}: {
  tech: TechData;
  isResearching: boolean;
  onResearch: () => void;
  isPending: boolean;
}) {
  const isMaxed = tech.currentLevel >= tech.maxLevel;
  const canResearch = tech.canResearch && !isResearching && !isPending;
  const iconPath = getTechIconPath(tech.techId);

  return (
    <div className={`rounded-lg border p-3 transition-all ${
      isResearching
        ? "bg-amber-900/20 border-amber-700/40 shadow-[0_0_12px_rgba(251,191,36,0.1)]"
        : isMaxed
        ? "bg-emerald-900/10 border-emerald-700/30"
        : "bg-etheria-bg-light/30 border-etheria-border/50 hover:border-etheria-border-light"
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="shrink-0 w-10 h-10 rounded-lg bg-black/30 border border-white/10 flex items-center justify-center overflow-hidden">
          {iconPath ? (
            <img src={iconPath} alt="" className="h-9 w-9 object-contain" />
          ) : (
            <span className="text-xs text-etheria-text-dim">{tech.techId.slice(0, 2)}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[9px] font-bold uppercase ${CATEGORY_COLORS[tech.category as Category]}`}>
              {tech.category}
            </span>
            <Badge variant={isMaxed ? "green" : "gray"} size="sm">
              L{tech.currentLevel}/{tech.maxLevel}
            </Badge>
          </div>
          <h4 className="text-sm font-bold text-etheria-text">{tech.name}</h4>
          <p className="text-[11px] text-etheria-text-dim mt-0.5 leading-relaxed">{tech.description}</p>
        </div>

        {!isMaxed && (
          <button
            onClick={onResearch}
            disabled={!canResearch}
            className={`shrink-0 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
              canResearch
                ? "bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white shadow-lg"
                : "bg-etheria-bg-light text-etheria-text-dim cursor-not-allowed"
            }`}
          >
            {isResearching ? "..." : "Research"}
          </button>
        )}
      </div>

      {!isMaxed && tech.nextLevelCost && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
          <span className="text-etheria-text-dim">Cost:</span>
          {tech.nextLevelCost.gold > 0 && (
            <span className="text-amber-400">🪙 {tech.nextLevelCost.gold.toLocaleString()}</span>
          )}
          {tech.nextLevelCost.wood > 0 && (
            <span className="text-emerald-400">🪵 {tech.nextLevelCost.wood.toLocaleString()}</span>
          )}
          {tech.nextLevelCost.stone > 0 && (
            <span className="text-etheria-stone">🪨 {tech.nextLevelCost.stone.toLocaleString()}</span>
          )}
          {tech.nextLevelCost.food > 0 && (
            <span className="text-etheria-food">🍖 {tech.nextLevelCost.food.toLocaleString()}</span>
          )}
          {tech.nextLevelTime && (
            <span className="text-etheria-text-dim ml-auto">
              ⏱ {formatTime(tech.nextLevelTime)}
            </span>
          )}
        </div>
      )}

      {!canResearch && !isMaxed && tech.researchBlockedReason && (
        <div className="mt-1.5 text-[10px] text-red-400">{tech.researchBlockedReason}</div>
      )}
    </div>
  );
}
