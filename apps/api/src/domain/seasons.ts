import { db, COLLECTIONS } from '../infrastructure/matecito.js';
import { mergeRecordByLogicalId } from '../infrastructure/matecitoRecord.js';
import type { Season, SeasonPhase, WorldSeasonState } from '@etheria/shared';
import { LOCAL_SEASON_CONFIG, getSeasonDurationHours, getTransitionDurationHours } from './seasonConfigData.js';

const SEASON_ORDER: Season[] = ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER'];

function getNextSeason(season: Season): Season {
  const idx = SEASON_ORDER.indexOf(season);
  return SEASON_ORDER[(idx + 1) % SEASON_ORDER.length];
}

function getSeasonDisplayName(season: Season): string {
  const names: Record<Season, string> = {
    SPRING: 'Primavera',
    SUMMER: 'Verano',
    AUTUMN: 'Otono',
    WINTER: 'Invierno',
  };
  return names[season];
}

export async function getSeasonState(): Promise<WorldSeasonState | null> {
  const res = await db.from(COLLECTIONS.WORLD_SEASON_STATE).getFirst() as any;
  return res.data ?? null;
}

export async function initializeSeasonState(): Promise<WorldSeasonState> {
  const existing = await getSeasonState();
  if (existing) return existing;

  const now = new Date();
  const durationMs = getSeasonDurationHours() * 60 * 60 * 1000;
  const transitionMs = getTransitionDurationHours() * 60 * 60 * 1000;
  const startMs = LOCAL_SEASON_CONFIG.phaseDurations.startHours * 60 * 60 * 1000;
  const peakMs = durationMs - transitionMs - startMs;

  const currentSeason: Season = 'SPRING';
  const nextSeason = getNextSeason(currentSeason);

  const state: WorldSeasonState = {
    id: crypto.randomUUID(),
    currentSeason,
    nextSeason,
    phase: 'START',
    intensity: 0,
    startedAt: now.toISOString(),
    peakAt: new Date(now.getTime() + startMs).toISOString(),
    transitionAt: new Date(now.getTime() + startMs + peakMs).toISOString(),
    endsAt: new Date(now.getTime() + durationMs).toISOString(),
    updatedAt: now.toISOString(),
  };

  await db.from(COLLECTIONS.WORLD_SEASON_STATE).insert({
    id: state.id,
    currentSeason: state.currentSeason,
    nextSeason: state.nextSeason,
    phase: state.phase,
    intensity: state.intensity,
    startedAt: state.startedAt,
    peakAt: state.peakAt,
    transitionAt: state.transitionAt,
    endsAt: state.endsAt,
    updatedAt: state.updatedAt,
  });

  console.log(`🌍 Season initialized: ${getSeasonDisplayName(currentSeason)} (START)`);
  return state;
}

export async function advanceSeason(): Promise<WorldSeasonState> {
  const current = await getSeasonState();
  if (!current) return initializeSeasonState();

  const now = new Date();
  const durationMs = getSeasonDurationHours() * 60 * 60 * 1000;
  const transitionMs = getTransitionDurationHours() * 60 * 60 * 1000;
  const startMs = LOCAL_SEASON_CONFIG.phaseDurations.startHours * 60 * 60 * 1000;
  const peakMs = durationMs - transitionMs - startMs;

  const newSeason = current.nextSeason;
  const newNext = getNextSeason(newSeason);

  const updated: WorldSeasonState = {
    ...current,
    currentSeason: newSeason,
    nextSeason: newNext,
    phase: 'START',
    intensity: 0,
    startedAt: now.toISOString(),
    peakAt: new Date(now.getTime() + startMs).toISOString(),
    transitionAt: new Date(now.getTime() + startMs + peakMs).toISOString(),
    endsAt: new Date(now.getTime() + durationMs).toISOString(),
    updatedAt: now.toISOString(),
  };

  await mergeRecordByLogicalId(COLLECTIONS.WORLD_SEASON_STATE, current.id, {
    currentSeason: updated.currentSeason,
    nextSeason: updated.nextSeason,
    phase: updated.phase,
    intensity: updated.intensity,
    startedAt: updated.startedAt,
    peakAt: updated.peakAt,
    transitionAt: updated.transitionAt,
    endsAt: updated.endsAt,
    updatedAt: updated.updatedAt,
  });

  console.log(`🌍 Season advanced: ${getSeasonDisplayName(newSeason)} (START)`);
  return updated;
}

export function calculateIntensity(state: WorldSeasonState, now: Date = new Date()): number {
  const startedAt = new Date(state.startedAt).getTime();
  const peakAt = new Date(state.peakAt).getTime();
  const transitionAt = new Date(state.transitionAt).getTime();
  const endsAt = new Date(state.endsAt).getTime();
  const currentTime = now.getTime();

  if (currentTime < peakAt) {
    // Phase START: intensity ramps from 0 to 1
    const progress = (currentTime - startedAt) / (peakAt - startedAt);
    return applyCurve(Math.min(1, Math.max(0, progress)));
  }

  if (currentTime < transitionAt) {
    // Phase PEAK: intensity stays at 1
    return 1;
  }

  if (currentTime < endsAt) {
    // Phase TRANSITION: intensity ramps from 1 to 0
    const progress = (currentTime - transitionAt) / (endsAt - transitionAt);
    return applyCurve(1 - Math.min(1, Math.max(0, progress)));
  }

  // Past end, should have advanced
  return 0;
}

function applyCurve(value: number): number {
  const curve = LOCAL_SEASON_CONFIG.phaseCurve;
  switch (curve) {
    case 'LINEAR':
      return value;
    case 'HARSH':
      return Math.pow(value, 0.7);
    case 'SMOOTH':
    default:
      return Math.sin((value * Math.PI) / 2);
  }
}

export function getCurrentPhase(state: WorldSeasonState, now: Date = new Date()): SeasonPhase {
  const currentTime = now.getTime();
  if (currentTime < new Date(state.peakAt).getTime()) return 'START';
  if (currentTime < new Date(state.transitionAt).getTime()) return 'PEAK';
  return 'TRANSITION';
}
