import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "";

// Solo se proxyean rutas de administración: este endpoint NO debe servir
// como proxy genérico hacia el API.
const ALLOWED_PREFIXES = ["admin/", "world/admin", "worlds"];

async function proxy(req: NextRequest, method: string) {
  if (!ADMIN_SECRET) {
    return NextResponse.json({ error: "Admin secret not configured" }, { status: 500 });
  }

  // El cliente debe autenticarse: antes este proxy inyectaba el secreto del
  // servidor a cualquier request anónima (escalada de privilegios total).
  const clientSecret = req.headers.get("x-admin-secret") ?? "";
  if (clientSecret !== ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path") ?? "";
  if (!path) return NextResponse.json({ error: "Missing path param" }, { status: 400 });
  if (path.includes("..") || !ALLOWED_PREFIXES.some((p) => path.startsWith(p))) {
    return NextResponse.json({ error: "Path not allowed" }, { status: 403 });
  }

  const targetUrl = `${API_URL}/${path}`;
  const headers: Record<string, string> = {
    "x-admin-secret": ADMIN_SECRET,
  };
  if (req.headers.get("content-type")) {
    headers["content-type"] = req.headers.get("content-type")!;
  }

  const body = method !== "GET" && method !== "HEAD" ? await req.text() : undefined;

  const res = await fetch(targetUrl, { method, headers, body });
  const data = await res.text();

  return new NextResponse(data, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}

export async function GET(req: NextRequest) { return proxy(req, "GET"); }
export async function POST(req: NextRequest) { return proxy(req, "POST"); }
export async function PATCH(req: NextRequest) { return proxy(req, "PATCH"); }
export async function DELETE(req: NextRequest) { return proxy(req, "DELETE"); }
