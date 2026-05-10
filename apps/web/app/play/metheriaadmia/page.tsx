"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Service = "api" | "web" | "caddy";
type Lines = "100" | "200" | "500";
type AdminResponse = {
  ok?: boolean;
  stdout?: string;
  stderr?: string;
  error?: string;
};

const SERVICES: Service[] = ["api", "web", "caddy"];
const STORAGE_KEY = "etheria_admin_secret";

async function adminRequest(path: string, secret: string, init?: RequestInit): Promise<AdminResponse> {
  const response = await fetch(`/api/admin/ops${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Secret": secret,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  }).catch((error) => {
    return null;
  });

  if (!response) {
    return { ok: false, error: "La conexion se corto. Si reiniciaste la API, espera unos segundos y refresca el estado." };
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, error: body.error ?? response.statusText };
  }
  return body;
}

export default function MetheriaadmiaPage() {
  const [secret, setSecret] = useState("");
  const [draftSecret, setDraftSecret] = useState("");
  const [activeService, setActiveService] = useState<Service>("api");
  const [lines, setLines] = useState<Lines>("200");
  const [status, setStatus] = useState<AdminResponse | null>(null);
  const [logs, setLogs] = useState<AdminResponse | null>(null);
  const [lastAction, setLastAction] = useState<AdminResponse | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const output = useMemo(() => {
    if (!logs) return "";
    return [logs.stdout, logs.stderr].filter(Boolean).join("\n\n");
  }, [logs]);

  useEffect(() => {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (stored) setSecret(stored);
  }, []);

  async function loadStatus() {
    if (!secret) return;
    setLoading("status");
    const result = await adminRequest("/status", secret);
    setStatus(result);
    setLoading(null);
  }

  async function loadLogs(service = activeService, nextLines = lines) {
    if (!secret) return;
    setLoading("logs");
    const result = await adminRequest(`/logs?service=${service}&lines=${nextLines}`, secret);
    setLogs(result);
    setLoading(null);
  }

  useEffect(() => {
    if (!secret) return;
    loadStatus();
    loadLogs();
  }, [secret]);

  useEffect(() => {
    if (!secret || !autoRefresh) return;
    const id = window.setInterval(() => loadLogs(), 5000);
    return () => window.clearInterval(id);
  }, [secret, autoRefresh, activeService, lines]);

  function submitSecret(event: FormEvent) {
    event.preventDefault();
    const value = draftSecret.trim();
    if (!value) return;
    window.sessionStorage.setItem(STORAGE_KEY, value);
    setSecret(value);
  }

  async function runAction(action: "restart" | "rebuild", service: "api" | "web") {
    const label = action === "restart" ? "reiniciar" : "rebuild";
    if (!window.confirm(`Confirmar ${label} ${service}?`)) return;
    setLoading(`${action}-${service}`);
    const result = await adminRequest(`/${action}`, secret, {
      method: "POST",
      body: JSON.stringify({ service }),
    });
    setLastAction(result);
    setLoading(null);
    await loadStatus();
    await loadLogs(service);
  }

  async function runDeploy() {
    if (!window.confirm("Confirmar deploy completo?")) return;
    setLoading("deploy");
    const result = await adminRequest("/deploy", secret, { method: "POST", body: "{}" });
    setLastAction(result);
    setLoading(null);
    await loadStatus();
  }

  if (!secret) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
        <form onSubmit={submitSecret} className="w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900 p-5 shadow-2xl">
          <h1 className="text-lg font-semibold">Metheriaadmia</h1>
          <p className="mt-2 text-sm text-slate-400">Ingresá la clave operativa para ver logs y acciones del VPS.</p>
          <input
            type="password"
            value={draftSecret}
            onChange={(event) => setDraftSecret(event.target.value)}
            className="mt-5 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-400"
            autoFocus
          />
          <button className="mt-4 w-full rounded-md bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400">
            Entrar
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 p-4 md:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-semibold">Metheriaadmia</h1>
            <p className="text-sm text-slate-400">Operaciones controladas de Etheria VPS</p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadStatus} className="rounded-md border border-slate-700 px-3 py-2 text-sm hover:bg-slate-900">Refrescar</button>
            <button
              onClick={() => {
                window.sessionStorage.removeItem(STORAGE_KEY);
                setSecret("");
              }}
              className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-900"
            >
              Salir
            </button>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Logs</h2>
              <div className="flex flex-wrap items-center gap-2">
                {SERVICES.map((service) => (
                  <button
                    key={service}
                    onClick={() => {
                      setActiveService(service);
                      loadLogs(service);
                    }}
                    className={`rounded-md px-3 py-2 text-sm ${activeService === service ? "bg-cyan-500 text-slate-950" : "border border-slate-700 hover:bg-slate-800"}`}
                  >
                    {service}
                  </button>
                ))}
                <select
                  value={lines}
                  onChange={(event) => {
                    const next = event.target.value as Lines;
                    setLines(next);
                    loadLogs(activeService, next);
                  }}
                  className="rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-sm"
                >
                  <option value="100">100</option>
                  <option value="200">200</option>
                  <option value="500">500</option>
                </select>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} />
                  Auto
                </label>
              </div>
            </div>
            <pre className="mt-4 h-[62vh] overflow-auto rounded-md bg-black p-4 text-xs leading-relaxed text-slate-200">
              {loading === "logs" ? "Cargando logs..." : output || "Sin logs cargados."}
            </pre>
          </div>

          <aside className="flex flex-col gap-4">
            <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Estado</h2>
              <pre className="mt-3 max-h-56 overflow-auto rounded-md bg-black p-3 text-xs text-slate-200">
                {loading === "status" ? "Consultando estado..." : [status?.stdout, status?.stderr, status?.error].filter(Boolean).join("\n\n") || "Sin estado."}
              </pre>
            </section>

            <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Acciones</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={() => runAction("restart", "api")} className="rounded-md border border-amber-400/40 px-3 py-2 text-sm text-amber-200 hover:bg-amber-950/40">Restart API</button>
                <button onClick={() => runAction("restart", "web")} className="rounded-md border border-amber-400/40 px-3 py-2 text-sm text-amber-200 hover:bg-amber-950/40">Restart Web</button>
                <button onClick={() => runAction("rebuild", "api")} className="rounded-md border border-cyan-400/40 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-950/40">Rebuild API</button>
                <button onClick={() => runAction("rebuild", "web")} className="rounded-md border border-cyan-400/40 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-950/40">Rebuild Web</button>
              </div>
              <button onClick={runDeploy} className="mt-2 w-full rounded-md border border-rose-400/50 px-3 py-2 text-sm text-rose-200 hover:bg-rose-950/40">Deploy completo</button>
              <pre className="mt-3 max-h-56 overflow-auto rounded-md bg-black p-3 text-xs text-slate-200">
                {loading && loading !== "logs" && loading !== "status" ? `Ejecutando ${loading}...` : [lastAction?.stdout, lastAction?.stderr, lastAction?.error].filter(Boolean).join("\n\n") || "Sin acciones ejecutadas."}
              </pre>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
