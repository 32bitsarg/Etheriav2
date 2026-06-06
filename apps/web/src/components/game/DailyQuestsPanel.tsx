"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGameStore } from "@/stores/gameStore";
import { useToastStore } from "@/stores/toastStore";
import { Modal } from "@/components/ui/Modal";

interface DailyQuest {
  id: string;
  questId: string;
  title: string;
  summary: string;
  target: number;
  progress: number;
  status: "ACTIVE" | "CLAIMABLE" | "CLAIMED";
  reward: { gold?: number; wood?: number; stone?: number; food?: number };
  date: string;
}

function CountdownClock({ nextReset }: { nextReset: string }) {
  const diff = new Date(nextReset).getTime() - Date.now();
  if (diff <= 0) return <span>Resetea pronto</span>;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return <span>{h}h {m}m hasta el reseteo</span>;
}

export function DailyQuestsPanel({ onClose }: { onClose: () => void }) {
  const cityId = useGameStore((s) => s.cityId);
  const addToast = useToastStore((s) => s.addToast);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ quests: DailyQuest[]; nextReset: string }>({
    queryKey: ["daily-quests", cityId],
    queryFn: async () => {
      const res = await fetch(`/api/daily-quests?cityId=${cityId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
    enabled: !!cityId,
    refetchInterval: 30000,
  });

  const claim = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/daily-quests/${id}/claim`, { method: "POST", credentials: "include" }).then((r) => r.json()),
    onSuccess: (d) => {
      addToast({ title: "Misión completada", message: `+${d.reward?.gold ?? 0} oro`, type: "success" });
      qc.invalidateQueries({ queryKey: ["daily-quests", cityId] });
      qc.invalidateQueries({ queryKey: ["play-initial", cityId] });
    },
    onError: () => addToast({ title: "Error", message: "Error al reclamar", type: "error" }),
  });

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Misiones Diarias"
      subtitle={data?.nextReset ? undefined : "Cargando..."}
      headerGradient="from-amber-500 to-orange-500"
      headerIcon="📋"
    >
      {/* Subtitle with countdown inside content */}
      {data?.nextReset && (
        <div className="px-5 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-700">
          <CountdownClock nextReset={data.nextReset} />
        </div>
      )}

      <div className="p-4 space-y-3">
        {isLoading && (
          <div className="py-8 text-center text-stone-400 text-sm">Cargando misiones...</div>
        )}
        {(data?.quests ?? []).map((q) => {
          const pct = Math.min(100, (q.progress / q.target) * 100);
          const rewardSummary = Object.entries(q.reward)
            .filter(([, v]) => v)
            .map(([k, v]) => `${v} ${k}`)
            .join(" · ");
          return (
            <div
              key={q.id}
              className={`rounded-2xl border p-3 ${q.status === "CLAIMED" ? "bg-stone-50 border-stone-100 opacity-60" : "bg-white border-stone-200"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-stone-800">{q.title}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{q.summary}</p>
                  <div className="mt-2 h-1.5 rounded-full bg-stone-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-stone-400 mt-1">{q.progress}/{q.target} • {rewardSummary}</p>
                </div>
                {q.status === "CLAIMABLE" && (
                  <button
                    onClick={() => claim.mutate(q.id)}
                    disabled={claim.isPending}
                    className="flex-shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                  >
                    Reclamar
                  </button>
                )}
                {q.status === "CLAIMED" && (
                  <span className="flex-shrink-0 px-3 py-1.5 bg-green-100 text-green-700 text-xs font-bold rounded-xl">✓</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
