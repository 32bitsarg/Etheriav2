import { getBotSimulationConfig } from "../domain/botConfigData.js";
import { processDueBots, writeBotMetricsSnapshot } from "../domain/botService.js";

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
      const result = await processDueBots(getBotSimulationConfig());
      if (result.processed > 0 || result.errors > 0) {
        console.log(`🤖 Bot tick processed=${result.processed} errors=${result.errors}`);
      }
      if (Date.now() - lastMetricsAt > config.metricsWindowMinutes * 60_000) {
        lastMetricsAt = Date.now();
        await writeBotMetricsSnapshot();
      }
    } catch (error) {
      console.error("Bot worker error:", error);
    } finally {
      tickRunning = false;
    }
  }, config.tickSeconds * 1000);
}
