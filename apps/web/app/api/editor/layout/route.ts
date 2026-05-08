import { NextResponse } from "next/server";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { normalizeVillageLayout, type VillageLayoutData } from "@/lib/villageLayout";

export const runtime = "nodejs";

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
  const body = await req.json() as VillageLayoutData;
  const layout = normalizeVillageLayout(body);
  await writeFile(layoutPath, `${JSON.stringify(layout, null, 2)}\n`, "utf8");
  return NextResponse.json(layout);
}
