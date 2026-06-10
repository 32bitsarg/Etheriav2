import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Hono } from "hono";
import { z } from "zod";
import { getPerfSnapshot } from "../infrastructure/perfMetrics.js";
import { requireAdmin } from "../infrastructure/adminMiddleware.js";

const execFileAsync = promisify(execFile);

const SERVICE_ACTIONS = {
  api: {
    logs: "logs-api",
    restart: "restart-api",
    rebuild: "rebuild-api",
  },
  web: {
    logs: "logs-web",
    restart: "restart-web",
    rebuild: "rebuild-web",
  },
  caddy: {
    logs: "logs-caddy",
  },
  worker: {
    logs: "logs-worker",
    restart: "restart-worker",
  },
} as const;

const LOG_LINES = new Set(["100", "200", "500"]);
const HELPER_PATH = process.env.ADMIN_OPS_HELPER_PATH ?? "/opt/etheria/adminctl.sh";

type OpsService = keyof typeof SERVICE_ACTIONS;

async function runAdminHelper(action: string, args: string[] = []) {
  const { stdout, stderr } = await execFileAsync("sudo", ["-n", HELPER_PATH, action, ...args], {
    timeout: 120_000,
    maxBuffer: 1024 * 1024,
  });

  return {
    stdout: stdout.trim(),
    stderr: stderr.trim(),
  };
}

function isOpsService(value: string): value is OpsService {
  return value === "api" || value === "web" || value === "caddy" || value === "worker";
}

export const adminOpsRouter = new Hono();

adminOpsRouter.use("*", requireAdmin(), async (c, next) => {
  c.header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  c.header("Pragma", "no-cache");
  c.header("Expires", "0");
  await next();
});

adminOpsRouter.get("/status", async (c) => {
  try {
    const result = await runAdminHelper("status");
    return c.json({ ok: true, ...result });
  } catch (error) {
    return c.json({ ok: false, error: error instanceof Error ? error.message : "Status failed" }, 500);
  }
});

adminOpsRouter.get("/logs", async (c) => {
  const service = c.req.query("service") ?? "";
  const lines = c.req.query("lines") ?? "200";

  if (!isOpsService(service)) return c.json({ error: "Invalid service" }, 400);
  if (!LOG_LINES.has(lines)) return c.json({ error: "Invalid lines" }, 400);

  const action = SERVICE_ACTIONS[service].logs;
  try {
    const result = await runAdminHelper(action, [lines]);
    return c.json({ ok: true, service, lines: Number(lines), ...result });
  } catch (error) {
    return c.json({ ok: false, error: error instanceof Error ? error.message : "Logs failed" }, 500);
  }
});

adminOpsRouter.get("/perf", (c) => {
  return c.json({ ok: true, ...getPerfSnapshot() });
});

const ActionBodySchema = z.object({
  service: z.enum(["api", "web", "worker"]),
});

adminOpsRouter.post("/restart", async (c) => {
  const body = ActionBodySchema.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: "Invalid service" }, 400);

  try {
    const result = await runAdminHelper(SERVICE_ACTIONS[body.data.service].restart);
    return c.json({ ok: true, service: body.data.service, ...result });
  } catch (error) {
    return c.json({ ok: false, error: error instanceof Error ? error.message : "Restart failed" }, 500);
  }
});

adminOpsRouter.post("/rebuild", async (c) => {
  const body = ActionBodySchema.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return c.json({ error: "Invalid service" }, 400);

  try {
    if (body.data.service === "worker") return c.json({ error: "Worker rebuild is not supported" }, 400);
    const result = await runAdminHelper(SERVICE_ACTIONS[body.data.service].rebuild);
    return c.json({ ok: true, service: body.data.service, ...result });
  } catch (error) {
    return c.json({ ok: false, error: error instanceof Error ? error.message : "Rebuild failed" }, 500);
  }
});

adminOpsRouter.post("/deploy", async (c) => {
  try {
    const result = await runAdminHelper("deploy");
    return c.json({ ok: true, ...result });
  } catch (error) {
    return c.json({ ok: false, error: error instanceof Error ? error.message : "Deploy failed" }, 500);
  }
});
