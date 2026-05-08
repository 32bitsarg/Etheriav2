import { prisma as db } from "@etheria/database";

async function checkBots() {
  try {
    const bots = await (db as any).botPlayer.findMany({
      include: {
        user: {
          include: {
            cities: true
          }
        },
      },
    });

    console.log(`Total bots: ${bots.length}`);
    for (const bot of bots) {
      const city = bot.user?.cities?.[0];
      console.log(`Bot: ${bot.user?.name} (${bot.profile})`);
      if (city) {
        console.log(`  Resources: G:${city.gold} W:${city.wood} S:${city.stone} F:${city.food}`);
        console.log(`  Production: G:${city.goldPerHour} W:${city.woodPerHour} S:${city.stonePerHour} F:${city.foodPerHour}`);
      } else {
        console.log("  No city found!");
      }
    }
  } catch (err) {
    console.error("Database error:", err);
  }
}

checkBots()
  .catch(console.error)
  .finally(() => (db as any).$disconnect());
