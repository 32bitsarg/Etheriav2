import { NextResponse } from "next/server";

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "";
const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2 MB

// In-memory rate limiter: max 30 writes per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function requireAdmin(req: Request): NextResponse | null {
  // Reject oversized bodies early (content-length header check)
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  if (!ADMIN_SECRET) {
    if (process.env.NODE_ENV !== "production") return null;
    return NextResponse.json({ error: "Admin secret not configured" }, { status: 503 });
  }

  if (req.headers.get("x-admin-secret") !== ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: keyed by forwarded IP or fallback
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
  } else {
    entry.count++;
    if (entry.count > 30) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }
  }

  return null;
}

export function requireAdminGet(req: Request): NextResponse | null {
  if (!ADMIN_SECRET) {
    if (process.env.NODE_ENV !== "production") return null;
    return NextResponse.json({ error: "Admin secret not configured" }, { status: 503 });
  }
  if (req.headers.get("x-admin-secret") !== ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
