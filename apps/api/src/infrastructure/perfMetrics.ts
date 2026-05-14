import { readFileSync, writeFileSync } from "node:fs";

export interface RequestMetric {
  id: number;
  timestamp: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
}

export interface WorkerMetric {
  name: string;
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
  lastDurationMs: number | null;
  lastError: string | null;
  runs: number;
}

const MAX_REQUEST_METRICS = Number(process.env.PERF_METRICS_MAX_ENTRIES ?? 500);
const WORKER_METRICS_PATH = process.env.WORKER_METRICS_PATH ?? "/tmp/etheria-worker-metrics.json";
const requestMetrics: RequestMetric[] = [];
const workerMetrics = new Map<string, WorkerMetric>();
let nextRequestMetricId = 1;

function percentile(values: number[], percentileValue: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1));
  return sorted[index];
}

export function recordRequestMetric(metric: Omit<RequestMetric, "id" | "timestamp">) {
  requestMetrics.push({
    id: nextRequestMetricId++,
    timestamp: new Date().toISOString(),
    ...metric,
  });

  if (requestMetrics.length > MAX_REQUEST_METRICS) {
    requestMetrics.splice(0, requestMetrics.length - MAX_REQUEST_METRICS);
  }
}

export function startWorkerMetric(name: string) {
  const current = workerMetrics.get(name) ?? {
    name,
    lastStartedAt: null,
    lastFinishedAt: null,
    lastDurationMs: null,
    lastError: null,
    runs: 0,
  };
  current.lastStartedAt = new Date().toISOString();
  workerMetrics.set(name, current);
  return performance.now();
}

export function finishWorkerMetric(name: string, startedAt: number, error?: unknown) {
  const current = workerMetrics.get(name) ?? {
    name,
    lastStartedAt: null,
    lastFinishedAt: null,
    lastDurationMs: null,
    lastError: null,
    runs: 0,
  };
  current.lastFinishedAt = new Date().toISOString();
  current.lastDurationMs = Math.round(performance.now() - startedAt);
  current.lastError = error ? (error instanceof Error ? error.message : String(error)) : null;
  current.runs += 1;
  workerMetrics.set(name, current);
  try {
    writeFileSync(WORKER_METRICS_PATH, JSON.stringify([...workerMetrics.values()]), "utf8");
  } catch {
    // Metrics are best-effort and must never break worker processing.
  }
}

function readExternalWorkerMetrics() {
  try {
    const parsed = JSON.parse(readFileSync(WORKER_METRICS_PATH, "utf8"));
    return Array.isArray(parsed) ? parsed as WorkerMetric[] : [];
  } catch {
    return [];
  }
}

export function getPerfSnapshot() {
  const byPath = new Map<string, RequestMetric[]>();
  for (const metric of requestMetrics) {
    const key = `${metric.method} ${metric.path}`;
    const list = byPath.get(key) ?? [];
    list.push(metric);
    byPath.set(key, list);
  }

  return {
    requests: {
      total: requestMetrics.length,
      recent: [...requestMetrics].slice(-80).reverse(),
      slow: [...requestMetrics]
        .filter((metric) => metric.durationMs >= 500 || metric.status >= 500)
        .slice(-50)
        .reverse(),
      byPath: [...byPath.entries()]
        .map(([key, metrics]) => {
          const durations = metrics.map((metric) => metric.durationMs);
          return {
            key,
            count: metrics.length,
            errors: metrics.filter((metric) => metric.status >= 500).length,
            unauthorized: metrics.filter((metric) => metric.status === 401).length,
            p50: percentile(durations, 50),
            p95: percentile(durations, 95),
            max: Math.max(...durations),
          };
        })
        .sort((a, b) => b.p95 - a.p95)
        .slice(0, 30),
    },
    workers: [...workerMetrics.values(), ...readExternalWorkerMetrics()]
      .filter((metric, index, metrics) => metrics.findIndex((item) => item.name === metric.name) === index)
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}
