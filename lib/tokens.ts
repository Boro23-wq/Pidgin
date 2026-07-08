import { google } from "googleapis";
import { supabase } from "./supabase";

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

  const expiry = new Date(data.token_expiry);
  const fiveMinutes = 5 * 60 * 1000;
  const needsRefresh = expiry.getTime() - Date.now() < fiveMinutes;

  if (!needsRefresh) {
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      gmailAddress: data.gmail_address,
    };
  }

  // Refresh the access token
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  );
  oauth2Client.setCredentials({ refresh_token: data.refresh_token });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    const newExpiry = new Date(credentials.expiry_date ?? Date.now() + 3600 * 1000);

    await supabase
      .from("user_tokens")
      .update({
        access_token: credentials.access_token,
        token_expiry: newExpiry.toISOString(),
      })
      .eq("clerk_user_id", clerkUserId);

    return {
      accessToken: credentials.access_token!,
      refreshToken: data.refresh_token,
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
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expiry: expiryDate.toISOString(),
      gmail_address: gmailAddress,
    },
    { onConflict: "clerk_user_id" }
  );
}
