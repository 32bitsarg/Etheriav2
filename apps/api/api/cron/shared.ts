export type CronRequest = { headers: Record<string, string | string[] | undefined> };
export type CronResponse = { status: (code: number) => { json: (body: unknown) => void } };

export function isCronAuthorized(req: CronRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.authorization === `Bearer ${secret}`;
}
