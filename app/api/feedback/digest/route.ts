import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifySignedUid } from "@/lib/oauth-state";
import { isRateLimited } from "@/lib/rate-limit";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://pidgin.site";

// POST — from in-app toast (uses Clerk session)
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const rating = ["up", "down"].includes(body.rating) ? body.rating : null;
  const message =
    typeof body.message === "string" && body.message.trim()
      ? body.message.slice(0, 2000)
      : null;
  if (!rating && !message) return NextResponse.json({ error: "Empty feedback" }, { status: 400 });

  if (await isRateLimited(`feedback:${userId}`, 10, 24 * 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too much feedback today" }, { status: 429 });
  }

  const { error } = await supabase.from("digest_feedback").insert({
    user_id: userId,
    rating,
    message,
  });

  if (error) {
    console.error("[feedback/digest]", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// GET — from email links (?rating=up|down&uid=<signed>)
//
// This route is public (see middleware.ts) because it's clicked straight from
// an inbox, with no session. The uid is therefore the only thing asserting who
// the feedback belongs to, and it must be signed: a bare base64 user id is
// encoding, not authentication, and would let anyone forge a rating as anyone.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rating = searchParams.get("rating");
  const userId = verifySignedUid(searchParams.get("uid"));

  if (!userId || !rating || !["up", "down"].includes(rating)) {
    return NextResponse.redirect(`${APP_URL}/feedback?status=invalid`);
  }

  // The signed link is public and long-lived — without a cap, its holder
  // can loop it to insert unbounded feedback rows. Silently thank-you the
  // over-limit case; there's nothing actionable for a human clicking twice.
  if (await isRateLimited(`feedback:${userId}`, 10, 24 * 60 * 60 * 1000)) {
    return NextResponse.redirect(`${APP_URL}/feedback?status=thanks&rating=${rating}`);
  }

  await supabase.from("digest_feedback").insert({
    user_id: userId,
    rating,
    message: null,
  });

  return NextResponse.redirect(`${APP_URL}/feedback?status=thanks&rating=${rating}`);
}
