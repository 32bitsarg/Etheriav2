import { prisma as db } from "@etheria/database";

async function countCities() {
  const count = await (db as any).city.count();
  console.log(`Total cities in DB: ${count}`);
}

countCities()
  .catch(console.error)
  .finally(() => (db as any).$disconnect());
