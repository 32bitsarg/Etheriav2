import { createHash, randomBytes, scryptSync } from "node:crypto";
import { db, COLLECTIONS } from "../infrastructure/matecito.js";
import { createStarterCityForUser } from "./cityCreation.js";

const genId = () => crypto.randomUUID();

export const SESSION_COOKIE = "etheria_session";

function sha256Hex(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

function randomToken() {
  return randomBytes(32).toString("base64url");
}

function scryptHash(password: string, salt: string) {
  const hash = scryptSync(password, salt, 64);
  return hash.toString("hex");
}

function sessionTtlMs(remember: boolean) {
  const normalDays = Number(process.env.AUTH_SESSION_TTL_DAYS ?? 1);
  const rememberDays = Number(process.env.AUTH_SESSION_TTL_REMEMBER_DAYS ?? 30);
  const days = remember ? rememberDays : normalDays;
  return Math.max(1, days) * 24 * 60 * 60 * 1000;
}

function assertDbOk(result: any, context: string) {
  if (!result) return;
  const err = (result as any).error ?? (result as any).err;
  if (err) {
    const msg = typeof err === "string" ? err : (err.message ?? JSON.stringify(err));
    throw new Error(`[DB] ${context}: ${msg}`);
  }
}

async function findUserByEmail(email: string) {
  const res = await db.from(COLLECTIONS.USERS).eq("email", email).get() as any;
  assertDbOk(res, "USERS.eq(email).get()");
  const arr = (res.data ?? []) as any[];
  return arr[0] ?? null;
}

async function getUserCityId(userId: string) {
  const res = await db.from(COLLECTIONS.CITIES).eq("userId", userId).get() as any;
  const arr = (res.data ?? []) as any[];
  return arr[0]?.id ?? null;
}

export async function createSession(userId: string, remember: boolean) {
  const now = Date.now();
  const ttlMs = sessionTtlMs(remember);
  const expiresAt = new Date(now + ttlMs).toISOString();

  const token = randomToken();
  const tokenHash = sha256Hex(token);

  const inserted = await db.from(COLLECTIONS.SESSIONS).insert({
    id: genId(),
    userId,
    tokenHash,
    createdAt: new Date(now).toISOString(),
    lastSeenAt: new Date(now).toISOString(),
    expiresAt,
  });
  assertDbOk(inserted, "SESSIONS.insert()");

  return { token, ttlMs };
}

export async function deleteSessionByToken(token: string) {
  const tokenHash = sha256Hex(token);
  await db.from(COLLECTIONS.SESSIONS).eq("tokenHash", tokenHash).delete().execute();
}

export async function getSessionUserId(token: string | null) {
  if (!token) return null;
  const tokenHash = sha256Hex(token);
  const res = await db.from(COLLECTIONS.SESSIONS).eq("tokenHash", tokenHash).get() as any;
  const arr = (res.data ?? []) as any[];
  const session = arr[0];
  if (!session) return null;
  const exp = new Date(session.expiresAt ?? 0).getTime();
  if (!exp || exp < Date.now()) return null;
  return session.userId as string;
}

export async function touchSession(token: string) {
  const tokenHash = sha256Hex(token);
  await db.from(COLLECTIONS.SESSIONS).eq("tokenHash", tokenHash).merge({ lastSeenAt: new Date().toISOString() }).execute();
}

export async function registerUser(input: {
  email: string;
  password: string;
  name: string;
  cityName: string;
  remember: boolean;
}) {
  const email = input.email.trim().toLowerCase();
  const existing = await findUserByEmail(email);
  if (existing) return { error: "Email ya registrado" as const, status: 409 as const };

  const now = new Date().toISOString();
  const userId = genId();
  const salt = randomBytes(16).toString("hex");
  const passwordHash = scryptHash(input.password, salt);

  await db.from(COLLECTIONS.USERS).insert({
    id: userId,
    email,
    name: input.name.trim(),
    passwordSalt: salt,
    passwordHash,
    createdAt: now,
    updatedAt: now,
  });
  // Matecito insert returns result; we can't rely on exceptions.
  // Best-effort: re-read user to confirm.
  const insertedUser = await findUserByEmail(email);
  if (!insertedUser) return { error: "No se pudo crear el usuario" as const, status: 500 as const };

  const created = await createStarterCityForUser({ userId, cityName: input.cityName.trim() });
  if ("error" in created) {
    const status = created.error === "No available world positions" ? 503 : 500;
    return { error: created.error, status: status as 503 | 500 };
  }

  const session = await createSession(userId, input.remember);
  return {
    user: { id: userId, email, name: input.name.trim() },
    cityId: created.cityId,
    session,
  };
}

export async function loginUser(input: { email: string; password: string; remember: boolean }) {
  const email = input.email.trim().toLowerCase();
  const user = await findUserByEmail(email);
  if (!user) return { error: "Credenciales inválidas" as const };
  if (!user.passwordSalt || !user.passwordHash) return { error: "Usuario sin password configurado" as const };

  const candidate = scryptHash(input.password, String(user.passwordSalt));
  if (candidate !== String(user.passwordHash)) return { error: "Credenciales inválidas" as const };

  const session = await createSession(user.id, input.remember);
  const cityId = await getUserCityId(user.id);

  return {
    user: { id: user.id, email: user.email, name: user.name ?? "Commander" },
    cityId,
    session,
  };
}

export async function getMe(userId: string) {
  const userRes = await db.from(COLLECTIONS.USERS).eq("id", userId).getFirst() as any;
  const user = userRes.data;
  if (!user) return null;
  const cityId = await getUserCityId(userId);
  return { user: { id: user.id, email: user.email, name: user.name ?? "Commander" }, cityId };
}
