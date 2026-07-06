// Best-effort in-memory rate limiter. State resets on cold start in
// serverless environments — acceptable for gating OAuth-initiation attempts,
// since this only throttles requests to open Google's own consent screen and
// no data is mutated until the callback exchanges a code for tokens.
const attempts = new Map<string, number[]>();

export function isRateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = (attempts.get(key) ?? []).filter((t) => now - t < windowMs);
  timestamps.push(now);
  attempts.set(key, timestamps);
  return timestamps.length > max;
}
