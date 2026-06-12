import { prisma } from "@etheria/database";

// Optimistic version-stamp guard for resource writes.
// INVARIANT: every resource writer in this codebase must also bump `lastResourceUpdate`.
// If a future writer forgets this, the guard silently weakens. Keep this comment prominent.
export class ConcurrentModificationError extends Error {
  constructor() { super("City resources changed concurrently — retry"); }
}

export async function withConcurrencyRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 0; ; i++) {
    try { return await fn(); }
    catch (e) {
      if (e instanceof ConcurrentModificationError && i < attempts - 1) continue;
      throw e;
    }
  }
}

// Atomically spend resources + run extraWork inside a single interactive transaction.
// Guards against concurrent spends using lastResourceUpdate as an optimistic version stamp.
export async function commitCityResources(opts: {
  cityId: string;
  expectedStamp: Date;
  newResources: { gold: number; wood: number; stone: number; food: number; gems: number };
  extraWork: (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => Promise<void>;
}): Promise<Date> {
  const newStamp = new Date(Math.max(Date.now(), opts.expectedStamp.getTime() + 1));
  await prisma.$transaction(async (tx) => {
    const result = await tx.city.updateMany({
      where: { id: opts.cityId, lastResourceUpdate: opts.expectedStamp },
      data: {
        gold: opts.newResources.gold,
        wood: opts.newResources.wood,
        stone: opts.newResources.stone,
        food: opts.newResources.food,
        gems: opts.newResources.gems,
        lastResourceUpdate: newStamp,
      },
    });
    if (result.count === 0) throw new ConcurrentModificationError();
    await opts.extraWork(tx);
  });
  return newStamp;
}
