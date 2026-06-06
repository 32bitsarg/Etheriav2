"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGameStore } from "@/stores/gameStore";
import { useToastStore } from "@/stores/toastStore";
import { Modal } from "@/components/ui/Modal";

interface Wonder {
  id: string;
  holderAllianceId: string | null;
  holderAllianceName: string | null;
  holderCityId: string | null;
  holderCityName: string | null;
  daysControlled: number;
  daysToWin: number;
  controlStartedAt: string | null;
}

export function WonderPanel({ onClose }: { onClose: () => void }) {
  const cityId = useGameStore((s) => s.cityId);
  const addToast = useToastStore((s) => s.addToast);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ wonder: Wonder }>({
    queryKey: ["wonder"],
    queryFn: async () => {
      const res = await fetch("/api/wonder", { credentials: "include" });
      return res.ok ? res.json() : { wonder: null };
    },
    refetchInterval: 30000,
  });

  const attack = useMutation({
    mutationFn: () =>
      fetch("/api/wonder/attack", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cityId, units: [] }),
      }).then((r) => r.json()),
    onSuccess: (d) => {
      if (d.error) { addToast({ title: "Error", message: d.error, type: "error" }); return; }
      addToast({ title: "Wonder", message: d.message ?? "¡Control capturado!", type: "success" });
      qc.invalidateQueries({ queryKey: ["wonder"] });
    },
  });

  const wonder = data?.wonder;
  const pct = wonder ? Math.min(100, (wonder.daysControlled / wonder.daysToWin) * 100) : 0;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="La Maravilla"
      subtitle={`Controla ${wonder?.daysToWin ?? 7} días para ganar la temporada`}
      headerGradient="from-amber-700 to-yellow-600"
      headerIcon="🏛️"
    >
      <div className="p-5">
        {isLoading ? (
          <div className="py-8 text-center text-stone-400">Cargando...</div>
        ) : wonder ? (
          <>
            <div className="text-center mb-4">
              <div className="text-5xl mb-2">🏛️</div>
              {wonder.holderAllianceName ? (
                <>
                  <p className="text-sm font-bold text-stone-700">{wonder.holderAllianceName}</p>
                  <p className="text-xs text-stone-500">controla La Maravilla desde {wonder.holderCityName}</p>
                </>
              ) : (
                <p className="text-sm text-stone-500">La Maravilla no tiene dueño</p>
              )}
            </div>

            <div className="bg-amber-50 rounded-2xl p-3 mb-4">
              <div className="flex justify-between text-xs text-stone-600 mb-1">
                <span>Progreso de conquista</span>
                <span className="font-bold">{wonder.daysControlled}/{wonder.daysToWin} días</span>
              </div>
              <div className="h-3 rounded-full bg-stone-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              {pct >= 100 && (
                <p className="text-xs text-amber-700 font-bold text-center mt-2">¡Esta alianza ganó la temporada! 🎉</p>
              )}
            </div>

            <button
              onClick={() => attack.mutate()}
              disabled={attack.isPending}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              ⚔️ Atacar La Maravilla
            </button>
            <p className="text-xs text-stone-400 text-center mt-2">Requiere estar en una alianza</p>
          </>
        ) : (
          <div className="text-center text-stone-400 py-8">No se pudo cargar La Maravilla</div>
        )}
      </div>
    </Modal>
  );
}
