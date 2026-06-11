import type { MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import { getSessionUserId, SESSION_COOKIE } from "../domain/authService.js";
import { getModerationState } from "../domain/moderationService.js";

export type AuthContext = { userId: string };

export function requireAuth(): MiddlewareHandler<{ Variables: AuthContext }> {
  return async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE) ?? null;
    const userId = await getSessionUserId(token);
    if (!userId) return c.json({ error: "Invalid session" }, 401);
    const modState = await getModerationState(userId);
    if (modState.banned) return c.json({ error: "banned", reason: modState.banReason, bannedUntil: modState.bannedUntil }, 403);
    c.set("userId", userId);
    await next();
  };
}

// Backwards-compat alias used by existing routes
export const requireMatecitoAuth = requireAuth;
