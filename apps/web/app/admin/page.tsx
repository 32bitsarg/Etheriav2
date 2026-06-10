"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { OpsPanel } from "./OpsPanel";

// El editor (aldea/terreno/bots) es pesado y solo se carga al abrir su tab
const EditorClient = dynamic(() => import("../editor/EditorClient"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-24 text-sm text-stone-400">
      Cargando editor...
    </div>
  ),
});

type AdminTab = "ops" | "editor";

const EDITOR_ENABLED =
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ENABLE_EDITOR === "true";

// Panel único de administración: operaciones (servicios/logs/perf/deploy),
// editor de aldea y terreno, y administración de bots — antes repartidos
// entre /editor y /play/metheriaadmia.
export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("ops");

  const tabs: { id: AdminTab; label: string; enabled: boolean }[] = [
    { id: "ops", label: "🛠️ Operaciones", enabled: true },
    { id: "editor", label: "🎨 Editor & Bots", enabled: EDITOR_ENABLED },
  ];

  return (
    <div className="min-h-screen bg-[#0b0f0f]">
      <nav className="sticky top-0 z-50 flex items-center gap-1 border-b border-white/10 bg-black/80 px-4 py-2 backdrop-blur-xl">
        <span className="mr-3 text-sm font-bold text-amber-400">⚙️ Etheria Admin</span>
        {tabs.filter((t) => t.enabled).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-amber-500/15 text-amber-300"
                : "text-stone-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "ops" && <OpsPanel />}
      {tab === "editor" && EDITOR_ENABLED && <EditorClient />}
    </div>
  );
}
