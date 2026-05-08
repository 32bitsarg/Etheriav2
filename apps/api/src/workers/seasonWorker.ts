import { getSeasonState, initializeSeasonState, advanceSeason, calculateIntensity, getCurrentPhase } from "../domain/seasons.js";
import { mergeRecordByLogicalId } from "../infrastructure/matecitoRecord.js";
import { db, COLLECTIONS } from "../infrastructure/matecito.js";
import { createGameReport } from "../domain/reports.js";

let seasonWorkerRunning = false;

export function startSeasonWorker(): void {
  if (seasonWorkerRunning) return;
  seasonWorkerRunning = true;

  console.log("Season worker started (tick every 30s)");

  setInterval(async () => {
    try {
      await processSeasonTicks();
    } catch (err) {
      console.error("Season worker error:", err);
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

  if (now >= endsAt) {
    state = await advanceSeason();
    await emitSeasonReports(`season:${state.currentSeason}:${state.startedAt}`, state, "Season changed", `The world entered ${state.currentSeason}.`);
    return;
  }

  const intensity = calculateIntensity(state, now);
  const phase = getCurrentPhase(state, now);
  const intensityChanged = Math.abs(state.intensity - intensity) > 0.001;
  const phaseChanged = state.phase !== phase;

  if (intensityChanged || phaseChanged) {
    await mergeRecordByLogicalId(COLLECTIONS.WORLD_SEASON_STATE, state.id, {
      intensity,
      phase,
      updatedAt: now.toISOString(),
    });

    if (phaseChanged) {
      console.log(`Season phase changed: ${state.currentSeason} -> ${phase} (intensity: ${intensity.toFixed(2)})`);
      await emitSeasonReports(`phase:${state.currentSeason}:${phase}:${state.startedAt}`, { ...state, phase, intensity }, "Season phase changed", `${state.currentSeason} is now in ${phase}.`);
    }
  }
}

async function emitSeasonReports(reportKey: string, state: any, title: string, summary: string) {
  const reportsRes = await db.from(COLLECTIONS.GAME_REPORTS).eq("type", "SYSTEM").limit(5000).get() as any;
  const alreadyEmitted = (reportsRes.data ?? []).some((report: any) => report.payload?.seasonReportKey === reportKey);
  if (alreadyEmitted) return;

  const citiesRes = await db.from(COLLECTIONS.CITIES).limit(5000).get() as any;
  const seenUsers = new Set<string>();
  for (const city of citiesRes.data ?? []) {
    if (!city.userId || seenUsers.has(city.userId)) continue;
    seenUsers.add(city.userId);
    await createGameReport({
      type: "SYSTEM",
      userId: city.userId,
      cityId: city.id,
      title,
      summary,
      payload: {
        seasonReportKey: reportKey,
        currentSeason: state.currentSeason,
        nextSeason: state.nextSeason,
        phase: state.phase,
        intensity: state.intensity,
        endsAt: state.endsAt,
        impact: state.currentSeason === "WINTER"
          ? "Winter increases food pressure and can reduce combat endurance."
          : "Seasonal production and terrain modifiers may change.",
      },
    });
  }
}
