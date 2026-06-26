import { google } from "googleapis";
import { supabase } from "./supabase";

export interface UserTokens {
  accessToken: string;
  refreshToken: string;
  gmailAddress: string | null;
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
    return null;
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
