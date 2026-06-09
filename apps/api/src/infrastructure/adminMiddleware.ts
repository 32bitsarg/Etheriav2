import type { MiddlewareHandler } from "hono";

export function requireAdmin(): MiddlewareHandler {
  return async (c, next) => {
    const expected = process.env.ADMIN_SECRET;
    if (!expected) return c.json({ error: "ADMIN_SECRET is not configured" }, 503);

    const fromHeader = c.req.header("x-admin-secret");
    if (fromHeader === expected) {
      await next();
      return;
    }

    return c.json({ error: "Unauthorized" }, 401);
  };
}
