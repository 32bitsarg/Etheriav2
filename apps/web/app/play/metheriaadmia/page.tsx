"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Service = "api" | "web" | "caddy";
type Lines = "100" | "200" | "500";
type ServiceState = "running" | "failed" | "unknown";
type AdminResponse = {
  ok?: boolean;
  stdout?: string;
  stderr?: string;
  error?: string;
};

const SERVICES: { id: Service; label: string; description: string }[] = [
  { id: "api", label: "API", description: "Hono + workers" },
  { id: "web", label: "Web", description: "Next.js" },
  { id: "caddy", label: "Caddy", description: "Reverse proxy" },
];
const STORAGE_KEY = "etheria_admin_secret";
const SEVERITY_PATTERNS = {
  error: /\b(error|failed|failure|exception|fatal|500|panic|invalid)\b/i,
  warn: /\b(warn|warning|retry|timeout|401|403|404)\b/i,
};

async function adminRequest(path: string, secret: string, init?: RequestInit): Promise<AdminResponse> {
  const response = await fetch(`/api/admin/ops${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Secret": secret,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  }).catch(() => null);

  if (!response) {
    return { ok: false, error: "La conexion se corto. Si reiniciaste la API, espera unos segundos y refresca el estado." };
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, error: body.error ?? response.statusText };
  return body;
}

function responseText(response: AdminResponse | null) {
  if (!response) return "";
  return [response.stdout, response.stderr, response.error].filter(Boolean).join("\n\n");
}

function serviceState(statusText: string, service: Service): ServiceState {
  const unit = service === "api" ? "etheria-api" : service === "web" ? "etheria-web" : "caddy";
  const index = statusText.indexOf(`${unit}.service`);
  if (index < 0) return "unknown";
  const slice = statusText.slice(index, index + 900);
  if (/Active:\s+active\s+\(running\)/i.test(slice)) return "running";
  if (/Active:\s+failed|failed with result|inactive|dead/i.test(slice)) return "failed";
  return "unknown";
}

function lineClass(line: string) {
  if (SEVERITY_PATTERNS.error.test(line)) return "border-l-2 border-rose-500 bg-rose-950/30 text-rose-100";
  if (SEVERITY_PATTERNS.warn.test(line)) return "border-l-2 border-amber-400 bg-amber-950/20 text-amber-100";
  return "border-l-2 border-transparent text-slate-300";
}

function StatusPill({ state }: { state: ServiceState }) {
  const label = state === "running" ? "Running" : state === "failed" ? "Failed" : "Unknown";
  const cls = state === "running"
    ? "border-emerald-400/40 bg-emerald-950/40 text-emerald-200"
    : state === "failed"
      ? "border-rose-400/40 bg-rose-950/40 text-rose-200"
      : "border-slate-600 bg-slate-900 text-slate-300";
  return <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold uppercase ${cls}`}>{label}</span>;
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
  const [query, setQuery] = useState("");
  const [severityOnly, setSeverityOnly] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const logsRequestId = useRef(0);
  const statusRequestId = useRef(0);

  const statusText = responseText(status);
  const output = responseText(logs);
  const filteredLines = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return output
      .split("\n")
      .filter((line) => !needle || line.toLowerCase().includes(needle))
      .filter((line) => !severityOnly || SEVERITY_PATTERNS.error.test(line) || SEVERITY_PATTERNS.warn.test(line));
  }, [output, query, severityOnly]);

  const counters = useMemo(() => {
    const lines = output.split("\n");
    return {
      errors: lines.filter((line) => SEVERITY_PATTERNS.error.test(line)).length,
      warnings: lines.filter((line) => SEVERITY_PATTERNS.warn.test(line)).length,
      total: output ? lines.length : 0,
    };
  }, [output]);

  useEffect(() => {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (stored) setSecret(stored);
  }, []);

  async function loadStatus() {
    if (!secret) return;
    const requestId = ++statusRequestId.current;
    setLoading("status");
    const result = await adminRequest("/status", secret);
    if (requestId !== statusRequestId.current) return;
    setStatus(result);
    setLastUpdated(new Date().toLocaleTimeString());
    setRefreshCount((value) => value + 1);
    setLoading(null);
  }

  async function loadLogs(service = activeService, nextLines = lines) {
    if (!secret) return;
    const requestId = ++logsRequestId.current;
    setLoading("logs");
    const result = await adminRequest(`/logs?service=${service}&lines=${nextLines}&t=${Date.now()}`, secret);
    if (requestId !== logsRequestId.current) return;
    setLogs(result);
    setLastUpdated(new Date().toLocaleTimeString());
    setRefreshCount((value) => value + 1);
    setLoading(null);
  }

  useEffect(() => {
    if (!secret) return;
    loadStatus();
    loadLogs();
  }, [secret]);

  useEffect(() => {
    if (!secret || !autoRefresh) return;
    const id = window.setInterval(() => {
      loadStatus();
      loadLogs();
    }, 5000);
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

  async function copyLogs() {
    await navigator.clipboard.writeText(output);
  }

  if (!secret) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#071014] p-6 text-slate-100">
        <form onSubmit={submitSecret} className="w-full max-w-sm rounded-lg border border-cyan-400/20 bg-[#0c171b] p-5 shadow-2xl">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Metheriaadmia</h1>
            <span className="rounded-full border border-cyan-400/30 px-2 py-1 text-[11px] uppercase text-cyan-200">Ops</span>
          </div>
          <p className="mt-2 text-sm text-slate-400">Ingresa la clave operativa para ver logs y acciones del VPS.</p>
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
    <main className="min-h-screen bg-[#071014] text-slate-100">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-4 p-4 md:p-5">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-[#0c171b] px-4 py-3">
          <div>
            <h1 className="text-xl font-semibold">Metheriaadmia</h1>
            <p className="text-sm text-slate-400">VPS ops: logs, estado, rebuild, restart y deploy controlado</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">
              {lastUpdated ? `Actualizado ${lastUpdated} · #${refreshCount}` : "Sin refrescar"}
            </span>
            <label className="flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300">
              <input type="checkbox" checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} />
              Auto 5s
            </label>
            <button onClick={() => { loadStatus(); loadLogs(); }} className="rounded-md border border-slate-700 px-3 py-2 text-sm hover:bg-slate-900">Refrescar</button>
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

        <section className="grid gap-3 md:grid-cols-3">
          {SERVICES.map((service) => {
            const state = serviceState(statusText, service.id);
            return (
              <button
                key={service.id}
                onClick={() => {
                  setActiveService(service.id);
                  loadLogs(service.id);
                }}
                className={`rounded-lg border p-4 text-left transition ${activeService === service.id ? "border-cyan-400/60 bg-cyan-950/20" : "border-slate-800 bg-[#0c171b] hover:border-slate-600"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-wide">{service.label}</div>
                    <div className="mt-1 text-xs text-slate-400">{service.description}</div>
                  </div>
                  <StatusPill state={state} />
                </div>
              </button>
            );
          })}
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="rounded-lg border border-slate-800 bg-[#0c171b]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Logs de {activeService}</h2>
                <div className="mt-1 flex gap-3 text-xs text-slate-500">
                  <span>{counters.total} lineas</span>
                  <span className="text-rose-300">{counters.errors} errores</span>
                  <span className="text-amber-300">{counters.warnings} warnings</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar"
                  className="w-40 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-400"
                />
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
                <button onClick={() => setSeverityOnly((value) => !value)} className={`rounded-md border px-3 py-2 text-sm ${severityOnly ? "border-amber-300 text-amber-200" : "border-slate-700 text-slate-300"}`}>
                  Solo alertas
                </button>
                <button onClick={copyLogs} disabled={!output} className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-900 disabled:opacity-40">Copiar</button>
              </div>
            </div>
            <div className="relative h-[64vh] overflow-auto bg-black font-mono text-xs leading-relaxed">
              {loading === "logs" && (
                <div className="sticky top-0 z-10 border-b border-cyan-400/20 bg-cyan-950/90 px-3 py-2 text-cyan-100">
                  Actualizando logs...
                </div>
              )}
              {filteredLines.length === 0 && <div className="p-4 text-slate-500">Sin logs para mostrar.</div>}
              {filteredLines.map((line, index) => (
                <div key={`${index}-${line}`} className={`whitespace-pre-wrap px-3 py-0.5 ${lineClass(line)}`}>
                  {line || " "}
                </div>
              ))}
            </div>
          </div>

          <aside className="flex flex-col gap-4">
            <section className="rounded-lg border border-slate-800 bg-[#0c171b] p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Acciones</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={() => runAction("restart", "api")} className="rounded-md border border-amber-400/40 px-3 py-2 text-sm text-amber-200 hover:bg-amber-950/40">Restart API</button>
                <button onClick={() => runAction("restart", "web")} className="rounded-md border border-amber-400/40 px-3 py-2 text-sm text-amber-200 hover:bg-amber-950/40">Restart Web</button>
                <button onClick={() => runAction("rebuild", "api")} className="rounded-md border border-cyan-400/40 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-950/40">Rebuild API</button>
                <button onClick={() => runAction("rebuild", "web")} className="rounded-md border border-cyan-400/40 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-950/40">Rebuild Web</button>
              </div>
              <button onClick={runDeploy} className="mt-2 w-full rounded-md border border-rose-400/50 px-3 py-2 text-sm text-rose-200 hover:bg-rose-950/40">Deploy completo</button>
              <pre className="mt-3 max-h-52 overflow-auto rounded-md bg-black p-3 text-xs text-slate-200">
                {loading && loading !== "logs" && loading !== "status" ? `Ejecutando ${loading}...` : responseText(lastAction) || "Sin acciones ejecutadas."}
              </pre>
            </section>

            <section className="rounded-lg border border-slate-800 bg-[#0c171b] p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Estado raw</h2>
              <pre className="mt-3 max-h-[34vh] overflow-auto rounded-md bg-black p-3 text-xs text-slate-200">
                {loading === "status" ? "Consultando estado..." : statusText || "Sin estado."}
              </pre>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
