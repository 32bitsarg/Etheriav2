import { NextResponse } from "next/server";
import { readFile, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { normalizeVillageLayout, type VillageLayoutData } from "@/lib/villageLayout";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";

// VILLAGE_LAYOUT_PATH lets ops point to a file outside the git repo so deploys
// (git pull) never overwrite editor changes. Falls back to the source file in dev.
const layoutPath = process.env.VILLAGE_LAYOUT_PATH
  ?? path.join(process.cwd(), "src", "data", "village-layout.json");
const backupPath = layoutPath.replace(/\.json$/, ".backup.json");

async function readLayout(): Promise<VillageLayoutData> {
  const raw = await readFile(layoutPath, "utf8");
  return normalizeVillageLayout(JSON.parse(raw) as VillageLayoutData);
}

export async function GET(_req: Request) {
  const layout = await readLayout();
  return NextResponse.json(layout, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const body = await req.json() as VillageLayoutData;
  const layout = normalizeVillageLayout(body);

  // Backup before overwrite
  await copyFile(layoutPath, backupPath).catch(() => {});
  await writeFile(layoutPath, `${JSON.stringify(layout, null, 2)}\n`, "utf8");

  return NextResponse.json(layout);
}
