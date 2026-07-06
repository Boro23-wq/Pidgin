import { auth } from "@clerk/nextjs/server";
import { google } from "googleapis";
import { createOAuthState } from "@/lib/oauth-state";
import { isRateLimited } from "@/lib/rate-limit";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.redirect(new URL("/sign-in", process.env.NEXT_PUBLIC_APP_URL!));
  }

  if (isRateLimited(`oauth-init:${userId}`, 5, 5 * 60 * 1000)) {
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
