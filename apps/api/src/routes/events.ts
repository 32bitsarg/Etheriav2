import { Hono } from 'hono';
import { requireMatecitoAuth } from '../infrastructure/authMiddleware.js';
import { db, COLLECTIONS } from '../infrastructure/matecito.js';

export const eventsRouter = new Hono();

// Daily events rotate by day-of-week. Each event runs 20:00–22:00 server time.
const DAILY_EVENTS = [
  {
    id: 'loot_day',
    name: 'Día de Saqueo',
    summary: 'Loot 2x de campos bárbaros',
    effect: { type: 'BARBARIAN_LOOT_MULTIPLIER', value: 2 },
    icon: '⚔️',
    color: '#ef4444',
    dayOfWeek: 1, // Monday
  },
  {
    id: 'market_day',
    name: 'Feria del Mercado',
    summary: 'Sin comisión en el mercado',
    effect: { type: 'MARKET_FEE_MULTIPLIER', value: 0 },
    icon: '🛒',
    color: '#f59e0b',
    dayOfWeek: 2, // Tuesday
  },
  {
    id: 'war_day',
    name: 'Día de Guerra',
    summary: 'PvP da +50% de recursos al atacar',
    effect: { type: 'PVP_LOOT_MULTIPLIER', value: 1.5 },
    icon: '🏹',
    color: '#dc2626',
    dayOfWeek: 3, // Wednesday
  },
  {
    id: 'research_day',
    name: 'Día del Conocimiento',
    summary: 'Investigación 2x más rápida',
    effect: { type: 'RESEARCH_SPEED_MULTIPLIER', value: 2 },
    icon: '📚',
    color: '#7c3aed',
    dayOfWeek: 4, // Thursday
  },
  {
    id: 'production_day',
    name: 'Día de Producción',
    summary: 'Producción de recursos +50%',
    effect: { type: 'PRODUCTION_MULTIPLIER', value: 1.5 },
    icon: '⚡',
    color: '#16a34a',
    dayOfWeek: 5, // Friday
  },
  {
    id: 'wonder_siege',
    name: 'Asedio de la Maravilla',
    summary: 'Compite por el control del Wonder',
    effect: { type: 'WONDER_ACTIVE', value: 1 },
    icon: '🏰',
    color: '#b45309',
    dayOfWeek: 6, // Saturday
  },
  {
    id: 'training_day',
    name: 'Día de Entrenamiento',
    summary: 'Entrenamiento de tropas 2x más rápido',
    effect: { type: 'TRAINING_SPEED_MULTIPLIER', value: 2 },
    icon: '🛡️',
    color: '#0284c7',
    dayOfWeek: 0, // Sunday
  },
];

function getCurrentEvent() {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const hour = now.getUTCHours();

  const todayEvent = DAILY_EVENTS.find((e) => e.dayOfWeek === dayOfWeek);
  if (!todayEvent) return null;

  // Event runs from 20:00 to 22:00 UTC
  const isActive = hour >= 20 && hour < 22;
  const eventStartToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 20, 0, 0));
  const eventEndToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 22, 0, 0));
  const nextEventDay = (dayOfWeek + 1) % 7;
  const nextEvent = DAILY_EVENTS.find((e) => e.dayOfWeek === nextEventDay)!;
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const nextEventStart = new Date(Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate(), 20, 0, 0));

  return {
    current: isActive ? { ...todayEvent, endsAt: eventEndToday.toISOString() } : null,
    today: { ...todayEvent, startsAt: eventStartToday.toISOString(), endsAt: eventEndToday.toISOString() },
    next: { ...nextEvent, startsAt: nextEventStart.toISOString() },
    schedule: DAILY_EVENTS.map((e) => ({
      id: e.id,
      name: e.name,
      summary: e.summary,
      icon: e.icon,
      color: e.color,
      dayOfWeek: e.dayOfWeek,
    })),
  };
}

eventsRouter.get('/current', async (c) => {
  return c.json(getCurrentEvent() ?? { current: null, today: null, next: null, schedule: DAILY_EVENTS });
});

eventsRouter.get('/effect', requireMatecitoAuth(), async (c) => {
  const info = getCurrentEvent();
  return c.json({ activeEffect: info?.current?.effect ?? null });
});

export function getActiveEventEffect(): { type: string; value: number } | null {
  const info = getCurrentEvent();
  return info?.current?.effect ?? null;
}
