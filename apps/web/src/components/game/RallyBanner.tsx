"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGameStore } from "@/stores/gameStore";
import { useState, useEffect } from "react";
import { useToastStore } from "@/stores/toastStore";

interface Rally {
  id: string;
  createdByCityId: string;
  targetCityId?: string;
  targetCampId?: string;
  launchAt: string;
  status: string;
  participants: { cityId: string; units: { type: string; count: number }[] }[];
}

function useCountdown(target: string) {
  const [diff, setDiff] = useState(new Date(target).getTime() - Date.now());
  useEffect(() => {
    const id = setInterval(() => setDiff(new Date(target).getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (diff <= 0) return "¡Lanzando!";
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function RallyCountdown({ rally, cityId, onJoin }: { rally: Rally; cityId: string; onJoin: (r: Rally) => void }) {
  const timer = useCountdown(rally.launchAt);
  const alreadyJoined = rally.participants.some((p) => p.cityId === cityId);

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-red-600 text-white rounded-xl">
      <span className="text-lg">🚩</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold">¡Rally de Alianza!</p>
        <p className="text-[10px] opacity-80">{rally.participants.length} participantes</p>
      </div>
      <span className="font-mono font-bold text-sm tabular-nums">{timer}</span>
      {!alreadyJoined && (
        <button
          onClick={() => onJoin(rally)}
          className="px-3 py-1 bg-white text-red-600 text-xs font-bold rounded-lg hover:bg-red-50 transition-colors"
        >
          Unirme
        </button>
      )}
      {alreadyJoined && (
        <span className="px-3 py-1 bg-white/20 text-white text-xs font-bold rounded-lg">✓ Unido</span>
      )}
    </div>
  );
}

export function RallyBanner() {
  const cityId = useGameStore((s) => s.cityId);
  const addToast = useToastStore((s) => s.addToast);
  const qc = useQueryClient();
  const [joiningRally, setJoiningRally] = useState<Rally | null>(null);

  const { data } = useQuery<{ rallies: Rally[] }>({
    queryKey: ["active-rallies", cityId],
    queryFn: async () => {
      if (!cityId) return { rallies: [] };
      const res = await fetch(`/api/rally/active?cityId=${cityId}`, { credentials: "include" });
      return res.ok ? res.json() : { rallies: [] };
    },
    enabled: !!cityId,
    refetchInterval: 15000,
  });

  const openRallies = (data?.rallies ?? []).filter((r) => r.status === "OPEN");

  if (openRallies.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {openRallies.map((r) => (
        <RallyCountdown
          key={r.id}
          rally={r}
          cityId={cityId ?? ""}
          onJoin={setJoiningRally}
        />
      ))}
      {joiningRally && (
        <JoinRallyModal
          rally={joiningRally}
          cityId={cityId ?? ""}
          onClose={() => setJoiningRally(null)}
          onSuccess={() => {
            setJoiningRally(null);
            qc.invalidateQueries({ queryKey: ["active-rallies", cityId] });
            addToast({ title: "Rally", message: "¡Te uniste al rally!", type: "success" });
          }}
        />
      )}
    </div>
  );
}

function JoinRallyModal({ rally, cityId, onClose, onSuccess }: {
  rally: Rally;
  cityId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [units, setUnits] = useState<{ type: string; count: number }[]>([]);
  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      fetch(`/api/rally/${rally.id}/join`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cityId, units: units.filter((u) => u.count > 0) }),
      }).then((r) => r.json()),
    onSuccess: (d) => {
      if (d.error) return;
      onSuccess();
    },
  });

  const UNIT_TYPES = ["WARRIOR", "ARCHER", "CAVALRY", "SIEGE"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xs bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="px-4 py-3 bg-red-600 text-white flex items-center justify-between">
          <span className="font-bold">Unirse al Rally</span>
          <button onClick={onClose} className="opacity-70 hover:opacity-100">✕</button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-sm text-stone-600">¿Cuántas tropas envías?</p>
          {UNIT_TYPES.map((type) => {
            const u = units.find((x) => x.type === type);
            return (
              <div key={type} className="flex items-center gap-2">
                <span className="text-xs text-stone-600 w-20">{type}</span>
                <input
                  type="number"
                  min={0}
                  value={u?.count ?? 0}
                  onChange={(e) => {
                    const count = parseInt(e.target.value) || 0;
                    setUnits((prev) => {
                      const filtered = prev.filter((x) => x.type !== type);
                      return count > 0 ? [...filtered, { type, count }] : filtered;
                    });
                  }}
                  className="flex-1 border border-stone-200 rounded-lg px-3 py-1.5 text-sm"
                />
              </div>
            );
          })}
          <button
            onClick={() => mutate()}
            disabled={isPending || units.length === 0}
            className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl disabled:opacity-50"
          >
            Unirme al Rally
          </button>
        </div>
      </div>
    </div>
  );
}
