import { Hono } from 'hono';
import { requireMatecitoAuth } from '../infrastructure/authMiddleware.js';
import { db, COLLECTIONS } from '../infrastructure/matecito.js';
import { createNotification } from './notifications.js';

const genId = () => crypto.randomUUID();

export const achievementsRouter = new Hono();

const ACHIEVEMENTS = [
  { key: 'first_building', title: 'Constructor', summary: 'Mejora tu primer edificio', icon: '🏗️', points: 10 },
  { key: 'first_victory', title: 'Primera Victoria', summary: 'Gana tu primera batalla', icon: '⚔️', points: 20 },
  { key: 'first_barbarian', title: 'Cazador de Bárbaros', summary: 'Derrota un campo bárbaro', icon: '🏹', points: 15 },
  { key: 'join_alliance', title: 'Aliado', summary: 'Únete a una alianza', icon: '🤝', points: 10 },
  { key: 'level_5_building', title: 'Maestro Constructor', summary: 'Lleva un edificio al nivel 5', icon: '🏰', points: 25 },
  { key: 'level_10_building', title: 'Arquitecto Legendario', summary: 'Lleva un edificio al nivel 10', icon: '👑', points: 50 },
  { key: 'top_100', title: 'Elite', summary: 'Llega al top 100 del ranking', icon: '🌟', points: 30 },
  { key: 'spy_success', title: 'Maestro del Espionaje', summary: 'Espía exitosamente a otro jugador', icon: '🕵️', points: 20 },
  { key: 'rally_join', title: 'Soldado de Alianza', summary: 'Únete a un rally de alianza', icon: '🚩', points: 15 },
  { key: 'wonder_control', title: 'Guardián del Wonder', summary: 'Tu alianza controla el Wonder', icon: '🏛️', points: 40 },
  { key: '100_barbarian_kills', title: 'Exterminador', summary: 'Derrota 100 campos bárbaros', icon: '💀', points: 60 },
  { key: 'city_conqueror', title: 'Conquistador', summary: 'Conquista una ciudad rival', icon: '⚔️', points: 75 },
];

achievementsRouter.get('/', requireMatecitoAuth(), async (c) => {
  const userId = c.get('userId');
  const playerRes = await db.from(COLLECTIONS.PLAYER_ACHIEVEMENTS).eq('userId', userId).get() as any;
  const unlocked = new Set((playerRes.data ?? []).map((a: any) => a.achievementKey));

  return c.json({
    achievements: ACHIEVEMENTS.map((a) => ({
      ...a,
      unlocked: unlocked.has(a.key),
      unlockedAt: (playerRes.data ?? []).find((p: any) => p.achievementKey === a.key)?.unlockedAt ?? null,
    })),
  });
});

export async function unlockAchievement(userId: string, achievementKey: string) {
  const achievement = ACHIEVEMENTS.find((a) => a.key === achievementKey);
  if (!achievement) return;

  const existingRes = await db.from(COLLECTIONS.PLAYER_ACHIEVEMENTS)
    .eq('userId', userId)
    .eq('achievementKey', achievementKey)
    .getFirst() as any;
  if (existingRes.data) return; // Already unlocked

  await db.from(COLLECTIONS.PLAYER_ACHIEVEMENTS).insert({
    id: genId(),
    userId,
    achievementId: genId(),
    achievementKey,
    unlockedAt: new Date().toISOString(),
  });

  await createNotification(
    userId,
    'ACHIEVEMENT_UNLOCKED',
    `Logro desbloqueado: ${achievement.title}`,
    achievement.summary,
    { achievementKey, points: achievement.points }
  );
}
