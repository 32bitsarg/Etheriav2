import { Hono } from 'hono';
import { requireMatecitoAuth } from '../infrastructure/authMiddleware.js';
import { db, COLLECTIONS } from '../infrastructure/matecito.js';

export const rankingsRouter = new Hono();

function calcPower(city: any, buildings: any[], units: any[]) {
  const buildingPower = buildings.reduce((sum: number, b: any) => sum + b.level * 10, 0);
  const unitPower = units.reduce((sum: number, u: any) => sum + u.count * 3, 0);
  return buildingPower + unitPower;
}

rankingsRouter.get('/', requireMatecitoAuth(), async (c) => {
  const citiesRes = await db.from(COLLECTIONS.CITIES).limit(200).get() as any;
  const cities = (citiesRes.data ?? []).filter((c: any) => !c.isBot);

  const rows = await Promise.all(cities.map(async (city: any) => {
    const [buildingsRes, unitsRes, userRes] = await Promise.all([
      db.from(COLLECTIONS.BUILDINGS).eq('cityId', city.id).get() as any,
      db.from(COLLECTIONS.UNITS).eq('cityId', city.id).get() as any,
      db.from(COLLECTIONS.USERS).eq('id', city.userId).getFirst() as any,
    ]);
    const power = calcPower(city, buildingsRes.data ?? [], unitsRes.data ?? []);
    return {
      cityId: city.id,
      cityName: city.name,
      userId: city.userId,
      playerName: userRes.data?.name ?? 'Unknown',
      power,
      posX: city.posX,
      posY: city.posY,
    };
  }));

  rows.sort((a, b) => b.power - a.power);
  const ranked = rows.map((r, i) => ({ ...r, rank: i + 1 }));

  // Update power in DB for all cities (fire and forget)
  for (const r of ranked) {
    db.from(COLLECTIONS.CITIES).eq('id', r.cityId).merge({ power: r.power }).execute();
  }

  return c.json({ rankings: ranked });
});

rankingsRouter.get('/my-rank', requireMatecitoAuth(), async (c) => {
  const userId = c.get('userId');
  const cityId = c.req.query('cityId');
  if (!cityId) return c.json({ error: 'cityId required' }, 400);

  const cityRes = await db.from(COLLECTIONS.CITIES).eq('id', cityId).getFirst() as any;
  const city = cityRes.data;
  if (!city || city.userId !== userId) return c.json({ error: 'City not found' }, 404);

  const citiesRes = await db.from(COLLECTIONS.CITIES).limit(200).get() as any;
  const cities = citiesRes.data ?? [];

  const powers = await Promise.all(cities.map(async (c: any) => {
    const [b, u] = await Promise.all([
      db.from(COLLECTIONS.BUILDINGS).eq('cityId', c.id).get() as any,
      db.from(COLLECTIONS.UNITS).eq('cityId', c.id).get() as any,
    ]);
    return { cityId: c.id, power: calcPower(c, b.data ?? [], u.data ?? []) };
  }));

  powers.sort((a, b) => b.power - a.power);
  const myRank = powers.findIndex((p) => p.cityId === cityId) + 1;
  const myPower = powers.find((p) => p.cityId === cityId)?.power ?? 0;

  return c.json({ rank: myRank, power: myPower, total: powers.length });
});
