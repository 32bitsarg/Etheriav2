import { NextResponse } from "next/server";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { normalizeVillageLayout, type VillageLayoutData } from "@/lib/villageLayout";

export const runtime = "nodejs";

function requireAdminSecret(req: Request): NextResponse | null {
  const expected = process.env.ADMIN_SECRET ?? "";
  // Sin secreto configurado solo se permite en desarrollo local
  if (!expected) {
    if (process.env.NODE_ENV !== "production") return null;
    return NextResponse.json({ error: "Admin secret not configured" }, { status: 503 });
  }
  if (req.headers.get("x-admin-secret") !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}


const layoutPath = path.join(process.cwd(), "src", "data", "village-layout.json");

async function readLayout(): Promise<VillageLayoutData> {
  const raw = await readFile(layoutPath, "utf8");
  return normalizeVillageLayout(JSON.parse(raw) as VillageLayoutData);
}

export async function GET() {
  const layout = await readLayout();
  return NextResponse.json(layout, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

export async function POST(req: Request) {
  const denied = requireAdminSecret(req);
  if (denied) return denied;
  const body = await req.json() as VillageLayoutData;
  const layout = normalizeVillageLayout(body);
  await writeFile(layoutPath, `${JSON.stringify(layout, null, 2)}\n`, "utf8");
  return NextResponse.json(layout);
}
