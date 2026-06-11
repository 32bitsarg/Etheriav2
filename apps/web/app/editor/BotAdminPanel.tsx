"use client";

import { useEffect, useState } from "react";
import { useWorlds, type WorldItem } from "@/hooks/useWorlds";
import { adminHeaders } from "@/lib/adminClient";

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
  userName?: string | null;
  cityName?: string | null;
};

function adminFetch(path: string, options?: RequestInit) {
  const url = `/api/editor/admin?path=${encodeURIComponent(path)}`;
  return fetch(url, { ...options, headers: { ...adminHeaders(), ...options?.headers } });
}

function relativeTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

export function BotAdminPanel({ apiTarget }: { apiTarget: "local" | "prod" }) {
  void apiTarget;

  const { data: worlds } = useWorlds();
  const [selectedWorld, setSelectedWorld] = useState("default");
  const [bots, setBots] = useState<BotRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [ensuring, setEnsuring] = useState(false);
  const [newProfile, setNewProfile] = useState("BALANCED");
  const [tickMsg, setTickMsg] = useState<string | null>(null);

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
    setTickMsg(null);
    try {
      const res = await adminFetch("admin/bots/tick", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        await fetchBots();
        setTickMsg(`✓ ${data.processed} procesados, ${data.errors} errores`);
        setTimeout(() => setTickMsg(null), 4000);
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  const ensurePopulation = async () => {
    setEnsuring(true);
    try {
      const res = await adminFetch(`admin/bots/ensure-population?worldId=${selectedWorld}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      await fetchBots();
      setTickMsg(`✓ Población asegurada — ${data.count} bots`);
      setTimeout(() => setTickMsg(null), 4000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setEnsuring(false);
    }
  };

  const profileColor = (profile: string) => {
    switch (profile) {
      case "ECONOMIST": return "text-green-400";
      case "MILITARIST": return "text-red-400";
      case "TECH_RUSHER": return "text-blue-400";
      case "ALLIANCE": return "text-purple-400";
      default: return "text-amber-400";
    }
  };

  const activeCount = bots.filter((b) => b.status === "ACTIVE").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-3 flex-wrap">
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
        <span className="text-xs text-stone-500">{activeCount}/{bots.length} activos</span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-200">×</button>
        </div>
      )}

      {tickMsg && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">
          {tickMsg}
        </div>
      )}

      <div className="space-y-2 mb-4">
        {loading && (
          <div className="text-center py-4 text-stone-500 text-sm">Cargando...</div>
        )}
        {bots.map((bot) => (
          <div key={bot.id} className="rounded-xl border border-white/8 bg-black/25 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-base">🤖</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-white/90 truncate">
                    {bot.userName ?? <span className="text-stone-500 italic">sin nombre</span>}
                  </span>
                  <span className={`text-[10px] font-bold ${profileColor(bot.profile)}`}>{bot.profile}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${bot.status === "ACTIVE" ? "bg-green-500/20 text-green-300" : "bg-stone-500/20 text-stone-400"}`}>
                    {bot.status}
                  </span>
                </div>
                <div className="flex gap-3 mt-0.5 text-[10px] text-stone-500 font-mono">
                  <span title="Ciudad">{bot.cityName ?? "?"}</span>
                  <span>·</span>
                  <span title="Último tick">{relativeTime(bot.lastTickAt)}</span>
                  <span>·</span>
                  <span>{bot.id.slice(0, 8)}</span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                {bot.status === "ACTIVE" ? (
                  <button onClick={() => toggleBot(bot.id, "PAUSED")} className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-300 hover:bg-amber-500/20">
                    ⏸
                  </button>
                ) : (
                  <button onClick={() => toggleBot(bot.id, "ACTIVE")} className="rounded-lg border border-green-500/20 bg-green-500/10 px-2 py-1 text-[11px] text-green-300 hover:bg-green-500/20">
                    ▶
                  </button>
                )}
                <button onClick={() => deleteBot(bot.id)} className="rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-1 text-[11px] text-red-300 hover:bg-red-500/20">
                  🗑
                </button>
              </div>
            </div>
          </div>
        ))}

        {!loading && bots.length === 0 && (
          <div className="rounded-xl border border-white/5 bg-black/20 px-4 py-6 text-center text-sm text-stone-500">
            No hay bots en este mundo.
          </div>
        )}
      </div>

      {/* Create + actions bar */}
      <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 space-y-2">
        <div className="flex items-center gap-2">
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
            <option value="ALLIANCE">ALLIANCE</option>
          </select>
          <button
            onClick={createBot}
            disabled={creating}
            className="rounded-lg bg-amber-500/80 hover:bg-amber-500 px-3 py-1.5 text-sm font-semibold text-black disabled:opacity-40"
          >
            {creating ? "..." : "+ Crear"}
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={ensurePopulation}
            disabled={ensuring}
            className="rounded-lg border border-purple-500/20 bg-purple-500/10 px-3 py-1.5 text-xs text-purple-300 hover:bg-purple-500/20 disabled:opacity-40"
          >
            {ensuring ? "..." : "🔧 Asegurar población"}
          </button>
          <button
            onClick={runTick}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-stone-400 hover:text-white"
          >
            ⚡ Forzar tick
          </button>
          <button
            onClick={fetchBots}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-stone-400 hover:text-white"
          >
            🔄 Refrescar
          </button>
        </div>
      </div>
    </div>
  );
}
