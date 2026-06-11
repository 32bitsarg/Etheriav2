/**
 * Generic ETA-driven refetchInterval callback for React Query.
 * Polls faster when a tracked event is about to arrive, slower when idle.
 * Based on the adaptive pattern already used in useCity().
 */
export function etaInterval<T>(
  getEtas: (data: T) => (string | null | undefined)[],
  opts: {
    idleMs: number | false;
    nearMs?: number;
    midMs?: number;
    farMs?: number;
  }
) {
  const { idleMs, nearMs = 1_000, midMs = 5_000, farMs = 20_000 } = opts;
  return (query: { state: { data?: T } }) => {
    const data = query.state.data;
    if (!data) return idleMs;
    const now = Date.now();
    const soonest = getEtas(data)
      .filter(Boolean)
      .map((t) => new Date(t!).getTime() - now)
      .filter((ms) => ms > -30_000)
      .sort((a, b) => a - b)[0];
    if (soonest === undefined) return idleMs;
    if (soonest < 10_000) return nearMs;
    if (soonest < 60_000) return midMs;
    return farMs;
  };
}
