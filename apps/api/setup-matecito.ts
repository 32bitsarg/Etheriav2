import dotenv from 'dotenv';
if (!process.env.NEXT_PUBLIC_MATECITO_URL) {
  dotenv.config({ path: '../../.env' });
}

import { createClient } from 'matecitodb';

const url = process.env.NEXT_PUBLIC_MATECITO_URL!;
const serviceKey = process.env.MATECITO_SERVICE_KEY!;

// Use v1 for collection creation (v2 has a bug)
const dbAdminV1 = createClient({ url, apiKey: serviceKey, apiVersion: 'v1' });
// Use v2 for everything else
const dbAdminV2 = createClient({ url, apiKey: serviceKey, apiVersion: 'v2' });

// Collections we want the project to own (created on setup).
const CORE_COLLECTIONS = [
  'users',
  'cities',
  'buildings',
  'units',
  'build_queues',
  'training_queues',
  'research_queues',
  'city_techs',
  'alliances',
  'alliance_members',
  'chat_messages',
  'battles',
  'battle_reports',
  'islands',
  'island_slots',
  'sessions',
] as const;

// Collections we should delete if they exist (legacy or test).
const CLEANUP_EXTRA = [
  'building_configs',
  'unit_configs',
  'tech_configs',
  'world_config',
  'user',
  'city',
  'building',
  'unit',
  'test_collection',
  'v1_test_col',
] as const;

const COLLECTIONS = [...CORE_COLLECTIONS, ...CLEANUP_EXTRA];

async function truncateCollection(name: string) {
  // Matecito admin API should be able to delete collections with records,
  // but some environments intermittently refuse. We keep a best-effort
  // truncate as a fallback for legacy v1 behavior.
  // 1) Try bulk soft-delete (fast). Some backends keep soft-deleted rows around,
  // which still prevents collection deletion. We'll follow up with hardDelete.
  await (dbAdminV2 as any).from(name).delete().execute().catch(() => null);

  // 2) Hard-delete by ID, including soft-deleted records.
  let totalHardDeleted = 0;
  for (let round = 0; round < 120; round++) {
    const res = await (dbAdminV2 as any).from(name).includeDeleted().limit(500).get().catch((e: any) => ({ error: e })) as any;
    if (res?.error) {
      console.log(`  ⚠️  Truncate failed (${name}): ${res.error.message ?? res.error}`);
      return;
    }

    const rows = (res.data ?? []) as any[];
    if (rows.length === 0) break;

    for (const row of rows) {
      const id = row?.id;
      if (!id) continue;
      const del = await (dbAdminV2 as any).from(name).hardDelete(id).catch((e: any) => ({ error: e })) as any;
      const err = del?.error ?? del?.err;
      if (err) {
        const msg = err.message ?? err;
        if (!/record not found/i.test(String(msg))) {
          console.log(`  ⚠️  hardDelete failed (${name}/${id}): ${msg}`);
        }
      } else {
        totalHardDeleted++;
      }
    }
  }

  console.log(`  🧽 Truncated: ${name} (hardDeleted=${totalHardDeleted})`);
}

async function cleanup() {
  console.log('🧹 Cleaning existing collections...\n');
  const list = await dbAdminV2.collections.list() as any;
  for (const col of list.data ?? []) {
    if (!COLLECTIONS.includes(col.name)) continue;

    try {
      // In practice, some Matecito deployments refuse collection deletion when records exist.
      // Truncate first to make deletion deterministic.
      await truncateCollection(col.name);

      const delV2 = await dbAdminV2.collections.delete(col.name) as any;
      if (delV2?.error) {
        console.log(`  ⚠️  Delete failed (${col.name}): ${delV2.error.message ?? delV2.error}`);

        // Fallback delete via v1 admin API.
        const delV1 = await (dbAdminV1 as any).collections.delete(col.name) as any;
        if (delV1?.error) {
          console.log(`  ⚠️  Delete failed v1 (${col.name}): ${delV1.error.message ?? delV1.error}`);
        } else {
          console.log(`  💀 Deleted: ${col.name}`);
        }
      } else {
        console.log(`  💀 Deleted: ${col.name}`);
      }
    } catch (e: any) {
      console.log(`  ⚠️  Cleanup error (${col.name}): ${e?.message ?? String(e)}`);
    }
  }

  const stillThere = (await dbAdminV2.collections.list() as any).data ?? [];
  const leftover = stillThere.filter((c: any) => COLLECTIONS.includes(c.name)).map((c: any) => c.name);
  if (leftover.length > 0) {
    console.log('\n⚠️  Some collections could not be deleted (leftover):');
    for (const name of leftover) console.log(`  - ${name}`);
  }
}

async function setup() {
  await cleanup();

  console.log('\n🔧 Creating collections via v1 API...\n');

  for (const col of CORE_COLLECTIONS) {
    const res = await (dbAdminV1 as any).collections.create(col) as any;
    if (res.error) {
      console.log(`  ⚠️  ${col}: ${res.error.message}`);
    } else {
      console.log(`  ✅ Created: ${col}`);
    }
  }

  console.log('\n🎉 All collections ready!');
}

setup().catch(console.error);
