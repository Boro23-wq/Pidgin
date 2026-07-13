import { google } from "googleapis";
import { supabase } from "./supabase";
import { encryptToken, decryptToken } from "./crypto";

export interface UserTokens {
  accessToken: string;
  refreshToken: string;
  gmailAddress: string | null;
}

// Thrown (not returned null) when a user previously connected Gmail but the
// stored refresh token no longer works — most commonly a Google OAuth app in
// "Testing" publishing status, where refresh tokens expire after 7 days
// regardless of activity. Distinct from "never connected" (no row at all,
// which still just returns null) so callers can point the user at
// reconnecting instead of a generic "not connected" dead end.
export class GmailReconnectRequiredError extends Error {
  constructor() {
    super("Gmail refresh token is no longer valid — user must reconnect");
    this.name = "GmailReconnectRequiredError";
  }
}

// Covers both an expired/revoked refresh token (invalid_grant, thrown as
// GmailReconnectRequiredError above) and a token that Google accepted but
// that was granted with fewer scopes than requested — e.g. a user unchecked
// the Gmail permission box on the consent screen and the OAuth flow still
// "succeeded". Google's Gmail API returns "Insufficient Permission" /
// reason "insufficientPermissions" for the latter at request time, not at
// token-exchange time, so it surfaces from a completely different code path
// (a live Gmail API call, not getValidTokens) but needs the identical fix:
// the user has to reconnect and actually grant Gmail access this time.
export function isGmailReconnectRequiredError(error: unknown): boolean {
  if (error instanceof GmailReconnectRequiredError) return true;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : (() => {
            try {
              return JSON.stringify(error);
            } catch {
              return "";
            }
          })();
  const lower = message.toLowerCase();
  return (
    lower.includes("invalid_grant") ||
    lower.includes("invalid credentials") ||
    lower.includes("insufficient authentication scopes") ||
    lower.includes("insufficient permission") ||
    lower.includes("insufficientpermissions")
  );
}

export async function getValidTokens(clerkUserId: string): Promise<UserTokens | null> {
  const { data, error } = await supabase
    .from("user_tokens")
    .select("access_token, refresh_token, token_expiry, gmail_address")
    .eq("clerk_user_id", clerkUserId)
    .single();

  if (error || !data) return null;

  const refreshToken = decryptToken(data.refresh_token);

  const expiry = new Date(data.token_expiry);
  const fiveMinutes = 5 * 60 * 1000;
  const needsRefresh = expiry.getTime() - Date.now() < fiveMinutes;

  if (!needsRefresh) {
    return {
      accessToken: decryptToken(data.access_token),
      refreshToken,
      gmailAddress: data.gmail_address,
    };
  }

  // Refresh the access token
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    const newExpiry = new Date(credentials.expiry_date ?? Date.now() + 3600 * 1000);

    // Google may rotate the refresh token on refresh; dropping the new one
    // leaves a stale token stored, and the next refresh fails with
    // invalid_grant — forcing an unnecessary Gmail reconnect.
    const newRefreshToken = credentials.refresh_token ?? refreshToken;

    await supabase
      .from("user_tokens")
      .update({
        access_token: encryptToken(credentials.access_token!),
        token_expiry: newExpiry.toISOString(),
        ...(credentials.refresh_token
          ? { refresh_token: encryptToken(credentials.refresh_token) }
          : {}),
      })
      .eq("clerk_user_id", clerkUserId);

    return {
      accessToken: credentials.access_token!,
      refreshToken: newRefreshToken,
      gmailAddress: data.gmail_address,
    };
  } catch {
    throw new GmailReconnectRequiredError();
  }
}

export async function saveUserTokens(
  clerkUserId: string,
  accessToken: string,
  refreshToken: string,
  expiryDate: Date,
  gmailAddress: string
): Promise<void> {
  await supabase.from("user_tokens").upsert(
    {
      clerk_user_id: clerkUserId,
      access_token: encryptToken(accessToken),
      refresh_token: encryptToken(refreshToken),
      token_expiry: expiryDate.toISOString(),
      gmail_address: gmailAddress,
    },
    { onConflict: "clerk_user_id" }
  );
}

// Revokes the grant with Google, then drops the row. Order matters: if the
// delete ran first and revocation then failed, we'd have lost the only copy
// of the token and Google would keep the grant alive forever. Revocation is
// best-effort — a token Google already considers dead 400s here, which is
// success for our purposes.
export async function revokeUserTokens(clerkUserId: string): Promise<void> {
  const { data } = await supabase
    .from("user_tokens")
    .select("refresh_token")
    .eq("clerk_user_id", clerkUserId)
    .single();

  if (data?.refresh_token) {
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
      );
      await oauth2Client.revokeToken(decryptToken(data.refresh_token));
    } catch (err) {
      console.error(`[tokens] revoke failed for ${clerkUserId}:`, err);
    }
  }

  await supabase.from("user_tokens").delete().eq("clerk_user_id", clerkUserId);
}
