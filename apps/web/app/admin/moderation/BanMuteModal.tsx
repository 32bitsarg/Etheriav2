"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "./adminApi";

type Mode = "ban" | "mute";

const PRESETS = [
  { label: "1 hora", hours: 1 },
  { label: "24 horas", hours: 24 },
  { label: "7 días", hours: 168 },
  { label: "30 días", hours: 720 },
  { label: "Permanente", hours: null },
];

export function BanMuteModal({
  userId,
  userName,
  mode,
  onClose,
}: {
  userId: string;
  userName: string | null;
  mode: Mode;
  onClose: () => void;
}) {
  const [durationHours, setDurationHours] = useState<number | null>(24);
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      adminFetch(`/admin/users/${userId}/${mode}`, {
        method: "POST",
        body: JSON.stringify({ reason, durationHours }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "user", userId] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1412] p-6 shadow-2xl">
        <h2 className="mb-4 text-base font-bold text-white">
          {mode === "ban" ? "🔨 Banear" : "🔇 Mutear"}: <span className="text-amber-300">{userName ?? userId}</span>
        </h2>

        <div className="mb-4">
          <p className="mb-2 text-xs text-stone-400">Duración</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => setDurationHours(p.hours)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  durationHours === p.hours
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "border border-white/10 text-stone-400 hover:bg-white/5"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <p className="mb-1 text-xs text-stone-400">Razón <span className="text-rose-400">*</span></p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo del sanción..."
            rows={3}
            className="w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-stone-600 outline-none focus:border-amber-500/40"
          />
        </div>

        {mutation.isError && (
          <p className="mb-3 text-xs text-rose-400">{(mutation.error as Error).message}</p>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => mutation.mutate()}
            disabled={!reason.trim() || mutation.isPending}
            className="flex-1 rounded-lg bg-rose-600 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-40 transition-colors"
          >
            {mutation.isPending ? "Aplicando..." : mode === "ban" ? "Confirmar ban" : "Confirmar mute"}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-stone-400 hover:bg-white/5"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
