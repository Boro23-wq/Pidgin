import { describe, it, expect, vi, afterEach } from "vitest";
import { apiFetch, apiPost } from "./api-fetch";

function mockResponse(init: {
  status?: number;
  redirected?: boolean;
  body?: unknown;
}): Response {
  const status = init.status ?? 200;
  return {
    ok: status >= 200 && status < 300,
    status,
    redirected: init.redirected ?? false,
    json: async () => {
      if (init.body === undefined) throw new Error("no body");
      return init.body;
    },
  } as unknown as Response;
}

function stubFetch(res: Response | (() => never)) {
  vi.stubGlobal("fetch", vi.fn(async () => (typeof res === "function" ? res() : res)));
}

afterEach(() => vi.unstubAllGlobals());

describe("apiFetch", () => {
  it("returns the parsed body on success", async () => {
    stubFetch(mockResponse({ body: { ok: true, count: 3 } }));
    const res = await apiFetch<{ ok: boolean; count: number }>("/api/x");
    expect(res).toEqual({ ok: true, data: { ok: true, count: 3 } });
  });

  // The whole reason this module exists. An expired Clerk session makes the
  // middleware answer with a 307 to /sign-in; fetch follows it and the sign-in
  // page returns 200, so `res.ok` is true for a request that never reached the
  // route handler. Only `redirected` distinguishes it.
  it("treats a followed redirect as unauthenticated, not success", async () => {
    stubFetch(mockResponse({ status: 200, redirected: true, body: { some: "html-ish" } }));
    const res = await apiFetch("/api/update-summary");
    expect(res).toEqual({ ok: false, reason: "unauthenticated", status: 200 });
  });

  it("maps 401 and 403 to unauthenticated", async () => {
    stubFetch(mockResponse({ status: 401, body: {} }));
    expect(await apiFetch("/api/x")).toMatchObject({ ok: false, reason: "unauthenticated" });

    stubFetch(mockResponse({ status: 403, body: {} }));
    expect(await apiFetch("/api/x")).toMatchObject({ ok: false, reason: "unauthenticated" });
  });

  it("maps 429 to rate_limited so callers can say so specifically", async () => {
    stubFetch(mockResponse({ status: 429, body: {} }));
    expect(await apiFetch("/api/x")).toEqual({ ok: false, reason: "rate_limited", status: 429 });
  });

  it("maps other non-2xx to error", async () => {
    stubFetch(mockResponse({ status: 500, body: {} }));
    expect(await apiFetch("/api/x")).toEqual({ ok: false, reason: "error", status: 500 });
  });

  it("reports a network failure rather than throwing", async () => {
    stubFetch(() => {
      throw new TypeError("Failed to fetch");
    });
    expect(await apiFetch("/api/x")).toEqual({ ok: false, reason: "error", status: 0 });
  });

  it("treats an unparseable body as an error, not a success with null data", async () => {
    stubFetch(mockResponse({ status: 200 })); // json() throws
    expect(await apiFetch("/api/x")).toEqual({ ok: false, reason: "error", status: 200 });
  });

  it("passes 204 through with no body", async () => {
    stubFetch(mockResponse({ status: 204 }));
    expect(await apiFetch("/api/x")).toEqual({ ok: true, data: undefined });
  });
});

describe("apiPost", () => {
  it("sends JSON", async () => {
    const spy = vi.fn(async () => mockResponse({ body: { ok: true } }));
    vi.stubGlobal("fetch", spy);

    await apiPost("/api/update-summary", { id: "a", is_public: true });

    expect(spy).toHaveBeenCalledWith("/api/update-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "a", is_public: true }),
    });
  });
});
