// Client-side wrapper around fetch() for this app's own /api routes.
//
// The problem it exists to solve: when the Clerk session expires, the
// middleware answers an API request with a 307 to /sign-in. fetch() follows
// redirects transparently, and the sign-in page responds 200 — so `res.ok` is
// true for a request that never reached the route handler. Every naive
// `if (!res.ok)` check in the app was therefore blind to the single most
// likely real-world failure: an expired session. The write silently vanished.
//
// Callers get an explicit result instead of a Response, so there is no `res.ok`
// to misread.

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "unauthenticated" | "rate_limited" | "error"; status: number };

export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    return { ok: false, reason: "error", status: 0 };
  }

  // Bounced to a sign-in page by the middleware. The status is whatever that
  // page returned (200), so only `redirected` reveals what happened.
  if (res.redirected) {
    return { ok: false, reason: "unauthenticated", status: res.status };
  }
  if (res.status === 401 || res.status === 403) {
    return { ok: false, reason: "unauthenticated", status: res.status };
  }
  if (res.status === 429) {
    return { ok: false, reason: "rate_limited", status: 429 };
  }
  if (!res.ok) {
    return { ok: false, reason: "error", status: res.status };
  }

  // 204, or a route that returns no body.
  if (res.status === 204) return { ok: true, data: undefined as T };

  const data = await res.json().catch(() => null);
  if (data === null) return { ok: false, reason: "error", status: res.status };

  return { ok: true, data: data as T };
}

// Convenience for the common POST-JSON case.
export function apiPost<T = unknown>(path: string, body: unknown): Promise<ApiResult<T>> {
  return apiFetch<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
