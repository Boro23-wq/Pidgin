import { supabase } from "./supabase";

// Durable, cross-instance rate limiting backed by Postgres
// (see supabase/migrations/004_rate_limits.sql).
//
// The counter has to live outside the process: Vercel runs many concurrent
// serverless instances and recycles them constantly, so a module-level Map
// both resets on cold start and is invisible to sibling instances. The SQL
// function serializes on a per-key advisory lock, so a burst of parallel
// requests can't all read "under the limit" and slip through together.

// Fallback for the window between deploying this code and running migration
// 004 — and for a Postgres outage. Weaker than the DB limiter (per-instance,
// resets on cold start), but strictly better than no limit at all, which is
// what returning `false` would mean.
const localAttempts = new Map<string, number[]>();

function isRateLimitedLocally(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = (localAttempts.get(key) ?? []).filter((t) => now - t < windowMs);
  timestamps.push(now);
  localAttempts.set(key, timestamps);
  return timestamps.length > max;
}

// True when the caller is over the limit and the request should be rejected.
//
// Fails *open* (to the local limiter) rather than closed. A rate limiter that
// takes the whole app down when Postgres hiccups is a worse outage than the
// abuse it prevents — and the local limiter still bounds the damage.
export async function isRateLimited(
  key: string,
  max: number,
  windowMs: number
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
      p_max: max,
      p_window_seconds: Math.ceil(windowMs / 1000),
    });

    if (error) throw error;
    return data === true;
  } catch (err) {
    console.error(`[rate-limit] falling back to in-memory for "${key}":`, err);
    return isRateLimitedLocally(key, max, windowMs);
  }
}
