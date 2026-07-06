import crypto from "crypto";

// Signs the Clerk user id into the OAuth `state` param so the callback can't
// be tricked into saving Gmail tokens onto an attacker-chosen account (OAuth
// login CSRF) by simply passing a different user id as `state`.
const SECRET = process.env.CLERK_SECRET_KEY!;
const TTL_MS = 10 * 60 * 1000; // state is only valid for 10 minutes

export function createOAuthState(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ userId, exp: Date.now() + TTL_MS })
  ).toString("base64url");
  const signature = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyOAuthState(state: string | null): string | null {
  if (!state) return null;
  const [payload, signature] = state.split(".");
  if (!payload || !signature) return null;

  const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const { userId, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof exp !== "number" || Date.now() > exp) return null;
    return typeof userId === "string" ? userId : null;
  } catch {
    return null;
  }
}
