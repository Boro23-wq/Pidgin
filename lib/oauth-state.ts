import crypto from "crypto";

// Signs the Clerk user id into the OAuth `state` param so the callback can't
// be tricked into saving Gmail tokens onto an attacker-chosen account (OAuth
// login CSRF) by simply passing a different user id as `state`.
//
// Falls back to CLERK_SECRET_KEY so this keeps working on a deploy where
// OAUTH_STATE_SECRET hasn't been set yet. Prefer the dedicated secret:
// rotating the Clerk key is an ordinary operation, and it should not silently
// invalidate every in-flight OAuth state and every digest feedback link.
const TTL_MS = 10 * 60 * 1000; // state is only valid for 10 minutes

// Read at call time, not module load: a missing secret should fail the one
// request that needs it, not crash the process on import.
function getSecret(): string {
  const secret = process.env.OAUTH_STATE_SECRET || process.env.CLERK_SECRET_KEY;
  if (!secret) {
    throw new Error(
      "Neither OAUTH_STATE_SECRET nor CLERK_SECRET_KEY is set — cannot sign or verify."
    );
  }
  return secret;
}

function sign(payload: string, context: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(`${context}:${payload}`)
    .digest("base64url");
}

// Compares in constant time and without leaking length. Buffers of differing
// length can't go into timingSafeEqual, so hash both sides to a fixed width
// first.
function signatureMatches(actual: string, expected: string): boolean {
  const a = crypto.createHash("sha256").update(actual).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

export function createOAuthState(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ userId, exp: Date.now() + TTL_MS })
  ).toString("base64url");
  return `${payload}.${sign(payload, "oauth-state")}`;
}

export function verifyOAuthState(state: string | null): string | null {
  if (!state) return null;
  const [payload, signature] = state.split(".");
  if (!payload || !signature) return null;

  if (!signatureMatches(signature, sign(payload, "oauth-state"))) return null;

  try {
    const { userId, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof exp !== "number" || Date.now() > exp) return null;
    return typeof userId === "string" ? userId : null;
  } catch {
    return null;
  }
}

// Same construction, no expiry: these ride in digest emails that people open
// days later, and the worst a stale one does is record feedback. Separate
// `context` string from the OAuth state above, so a token minted for one
// purpose can never be replayed as the other.
export function createSignedUid(userId: string): string {
  const payload = Buffer.from(userId).toString("base64url");
  return `${payload}.${sign(payload, "feedback-uid")}`;
}

export function verifySignedUid(uid: string | null): string | null {
  if (!uid) return null;
  const [payload, signature] = uid.split(".");
  if (!payload || !signature) return null;

  if (!signatureMatches(signature, sign(payload, "feedback-uid"))) return null;

  const userId = Buffer.from(payload, "base64url").toString("utf-8");
  return userId || null;
}
