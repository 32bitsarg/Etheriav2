"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "./adminApi";
import { BanMuteModal } from "./BanMuteModal";

function fmt(date: string) {
  return new Date(date).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

export function ChatModPanel() {
  const [channel, setChannel] = useState("");
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [senderUserId, setSenderUserId] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [muteTarget, setMuteTarget] = useState<{ id: string; name: string } | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["admin", "chat", { channel, q, senderUserId }],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "50" });
      if (channel) params.set("channel", channel);
      if (q) params.set("q", q);
      if (senderUserId) params.set("senderUserId", senderUserId);
      return adminFetch(`/admin/chat/messages?${params}`);
    },
    staleTime: 10_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminFetch(`/admin/chat/messages/${id}`, { method: "DELETE" }),
    onSuccess: () => { setConfirmDelete(null); queryClient.invalidateQueries({ queryKey: ["admin", "chat"] }); },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-stone-300 outline-none"
        >
          <option value="">Todos los canales</option>
          <option value="GLOBAL">GLOBAL</option>
          <option value="ALLIANCE">ALLIANCE</option>
          <option value="PRIVATE">PRIVATE</option>
        </select>
        <input
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setQ(qInput)}
          placeholder="Buscar texto..."
          className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-white placeholder:text-stone-600 outline-none"
        />
        <input
          value={senderUserId}
          onChange={(e) => setSenderUserId(e.target.value)}
          placeholder="ID del jugador..."
          className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-white placeholder:text-stone-600 outline-none font-mono text-xs w-52"
        />
        <button onClick={() => setQ(qInput)} className="rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-500/25">Buscar</button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-stone-500">Cargando mensajes...</div>
      ) : isError ? (
        <div className="text-center py-12 text-rose-400">Error al cargar mensajes</div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs text-stone-500">{(data?.messages ?? []).length} mensajes {data?.hasMore ? "(hay más)" : ""} {isFetching && "· actualizando..."}</div>
          {(data?.messages ?? []).map((m: any) => (
            <div key={m.id} className="group rounded-xl border border-white/5 bg-black/20 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-amber-300">{m.senderName}</span>
                    <span className="text-[10px] rounded bg-white/5 px-1.5 py-0.5 text-stone-500">{m.channel}</span>
                    <span className="text-[10px] text-stone-600">{fmt(m.createdAt)}</span>
                  </div>
                  <p className="text-sm text-stone-300 break-words">{m.message}</p>
                  <p className="mt-1 font-mono text-[10px] text-stone-600">{m.senderUserId}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => setMuteTarget({ id: m.senderUserId, name: m.senderName })}
                    className="rounded-lg bg-yellow-700/60 px-2 py-1 text-[10px] text-yellow-200 hover:bg-yellow-700"
                  >🔇</button>
                  {confirmDelete === m.id ? (
                    <button
                      onClick={() => deleteMutation.mutate(m.id)}
                      disabled={deleteMutation.isPending}
                      className="rounded-lg bg-rose-700 px-2 py-1 text-[10px] text-white font-bold"
                    >¿Confirmar?</button>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(m.id)}
                      className="rounded-lg bg-rose-700/60 px-2 py-1 text-[10px] text-rose-200 hover:bg-rose-700"
                    >🗑️</button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {(data?.messages ?? []).length === 0 && (
            <div className="text-center py-12 text-stone-600">No hay mensajes con ese filtro</div>
          )}
        </div>
      )}

      {muteTarget && (
        <BanMuteModal
          userId={muteTarget.id}
          userName={muteTarget.name}
          mode="mute"
          onClose={() => setMuteTarget(null)}
        />
      )}
    </div>
  );
}
