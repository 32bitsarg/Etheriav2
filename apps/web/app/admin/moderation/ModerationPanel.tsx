"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getAdminSecret, setAdminSecret } from "@/lib/adminClient";
import { UsersPanel } from "./UsersPanel";
import { ChatModPanel } from "./ChatModPanel";
import { StatsPanel } from "./StatsPanel";
import { AuditPanel } from "./AuditPanel";

const qc = new QueryClient();

type Tab = "users" | "chat" | "stats" | "audit";

const TABS: { id: Tab; label: string }[] = [
  { id: "stats", label: "📊 Estadísticas" },
  { id: "users", label: "👥 Usuarios" },
  { id: "chat", label: "💬 Chat" },
  { id: "audit", label: "📋 Auditoría" },
];

function ModerationContent() {
  const [tab, setTab] = useState<Tab>("stats");
  const [secret, setSecretState] = useState(() => getAdminSecret());
  const [input, setInput] = useState("");

  if (!secret) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="w-80 rounded-2xl border border-white/10 bg-[#0f1412] p-8 text-center">
          <h2 className="mb-1 font-serif text-xl text-amber-300">🛡️ Moderación</h2>
          <p className="mb-6 text-xs text-stone-500">Ingresá el secreto de administrador</p>
          <input
            type="password"
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Admin secret"
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-stone-600 mb-4"
            onKeyDown={(e) => {
              if (e.key === "Enter" && input.trim()) {
                setAdminSecret(input.trim());
                setSecretState(input.trim());
              }
            }}
          />
          <button
            onClick={() => { if (input.trim()) { setAdminSecret(input.trim()); setSecretState(input.trim()); } }}
            className="w-full rounded-lg bg-amber-500/20 py-2 text-sm font-bold text-amber-300 hover:bg-amber-500/30 transition-colors"
          >
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-1 border-b border-white/10 pb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.id ? "bg-amber-500/15 text-amber-300" : "text-stone-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "stats" && <StatsPanel />}
      {tab === "users" && <UsersPanel />}
      {tab === "chat" && <ChatModPanel />}
      {tab === "audit" && <AuditPanel />}
    </div>
  );
}

export default function ModerationPanel() {
  return (
    <QueryClientProvider client={qc}>
      <ModerationContent />
    </QueryClientProvider>
  );
}
