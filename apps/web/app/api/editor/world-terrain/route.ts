import { NextResponse } from "next/server";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_WORLD_TERRAIN_MASK, normalizeWorldTerrainMask, type WorldTerrainMaskData } from "@/lib/worldTerrainMask";

export const runtime = "nodejs";
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const maskPath = path.join(process.cwd(), "src", "data", "world-terrain-mask.json");

async function readMask(): Promise<WorldTerrainMaskData> {
  try {
    const raw = await readFile(maskPath, "utf8");
    return normalizeWorldTerrainMask(JSON.parse(raw) as WorldTerrainMaskData);
  } catch {
    return DEFAULT_WORLD_TERRAIN_MASK;
  }
}

export async function GET() {
  const mask = await readMask();
  return NextResponse.json(mask, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const body = await req.json() as WorldTerrainMaskData;
  const mask = normalizeWorldTerrainMask(body);
  await writeFile(maskPath, `${JSON.stringify(mask, null, 2)}\n`, "utf8");
  const repair = await fetch(`${API_BASE}/world/admin/repair-terrain`, { method: "POST" })
    .then(async (res) => res.ok ? await res.json() : { ok: false })
    .catch(() => ({ ok: false }));
  return NextResponse.json({ ok: true, repair }, { headers: { "Cache-Control": "no-store" } });
}
