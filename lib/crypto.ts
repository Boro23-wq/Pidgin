import crypto from "crypto";

// Envelope for Gmail OAuth tokens at rest. The threat model is a leaked
// Supabase read (service-role key, a stray backup, a misconfigured RLS
// policy) — without this, such a leak hands over every participant's live
// Gmail refresh token. It is NOT protection against a full app compromise,
// since the running app necessarily holds the key.
const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12; // 96-bit nonce, the GCM standard
const KEY_BYTES = 32;

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY is not set — refusing to read or write Gmail tokens. " +
        "Generate one with: openssl rand -base64 32"
    );
  }

  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `TOKEN_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes, got ${key.length}. ` +
        "Generate one with: openssl rand -base64 32"
    );
  }

  cachedKey = key;
  return key;
}

// Returns `v1.<iv>.<authTag>.<ciphertext>`, all base64url. The version prefix
// is what isEncrypted() keys off, and it leaves room to rotate algorithms
// later without a flag-day migration.
export function encryptToken(plaintext: string): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(`${VERSION}.`) && value.split(".").length === 4;
}

// Plaintext passthrough is deliberate and temporary: rows written before this
// shipped are still plaintext, and a user whose token silently fails to
// decrypt is a user whose Gmail connection breaks. Once every row is
// backfilled (see supabase/migrations/003_security.sql), delete the
// passthrough so an unencrypted value becomes a hard error.
export function decryptToken(value: string): string {
  if (!isEncrypted(value)) return value;

  const [, ivPart, tagPart, dataPart] = value.split(".");
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivPart, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(dataPart, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
