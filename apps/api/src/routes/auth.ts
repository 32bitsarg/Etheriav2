import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import {
  SESSION_COOKIE,
  deleteSessionByToken,
  getMe,
  getSessionUserId,
  loginUser,
  registerUser,
  touchSession,
} from "../domain/authService.js";
import { generateCityName, generatePlayerName } from "../domain/nameGenerator.js";
import { rateLimit } from "../infrastructure/rateLimiter.js";

export const authRouter = new Hono();

const RegisterSchema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(6).max(200),
  name: z.string().min(2).max(40).optional(),
  cityName: z.string().min(2).max(30).optional(),
  remember: z.boolean().optional().default(false),
});

authRouter.post("/register", rateLimit({ name: "auth-register", windowMs: 60_000 * 15, max: 5 }), zValidator("json", RegisterSchema), async (c) => {
  try {
    const data = c.req.valid("json");
    const result = await registerUser({
      email: data.email,
      password: data.password,
      name: (data.name ?? generatePlayerName(data.email)).trim(),
      cityName: (data.cityName ?? generateCityName(data.email)).trim(),
      remember: data.remember,
    });
    if ("error" in result) return c.json({ error: result.error }, (result as any).status ?? 500);

    const session = result.session;
    setCookie(c, SESSION_COOKIE, session.token, {
      httpOnly: true,
      sameSite: "Lax",
      path: "/",
      maxAge: Math.floor(session.ttlMs / 1000),
    });

  return c.json({ user: result.user, cityId: result.cityId });
  } catch (error) {
    console.error("[register] unexpected error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

const LoginSchema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(1).max(200),
  remember: z.boolean().optional().default(false),
});

authRouter.post("/login", rateLimit({ name: "auth-login", windowMs: 60_000 * 5, max: 10 }), zValidator("json", LoginSchema), async (c) => {
  const data = c.req.valid("json");
  const result = await loginUser({ email: data.email, password: data.password, remember: data.remember });
  if ("error" in result) return c.json({ error: result.error }, 401);

  const session = result.session;
  setCookie(c, SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: Math.floor(session.ttlMs / 1000),
  });

  return c.json({ user: result.user, cityId: result.cityId, worldId: result.worldId });
});

authRouter.post("/logout", async (c) => {
  const token = getCookie(c, SESSION_COOKIE) ?? null;
  if (token) {
    await deleteSessionByToken(token);
  }
  deleteCookie(c, SESSION_COOKIE, { path: "/", httpOnly: true, sameSite: "Lax" });
  return c.json({ success: true });
});

authRouter.get("/me", async (c) => {
  c.header("Cache-Control", "no-cache, no-store, must-revalidate");
  const token = getCookie(c, SESSION_COOKIE) ?? null;
  const userId = await getSessionUserId(token);
  if (!userId) return c.json({ user: null }, 401);

  if (token) {
    try {
      await touchSession(token);
    } catch {}
  }

  const me = await getMe(userId);
  if (!me) return c.json({ user: null }, 401);
  return c.json(me);
});
