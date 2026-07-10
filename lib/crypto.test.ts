import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "crypto";

let encryptToken: typeof import("./crypto").encryptToken;
let decryptToken: typeof import("./crypto").decryptToken;
let isEncrypted: typeof import("./crypto").isEncrypted;

beforeAll(async () => {
  process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
  ({ encryptToken, decryptToken, isEncrypted } = await import("./crypto"));
});

describe("token encryption", () => {
  it("round-trips a token", () => {
    const token = "1//0abcdefgHIJKLMNOP-refresh-token";
    expect(decryptToken(encryptToken(token))).toBe(token);
  });

  it("produces different ciphertext each time (random IV), so equal tokens aren't linkable", () => {
    const a = encryptToken("same-token");
    const b = encryptToken("same-token");
    expect(a).not.toBe(b);
    expect(decryptToken(a)).toBe(decryptToken(b));
  });

  it("never leaves the plaintext visible in the ciphertext", () => {
    expect(encryptToken("super-secret")).not.toContain("super-secret");
  });

  it("rejects tampered ciphertext rather than returning garbage (GCM auth tag)", () => {
    const encrypted = encryptToken("a-token");
    const [version, iv, tag, data] = encrypted.split(".");
    const flipped = Buffer.from(data, "base64url");
    flipped[0] ^= 0xff;
    const tampered = [version, iv, tag, flipped.toString("base64url")].join(".");

    expect(() => decryptToken(tampered)).toThrow();
  });

  // Rows written before encryption shipped are still plaintext. They must keep
  // working until the backfill completes, or every existing user's Gmail
  // connection breaks on deploy. Remove this behavior once no plaintext rows
  // remain — see supabase/migrations/003_security.sql.
  it("passes a legacy plaintext value through unchanged", () => {
    expect(isEncrypted("ya29.legacy-plaintext-token")).toBe(false);
    expect(decryptToken("ya29.legacy-plaintext-token")).toBe("ya29.legacy-plaintext-token");
  });

  it("recognizes its own output as encrypted", () => {
    expect(isEncrypted(encryptToken("x"))).toBe(true);
  });

  // Step 3 of the rollout: once every row is backfilled, a plaintext token is
  // a bug, not a legacy row, and must fail loudly.
  describe("TOKENS_REQUIRE_ENCRYPTION=true", () => {
    beforeAll(() => {
      process.env.TOKENS_REQUIRE_ENCRYPTION = "true";
    });
    afterAll(() => {
      delete process.env.TOKENS_REQUIRE_ENCRYPTION;
    });

    it("throws on a plaintext token rather than silently passing it through", () => {
      expect(() => decryptToken("ya29.plaintext")).toThrow(/unencrypted token/i);
    });

    it("still decrypts properly encrypted tokens", () => {
      expect(decryptToken(encryptToken("still-fine"))).toBe("still-fine");
    });
  });
});
