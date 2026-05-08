import { processDueBots } from "../apps/api/src/domain/botService.js";
import { getBotSimulationConfig } from "../apps/api/src/domain/botConfigData.js";

async function testBots() {
  console.log("🧪 Starting Bot System v2 Test...");
  const config = getBotSimulationConfig();
  config.enabled = true;
  config.maxBotsPerTick = 10;
  
  try {
    const result = await processDueBots(config);
    console.log(`✅ Test completed. Processed: ${result.processed}, Errors: ${result.errors}`);
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testBots();
