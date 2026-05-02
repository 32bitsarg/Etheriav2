import type { MiddlewareHandler } from "hono";
import { createClient } from "matecitodb";

export type AuthContext = { userId: string };

export function requireMatecitoAuth(): MiddlewareHandler<{ Variables: AuthContext }> {
  return async (c, next) => {
    const header = c.req.header("authorization") ?? "";
    const match = header.match(/^Bearer\s+(.+)$/i);
    const token = match?.[1]?.trim() ?? null;
    if (!token) return c.json({ error: "Missing Authorization Bearer token" }, 401);

    const url = process.env.NEXT_PUBLIC_MATECITO_URL!;
    const serviceKey = process.env.MATECITO_SERVICE_KEY!;
    const db = createClient({ url, apiKey: serviceKey, apiVersion: "v2" });

    db.auth.setSession({ access_token: token });
    const me = await db.auth.getMe() as any;
    if (me?.error || !me?.data?.id) {
      return c.json({ error: "Invalid session" }, 401);
    }

    c.set("userId", me.data.id);
    await next();
  };
}

