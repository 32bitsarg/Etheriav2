import { NextResponse } from "next/server";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { VillageLayoutData } from "@/lib/villageLayout";

export const runtime = "nodejs";

const layoutPath = path.join(process.cwd(), "src", "data", "village-layout.json");

async function readLayout(): Promise<VillageLayoutData> {
  const raw = await readFile(layoutPath, "utf8");
  return JSON.parse(raw) as VillageLayoutData;
}

export async function GET() {
  const layout = await readLayout();
  return NextResponse.json(layout);
}

export async function POST(req: Request) {
  const body = await req.json() as VillageLayoutData;
  await writeFile(layoutPath, `${JSON.stringify(body, null, 2)}\n`, "utf8");
  return NextResponse.json({ ok: true });
}
