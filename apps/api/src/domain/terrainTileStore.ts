import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const TILE_CACHE_DIR =
  process.env.TILE_CACHE_DIR ??
  (process.env.NODE_ENV === 'production'
    ? '/opt/etheria/tile-cache'
    : path.join(process.cwd(), '.tile-cache'));

// Bump this whenever the terrain GENERATION algorithm changes (not the seed/dims).
// It is baked into both the server tile-cache path and the client cache-buster
// (?v=) so a deploy + restart fully regenerates tiles and forces browsers to
// refetch — without changing the seed or touching the DB.
// v2: inland water-body cleanup ("lagitos" fix).
// v3: biome-aware precipitation (no desert rivers) + post-river lagito cleanup.
// v4: flux-sink for dry biomes — plains/savanna/desert absorb runoff instead of carrying rivers.
export const TERRAIN_ALGO_VERSION = 'v4';

export async function deleteTileCacheVersion(version: string): Promise<void> {
  try { await fs.promises.rm(versionDir(version), { recursive: true, force: true }); } catch {}
}

export function tileStoreVersion(seed: number, cols: number, rows: number, width: number, height: number): string {
  return `bake-${TERRAIN_ALGO_VERSION}-${seed}-${cols}-${rows}-${width}-${height}`;
}

function versionDir(version: string): string {
  return path.join(TILE_CACHE_DIR, version);
}

export async function initTileStore(): Promise<void> {
  await fs.promises.mkdir(TILE_CACHE_DIR, { recursive: true });
}

export async function readTile(version: string, z: number, x: number, y: number): Promise<Buffer | null> {
  const p = path.join(versionDir(version), String(z), String(x), `${y}.webp`);
  try {
    return await fs.promises.readFile(p);
  } catch {
    return null;
  }
}

export async function writeTile(version: string, z: number, x: number, y: number, buf: Buffer): Promise<void> {
  const dir = path.join(versionDir(version), String(z), String(x));
  await fs.promises.mkdir(dir, { recursive: true });
  const dest = path.join(dir, `${y}.webp`);
  const tmp = `${dest}.${process.pid}.tmp`;
  await fs.promises.writeFile(tmp, buf);
  await fs.promises.rename(tmp, dest);
}

export async function readOverview(version: string, variant: string): Promise<Buffer | null> {
  const p = path.join(versionDir(version), `overview-${variant}.webp`);
  try {
    return await fs.promises.readFile(p);
  } catch {
    return null;
  }
}

export async function writeOverview(version: string, variant: string, buf: Buffer): Promise<void> {
  const dir = versionDir(version);
  await fs.promises.mkdir(dir, { recursive: true });
  const dest = path.join(dir, `overview-${variant}.webp`);
  const tmp = `${dest}.${process.pid}.tmp`;
  await fs.promises.writeFile(tmp, buf);
  await fs.promises.rename(tmp, dest);
}

export async function pruneOldVersions(keep: number): Promise<void> {
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(TILE_CACHE_DIR, { withFileTypes: true });
  } catch {
    return;
  }
  const dirs = entries
    .filter(e => e.isDirectory() && e.name.startsWith('bake-'))
    .map(e => ({ name: e.name, p: path.join(TILE_CACHE_DIR, e.name) }));

  if (dirs.length <= keep) return;

  // Sort by mtime descending, keep the newest `keep`
  const withMtime = await Promise.all(
    dirs.map(async d => {
      const st = await fs.promises.stat(d.p).catch(() => null);
      return { ...d, mtime: st?.mtimeMs ?? 0 };
    })
  );
  withMtime.sort((a, b) => b.mtime - a.mtime);
  const toDelete = withMtime.slice(keep);
  await Promise.all(toDelete.map(d => fs.promises.rm(d.p, { recursive: true, force: true })));
}
