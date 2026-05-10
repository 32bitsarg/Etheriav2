import type { MiddlewareHandler } from "hono";

export type AuthContext = { userId: string };

function matecitoProjectUrl(path: string) {
  const baseUrl = process.env.NEXT_PUBLIC_MATECITO_URL;
  if (!baseUrl) throw new Error("Missing NEXT_PUBLIC_MATECITO_URL");
  return `${baseUrl.replace(/\/$/, "")}/api/v2/project/${path.replace(/^\//, "")}`;
}

export function requireMatecitoAuth(): MiddlewareHandler<{ Variables: AuthContext }> {
  return async (c, next) => {
    const header = c.req.header("authorization") ?? "";
    const match = header.match(/^Bearer\s+(.+)$/i);
    const token = match?.[1]?.trim() ?? null;
    if (!token) return c.json({ error: "Missing Authorization Bearer token" }, 401);

    const serviceKey = process.env.MATECITO_SERVICE_KEY;
    if (!serviceKey) throw new Error("Missing MATECITO_SERVICE_KEY");

    const response = await fetch(matecitoProjectUrl("/auth/me"), {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-matecito-key": serviceKey,
      },
    });

    if (!response.ok) {
      return c.json({ error: "Invalid session" }, 401);
    }

    const body = await response.json() as { user?: { id?: string }; id?: string };
    const userId = body.user?.id ?? body.id;
    if (!userId) return c.json({ error: "Invalid session" }, 401);

    c.set("userId", userId);
    await next();
  };
}
