"use client";

import { useGameStore } from "@/stores/gameStore";
import { BUILDING_INFO, UNIT_INFO, formatTime, formatShortTime } from "@/lib/constants";
import { Panel } from "@/components/ui/Panel";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useCountdown } from "@/hooks/useCountdown";

export function QueuePanel() {
  const buildQueues = useGameStore((s) => s.buildQueues);
  const trainingQueues = useGameStore((s) => s.trainingQueues);

  if (buildQueues.length === 0 && trainingQueues.length === 0) return null;

  return (
    <div className="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
      <Panel animation="slide-up" className="overflow-hidden">
        <div className="flex items-center gap-4 px-4 py-2 border-b border-etheria-border bg-gradient-to-r from-etheria-panel to-etheria-panel-light">
          <span className="text-xs font-bold uppercase tracking-wider text-etheria-gold">Queues</span>
          <span className="text-[10px] text-etheria-text-dim">
            {buildQueues.length + trainingQueues.length} active
          </span>
        </div>

        <div className="flex items-center gap-3 px-4 py-3 max-w-lg">
          {/* Build Queues */}
          {buildQueues.map((queue) => (
            <BuildQueueItem key={queue.id} queue={queue} />
          ))}

          {/* Training Queues */}
          {trainingQueues.map((queue) => (
            <TrainingQueueItem key={queue.id} queue={queue} />
          ))}
        </div>
      </Panel>
    </div>
  );
}

function BuildQueueItem({ queue }: { queue: { id: string; buildingType: string; targetLevel: number; startedAt: string; completesAt: string } }) {
  const info = BUILDING_INFO[queue.buildingType as keyof typeof BUILDING_INFO];
  const { remaining, progress } = useCountdown(queue.completesAt);
  const seconds = remaining() ?? 0;

  return (
    <div className="flex items-center gap-2 bg-etheria-bg-light/50 rounded-lg px-3 py-2 border border-etheria-border/50 min-w-[180px]">
      <span className="text-lg">{info?.icon ?? "🏗️"}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold text-etheria-text truncate">
            {info?.name ?? queue.buildingType} → L{queue.targetLevel}
          </span>
          <span className="text-[10px] font-mono text-amber-400 ml-2">
            {formatTime(seconds)}
          </span>
        </div>
        <ProgressBar value={progress(queue.startedAt)} max={100} size="sm" color="gold" />
      </div>
    </div>
  );
}

function TrainingQueueItem({ queue }: { queue: { id: string; unitType: string; count: number; startedAt: string; completesAt: string } }) {
  const info = UNIT_INFO[queue.unitType as keyof typeof UNIT_INFO];
  const { remaining, progress } = useCountdown(queue.completesAt);
  const seconds = remaining() ?? 0;

  return (
    <div className="flex items-center gap-2 bg-etheria-bg-light/50 rounded-lg px-3 py-2 border border-etheria-border/50 min-w-[180px]">
      <span className="text-lg">{info?.icon ?? "🎖️"}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold text-etheria-text truncate">
            {info?.name ?? queue.unitType} ×{queue.count}
          </span>
          <span className="text-[10px] font-mono text-blue-400 ml-2">
            {formatTime(seconds)}
          </span>
        </div>
        <ProgressBar value={progress(queue.startedAt)} max={100} size="sm" color="blue" />
      </div>
    </div>
  );
}
