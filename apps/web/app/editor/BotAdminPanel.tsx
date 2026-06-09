"use client";

import { useEffect, useState } from "react";
import { useWorlds, type WorldItem } from "@/hooks/useWorlds";

type BotRecord = {
  id: string;
  userId: string;
  cityId: string;
  worldId: string;
  profile: string;
  status: string;
  state?: any;
  nextTickAt: string;
  lastTickAt?: string | null;
};

function adminFetch(path: string, options?: RequestInit) {
  const url = `/api/editor/admin?path=${encodeURIComponent(path)}`;
  return fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
}

export function BotAdminPanel({ apiTarget }: { apiTarget: "local" | "prod" }) {
  void apiTarget;

  const { data: worlds } = useWorlds();
  const [selectedWorld, setSelectedWorld] = useState("default");
  const [bots, setBots] = useState<BotRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newProfile, setNewProfile] = useState("BALANCED");

  const fetchBots = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`admin/bots?worldId=${selectedWorld}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch bots");
      setBots(data.bots ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBots();
  }, [selectedWorld]);

  const createBot = async () => {
    setCreating(true);
    try {
      const res = await adminFetch("admin/bots", {
        method: "POST",
        body: JSON.stringify({ worldId: selectedWorld, profile: newProfile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create bot");
      await fetchBots();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const deleteBot = async (botId: string) => {
    if (!confirm("Eliminar este bot? Esto borra su ciudad y usuario.")) return;
    try {
      const res = await adminFetch(`admin/bots/${botId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete bot");
      await fetchBots();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const toggleBot = async (botId: string, newStatus: string) => {
    try {
      const res = await adminFetch(`admin/bots/${botId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update bot");
      await fetchBots();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const runTick = async () => {
    try {
      const res = await adminFetch("admin/bots/tick", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        await fetchBots();
        alert(`Tick: ${data.processed} procesados, ${data.errors} errores`);
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  const profileColor = (profile: string) => {
    switch (profile) {
      case "ECONOMIST": return "text-green-400";
      case "MILITARIST": return "text-red-400";
      case "TECH_RUSHER": return "text-blue-400";
      default: return "text-amber-400";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-3">
        <h3 className="font-serif text-lg text-etheria-gold-soft">🤖 Bots</h3>
        <select
          value={selectedWorld}
          onChange={(e) => setSelectedWorld(e.target.value)}
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-white"
        >
          {(worlds ?? []).map((w: WorldItem) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
        <span className="text-xs text-stone-500">{bots.length} bots</span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-200">x</button>
        </div>
      )}

      <div className="space-y-2 mb-4">
        {bots.map((bot) => (
          <div key={bot.id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/25 px-4 py-3">
            <span className="text-lg">🤖</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${profileColor(bot.profile)}`}>{bot.profile}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${bot.status === "ACTIVE" ? "bg-green-500/20 text-green-300" : "bg-stone-500/20 text-stone-400"}`}>
                  {bot.status}
                </span>
              </div>
              <div className="text-[11px] text-stone-500 font-mono mt-0.5">{bot.id.slice(0, 8)}</div>
            </div>
            <div className="flex gap-1">
              {bot.status === "ACTIVE" ? (
                <button onClick={() => toggleBot(bot.id, "PAUSED")} className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-300 hover:bg-amber-500/20">
                  ⏸ Pausar
                </button>
              ) : (
                <button onClick={() => toggleBot(bot.id, "ACTIVE")} className="rounded-lg border border-green-500/20 bg-green-500/10 px-2.5 py-1 text-[11px] text-green-300 hover:bg-green-500/20">
                  ▶ Activar
                </button>
              )}
              <button onClick={() => deleteBot(bot.id)} className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[11px] text-red-300 hover:bg-red-500/20">
                🗑 Eliminar
              </button>
            </div>
          </div>
        ))}

        {!loading && bots.length === 0 && (
          <div className="rounded-xl border border-white/5 bg-black/20 px-4 py-6 text-center text-sm text-stone-500">
            No hay bots en este mundo. Crea uno para empezar.
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
        <span className="text-sm text-stone-400">Crear:</span>
        <select
          value={newProfile}
          onChange={(e) => setNewProfile(e.target.value)}
          className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-sm text-white"
        >
          <option value="ECONOMIST">ECONOMIST</option>
          <option value="MILITARIST">MILITARIST</option>
          <option value="TECH_RUSHER">TECH_RUSHER</option>
          <option value="BALANCED">BALANCED</option>
        </select>
        <button
          onClick={createBot}
          disabled={creating}
          className="rounded-lg bg-amber-500/80 hover:bg-amber-500 px-3 py-1.5 text-sm font-semibold text-black disabled:opacity-40"
        >
          {creating ? "Creando..." : "+ Crear"}
        </button>
        <div className="flex-1" />
        <button
          onClick={runTick}
          className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-stone-400 hover:text-white"
        >
          Forzar tick
        </button>
        <button
          onClick={fetchBots}
          className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-stone-400 hover:text-white"
        >
          🔄 Refrescar
        </button>
      </div>
    </div>
  );
}
