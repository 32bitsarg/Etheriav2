import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireMatecitoAuth } from '../infrastructure/authMiddleware.js';
import { db, COLLECTIONS } from '../infrastructure/matecito.js';

const genId = () => crypto.randomUUID();

export const dailyQuestsRouter = new Hono();

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

const DAILY_QUEST_TEMPLATES = [
  {
    questId: 'dq_attack_barbarian',
    titleKey: 'play.dailyQuests.templates.attackBarbarian.title',
    summaryKey: 'play.dailyQuests.templates.attackBarbarian.summary',
    target: 3,
    type: 'ATTACK_BARBARIAN',
    reward: { gold: 800, wood: 400, stone: 200 },
  },
  {
    questId: 'dq_train_units',
    titleKey: 'play.dailyQuests.templates.trainUnits.title',
    summaryKey: 'play.dailyQuests.templates.trainUnits.summary',
    target: 20,
    type: 'TRAIN_UNITS',
    reward: { gold: 500, wood: 300, stone: 300 },
  },
  {
    questId: 'dq_upgrade_building',
    titleKey: 'play.dailyQuests.templates.upgradeBuilding.title',
    summaryKey: 'play.dailyQuests.templates.upgradeBuilding.summary',
    target: 1,
    type: 'UPGRADE_BUILDING',
    reward: { gold: 600, wood: 600, stone: 200 },
  },
  {
    questId: 'dq_send_trade',
    titleKey: 'play.dailyQuests.templates.sendTrade.title',
    summaryKey: 'play.dailyQuests.templates.sendTrade.summary',
    target: 1,
    type: 'SEND_TRADE',
    reward: { gold: 400, wood: 500, stone: 400 },
  },
  {
    questId: 'dq_attack_player',
    titleKey: 'play.dailyQuests.templates.attackPlayer.title',
    summaryKey: 'play.dailyQuests.templates.attackPlayer.summary',
    target: 1,
    type: 'ATTACK_PLAYER',
    reward: { gold: 1000, wood: 200, stone: 200 },
  },
  {
    questId: 'dq_donate_alliance',
    titleKey: 'play.dailyQuests.templates.donateAlliance.title',
    summaryKey: 'play.dailyQuests.templates.donateAlliance.summary',
    target: 1,
    type: 'ALLIANCE_CONTRIBUTE',
    reward: { gold: 300, wood: 300, stone: 300 },
  },
];

function pickDailyQuests(date: string) {
  // Deterministic daily rotation using date hash
  let hash = 0;
  for (const c of date) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  const idx = Math.abs(hash) % DAILY_QUEST_TEMPLATES.length;
  // Pick 3 quests rotating through the list
  return [
    DAILY_QUEST_TEMPLATES[idx % DAILY_QUEST_TEMPLATES.length],
    DAILY_QUEST_TEMPLATES[(idx + 2) % DAILY_QUEST_TEMPLATES.length],
    DAILY_QUEST_TEMPLATES[(idx + 4) % DAILY_QUEST_TEMPLATES.length],
  ];
}

async function ensureDailyQuests(userId: string, cityId: string) {
  const date = todayUTC();
  const templates = pickDailyQuests(date);
  for (const t of templates) {
    const existing = await db.from(COLLECTIONS.DAILY_QUESTS)
      .eq('cityId', cityId)
      .eq('questId', t.questId)
      .eq('date', date)
      .getFirst() as any;
    if (!existing.data) {
      await db.from(COLLECTIONS.DAILY_QUESTS).insert({
        id: genId(),
        userId,
        cityId,
        questId: t.questId,
        titleKey: t.titleKey,
        summaryKey: t.summaryKey,
        target: t.target,
        progress: 0,
        reward: t.reward,
        status: 'ACTIVE',
        date,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }
}

dailyQuestsRouter.get('/', requireMatecitoAuth(), async (c) => {
  const userId = c.get('userId');
  const cityId = c.req.query('cityId');
  if (!cityId) return c.json({ error: 'cityId required' }, 400);
  const cityRes = await db.from(COLLECTIONS.CITIES).eq('id', cityId).getFirst() as any;
  if (!cityRes.data || cityRes.data.userId !== userId) return c.json({ error: 'City not found' }, 404);
  await ensureDailyQuests(userId, cityId);
  const date = todayUTC();
  const res = await db.from(COLLECTIONS.DAILY_QUESTS)
    .eq('cityId', cityId)
    .eq('date', date)
    .get() as any;
  const nextResetMs = new Date(date + 'T00:00:00.000Z').getTime() + 86400000;
  return c.json({ quests: res.data ?? [], nextReset: new Date(nextResetMs).toISOString() });
});

dailyQuestsRouter.post('/:id/claim', requireMatecitoAuth(), async (c) => {
  const userId = c.get('userId');
  const id = c.req.param('id');
  const questRes = await db.from(COLLECTIONS.DAILY_QUESTS).eq('id', id).getFirst() as any;
  const quest = questRes.data;
  if (!quest || quest.userId !== userId) return c.json({ error: 'Quest not found' }, 404);
  if (quest.status !== 'CLAIMABLE') return c.json({ error: 'Quest not claimable' }, 400);
  const cityRes = await db.from(COLLECTIONS.CITIES).eq('id', quest.cityId).getFirst() as any;
  const city = cityRes.data;
  if (!city) return c.json({ error: 'City not found' }, 404);
  await db.from(COLLECTIONS.CITIES).eq('id', city.id).merge({
    gold: city.gold + (quest.reward.gold ?? 0),
    wood: city.wood + (quest.reward.wood ?? 0),
    stone: city.stone + (quest.reward.stone ?? 0),
    food: city.food + (quest.reward.food ?? 0),
  }).execute();
  await db.from(COLLECTIONS.DAILY_QUESTS).eq('id', id).merge({
    status: 'CLAIMED',
    claimedAt: new Date().toISOString(),
  }).execute();
  return c.json({ success: true, reward: quest.reward });
});

export async function advanceDailyQuest(cityId: string, type: string, amount = 1) {
  const date = todayUTC();
  const res = await db.from(COLLECTIONS.DAILY_QUESTS)
    .eq('cityId', cityId)
    .eq('date', date)
    .get() as any;
  for (const q of res.data ?? []) {
    if (q.type !== type || q.status !== 'ACTIVE') continue;
    const newProgress = Math.min(q.target, q.progress + amount);
    const newStatus = newProgress >= q.target ? 'CLAIMABLE' : 'ACTIVE';
    await db.from(COLLECTIONS.DAILY_QUESTS).eq('id', q.id).merge({
      progress: newProgress,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    }).execute();
  }
}
