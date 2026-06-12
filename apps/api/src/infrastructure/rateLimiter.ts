import type { MiddlewareHandler } from "hono";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();
const cleanupIntervals = new Set<string>();

function getStore(name: string) {
  if (!stores.has(name)) {
    stores.set(name, new Map());
    if (!cleanupIntervals.has(name)) {
      cleanupIntervals.add(name);
      const interval = setInterval(() => {
        const now = Date.now();
        const store = stores.get(name);
        if (store) for (const [key, entry] of store) if (entry.resetAt <= now) store.delete(key);
      }, 60_000);
      interval.unref(); // don't hold the process open
    }
  }
  return stores.get(name)!;
}

function getClientIp(c: any): string {
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip") ||
    "unknown"
  );
}

export function rateLimit(opts: {
  name: string;
  windowMs: number;
  max: number;
  keyGenerator?: (c: any) => string;
}): MiddlewareHandler {
  const { name, windowMs, max, keyGenerator } = opts;
  const store = getStore(name);

  return async (c, next) => {
    const key = keyGenerator ? keyGenerator(c) : getClientIp(c);
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      await next();
      return;
    }

    entry.count++;
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      c.header("Retry-After", String(retryAfter));
      return c.json({ error: "Too many requests, try again later" }, 429);
    }

    await next();
  };
}

// Rate limiter keyed by authenticated userId (falls back to IP).
// Must be placed AFTER requireMatecitoAuth() in the middleware chain.
export function userRateLimit(opts: { name: string; windowMs: number; max: number }): MiddlewareHandler {
  return rateLimit({
    ...opts,
    keyGenerator: (c) => c.get("userId") ?? getClientIp(c),
  });
}
