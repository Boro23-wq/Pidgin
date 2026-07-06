import { google } from "googleapis";
import { saveUserTokens } from "@/lib/tokens";
import { verifyOAuthState } from "@/lib/oauth-state";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  // Verifies the state was signed by createOAuthState() and hasn't expired —
  // prevents a forged `state` from linking Gmail tokens to the wrong account.
  const clerkUserId = verifyOAuthState(searchParams.get("state"));

  if (!code || !clerkUserId) {
    return Response.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/?error=oauth_failed`);
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get the user's Gmail address
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();
    const gmailAddress = userInfo.email ?? "";

    await saveUserTokens(
      clerkUserId,
      tokens.access_token!,
      tokens.refresh_token!,
      new Date(tokens.expiry_date ?? Date.now() + 3600 * 1000),
      gmailAddress
    );

    return Response.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/?gmail=connected`);
  } catch (err) {
    console.error("OAuth callback error:", err);
    return Response.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/?error=oauth_failed`);
  }
}
