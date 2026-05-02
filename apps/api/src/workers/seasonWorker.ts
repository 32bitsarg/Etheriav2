import { getSeasonState, initializeSeasonState, advanceSeason, calculateIntensity, getCurrentPhase } from '../domain/seasons.js';
import { mergeRecordByLogicalId } from '../infrastructure/matecitoRecord.js';
import { COLLECTIONS } from '../infrastructure/matecito.js';

let seasonWorkerRunning = false;

export function startSeasonWorker(): void {
  if (seasonWorkerRunning) return;
  seasonWorkerRunning = true;

  console.log('🌍 Season worker started (tick every 30s)');

  setInterval(async () => {
    try {
      await processSeasonTicks();
    } catch (err) {
      console.error('Season worker error:', err);
    }
  }, 30000);
}

async function processSeasonTicks(): Promise<void> {
  let state = await getSeasonState();

  if (!state) {
    state = await initializeSeasonState();
    return;
  }

  const now = new Date();
  const endsAt = new Date(state.endsAt);

  // Check if season has ended
  if (now >= endsAt) {
    state = await advanceSeason();
    return;
  }

  // Calculate current intensity and phase
  const intensity = calculateIntensity(state, now);
  const phase = getCurrentPhase(state, now);

  // Update if changed
  const intensityChanged = Math.abs(state.intensity - intensity) > 0.001;
  const phaseChanged = state.phase !== phase;

  if (intensityChanged || phaseChanged) {
    await mergeRecordByLogicalId(COLLECTIONS.WORLD_SEASON_STATE, state.id, {
      intensity,
      phase,
      updatedAt: now.toISOString(),
    });

    if (phaseChanged) {
      console.log(`🌍 Season phase changed: ${state.currentSeason} → ${phase} (intensity: ${intensity.toFixed(2)})`);
    }
  }
}
