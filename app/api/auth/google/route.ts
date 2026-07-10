import { auth } from "@clerk/nextjs/server";
import { google } from "googleapis";
import { createOAuthState } from "@/lib/oauth-state";
import { revokeUserTokens } from "@/lib/tokens";
import { isRateLimited } from "@/lib/rate-limit";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.redirect(new URL("/sign-in", process.env.NEXT_PUBLIC_APP_URL!));
  }

  if (await isRateLimited(`oauth-init:${userId}`, 5, 5 * 60 * 1000)) {
    return Response.redirect(
      new URL("/?error=rate_limited", process.env.NEXT_PUBLIC_APP_URL!)
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  );

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    state: createOAuthState(userId),
  });

  return Response.redirect(url);
}

// Disconnect Gmail: revokes the grant with Google, then drops the stored
// tokens. Previously the only way to do this was to email the founder and
// wait, or to find the revoke screen buried in Google account settings —
// neither of which is a real control for the person whose inbox it is.
//
// Scoped to disconnection, not erasure: summaries the user has already
// generated are theirs and stay until they delete them or retention expires.
export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await revokeUserTokens(userId);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[auth/google] disconnect failed:", err);
    return Response.json({ error: "Could not disconnect Gmail" }, { status: 500 });
  }
}
