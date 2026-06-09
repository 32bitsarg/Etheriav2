import { getBotSimulationConfig } from "../domain/botConfigData.js";
import { processDueBots, writeBotMetricsSnapshot } from "../domain/botService.js";
import { listActiveWorlds } from "../domain/worldService.js";

let workerRunning = false;
let tickRunning = false;
let lastMetricsAt = 0;

export function startBotWorker(): void {
  const config = getBotSimulationConfig();
  if (!config.enabled) {
    console.log("🤖 Bot worker disabled");
    return;
  }
  if (workerRunning) return;
  workerRunning = true;

  console.log(`🤖 Bot worker started (tick every ${config.tickSeconds}s, target=${config.targetCount})`);

  setInterval(async () => {
    if (tickRunning) return;
    tickRunning = true;
    try {
      await processBotWorkerTick();
    } catch (error) {
      console.error("Bot worker error:", error);
    } finally {
      tickRunning = false;
    }
  }, config.tickSeconds * 1000);
}

export async function processBotWorkerTick() {
  const config = getBotSimulationConfig();
  if (!config.enabled) return { processed: 0, errors: 0, disabled: true };

  const worlds = await listActiveWorlds();
  let totalProcessed = 0;
  let totalErrors = 0;

  for (const world of worlds) {
    const result = await processDueBots(config, world.id);
    totalProcessed += result.processed;
    totalErrors += result.errors;
  }

  if (totalProcessed > 0 || totalErrors > 0) {
    console.log(`🤖 Bot tick processed=${totalProcessed} errors=${totalErrors} worlds=${worlds.length}`);
  }

  if (Date.now() - lastMetricsAt > config.metricsWindowMinutes * 60_000) {
    lastMetricsAt = Date.now();
    await writeBotMetricsSnapshot();
  }

  return { processed: totalProcessed, errors: totalErrors };
}
