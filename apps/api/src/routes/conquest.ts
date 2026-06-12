import { Hono } from 'hono';
import { requireMatecitoAuth } from '../infrastructure/authMiddleware.js';
import { db, COLLECTIONS } from '../infrastructure/matecito.js';
import { createNotification } from './notifications.js';
import { createActivityFeedEntry } from './activityFeed.js';
import { unlockAchievement } from './achievements.js';

const genId = () => crypto.randomUUID();

export const conquestRouter = new Hono();

const WINS_REQUIRED = 3;

// Called internally when a battle is won
export async function recordConquestWin(attackerCityId: string, defenderCityId: string) {
  const existingRes = await db.from(COLLECTIONS.CITY_CONQUEST_PROGRESS)
    .eq('attackerCityId', attackerCityId)
    .eq('defenderCityId', defenderCityId)
    .getFirst() as any;

  const now = new Date().toISOString();

  if (existingRes.data) {
    const newWins = existingRes.data.wins + 1;
    await db.from(COLLECTIONS.CITY_CONQUEST_PROGRESS)
      .eq('id', existingRes.data.id)
      .merge({ wins: newWins, updatedAt: now })
      .execute();

    if (newWins >= WINS_REQUIRED) {
      // City conquered!
      const [attackerRes, defenderRes] = await Promise.all([
        db.from(COLLECTIONS.CITIES).eq('id', attackerCityId).getFirst() as any,
        db.from(COLLECTIONS.CITIES).eq('id', defenderCityId).getFirst() as any,
      ]);
      const attacker = attackerRes.data;
      const defender = defenderRes.data;

      // Notify defender
      if (defender) {
        await createNotification(
          defender.userId,
          'CITY_CONQUERED',
          '¡Tu ciudad fue conquistada!',
          `${attacker?.name ?? 'Un enemigo'} conquistó tu ciudad ${defender.name}`,
          { attackerCityId, defenderCityId }
        );
      }

      // Activity feed
      if (attacker && defender) {
        await createActivityFeedEntry(
          'CITY_CONQUERED',
          attacker.name,
          attackerCityId,
          { defenderName: defender.name, defenderCityId }
        );
      }

      // Reset progress after conquest
      await db.from(COLLECTIONS.CITY_CONQUEST_PROGRESS)
        .eq('id', existingRes.data.id)
        .merge({ wins: 0, updatedAt: now })
        .execute();

      if (attacker) unlockAchievement(attacker.userId, 'city_conqueror').catch(() => {});
      return { conquered: true };
    }

    // Warn defender about ongoing conquest
    const defenderRes = await db.from(COLLECTIONS.CITIES).eq('id', defenderCityId).getFirst() as any;
    const attackerRes = await db.from(COLLECTIONS.CITIES).eq('id', attackerCityId).getFirst() as any;
    if (defenderRes.data) {
      await createNotification(
        defenderRes.data.userId,
        'UNDER_ATTACK',
        '¡Tu ciudad está siendo asediada!',
        `${attackerRes.data?.name ?? 'Un enemigo'} lleva ${newWins}/${WINS_REQUIRED} victorias. ¡Defiéndete!`,
        { attackerCityId, defenderCityId, wins: newWins, winsRequired: WINS_REQUIRED }
      );
    }
  } else {
    await db.from(COLLECTIONS.CITY_CONQUEST_PROGRESS).insert({
      id: genId(),
      attackerCityId,
      defenderCityId,
      wins: 1,
      winsRequired: WINS_REQUIRED,
      updatedAt: now,
    });
  }

  return { conquered: false };
}

// Called internally when defender wins
export async function recordConquestDefeat(attackerCityId: string, defenderCityId: string) {
  const existingRes = await db.from(COLLECTIONS.CITY_CONQUEST_PROGRESS)
    .eq('attackerCityId', attackerCityId)
    .eq('defenderCityId', defenderCityId)
    .getFirst() as any;

  if (existingRes.data && existingRes.data.wins > 0) {
    await db.from(COLLECTIONS.CITY_CONQUEST_PROGRESS)
      .eq('id', existingRes.data.id)
      .merge({ wins: 0, updatedAt: new Date().toISOString() })
      .execute();
  }
}

conquestRouter.get('/status/:cityId', requireMatecitoAuth(), async (c) => {
  const userId = c.get('userId');
  const cityId = c.req.param('cityId');

  const cityRes = await db.from(COLLECTIONS.CITIES).eq('id', cityId).getFirst() as any;
  if (!cityRes.data || cityRes.data.userId !== userId) return c.json({ error: 'City not found' }, 404);

  const incomingRes = await db.from(COLLECTIONS.CITY_CONQUEST_PROGRESS)
    .eq('defenderCityId', cityId)
    .get() as any;

  const outgoingRes = await db.from(COLLECTIONS.CITY_CONQUEST_PROGRESS)
    .eq('attackerCityId', cityId)
    .get() as any;

  const enrichIncoming = await Promise.all((incomingRes.data ?? []).map(async (p: any) => {
    const attackerRes = await db.from(COLLECTIONS.CITIES).eq('id', p.attackerCityId).getFirst() as any;
    return { ...p, attackerName: attackerRes.data?.name };
  }));

  const enrichOutgoing = await Promise.all((outgoingRes.data ?? []).map(async (p: any) => {
    const defenderRes = await db.from(COLLECTIONS.CITIES).eq('id', p.defenderCityId).getFirst() as any;
    return { ...p, defenderName: defenderRes.data?.name };
  }));

  return c.json({
    incoming: enrichIncoming,
    outgoing: enrichOutgoing,
    winsRequired: WINS_REQUIRED,
  });
});
