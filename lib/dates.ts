// Day-boundary math anchored to the user's IANA timezone. The server runs in
// UTC, so "midnight today" computed with setHours(0,0,0,0) is UTC midnight —
// for users east of UTC that cutoff lands mid-morning and silently excludes
// newsletters that arrived earlier in their local day.

function zoneOffsetMs(date: Date, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
  // Parts carry second precision, so round to whole seconds to avoid a
  // sub-second residue leaking into computed boundaries.
  return Math.round((asUtc - date.getTime()) / 1000) * 1000;
}

// The UTC instant of the most recent midnight in the given zone. Falls back
// to server-local midnight when the zone is missing or invalid, so callers
// never have to pre-validate client-supplied strings.
export function localMidnight(timeZone?: string | null): Date {
  const now = new Date();
  if (timeZone) {
    try {
      const offset = zoneOffsetMs(now, timeZone);
      const dayMs = 24 * 60 * 60 * 1000;
      const wallMidnight = Math.floor((now.getTime() + offset) / dayMs) * dayMs;
      return new Date(wallMidnight - offset);
    } catch {
      // invalid zone — fall through to server-local midnight
    }
  }
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Current hour (0-23) on the user's wall clock; server-local on bad input.
export function localHour(timeZone?: string | null): number {
  if (timeZone) {
    try {
      const hour = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour: "numeric",
        hour12: false,
      }).format(new Date());
      return Number(hour) % 24;
    } catch {
      // invalid zone — fall through
    }
  }
  return new Date().getHours();
}

// Whether a client-supplied string is a usable IANA zone (for deciding
// whether it is worth persisting).
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}
