import { auth } from "@clerk/nextjs/server";
import { google } from "googleapis";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.redirect(new URL("/sign-in", process.env.NEXT_PUBLIC_APP_URL!));
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
    state: userId,
  });

  return Response.redirect(url);
}
