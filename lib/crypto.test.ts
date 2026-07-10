import { describe, it, expect, beforeAll } from "vitest";
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

  // There is no plaintext passthrough. user_tokens was purged before the
  // encrypting code shipped, so an unencrypted value can only mean something
  // wrote to the table outside this module.
  it("refuses a plaintext token rather than passing it through", () => {
    expect(isEncrypted("ya29.some-plaintext-token")).toBe(false);
    expect(() => decryptToken("ya29.some-plaintext-token")).toThrow(/not encrypted/i);
  });

  it("recognizes its own output as encrypted", () => {
    expect(isEncrypted(encryptToken("x"))).toBe(true);
  });
});
