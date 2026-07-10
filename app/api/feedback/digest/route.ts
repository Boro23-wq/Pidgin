import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifySignedUid } from "@/lib/oauth-state";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://pidgin.site";

// POST — from in-app toast (uses Clerk session)
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rating, message } = await req.json();
  if (!rating && !message) return NextResponse.json({ error: "Empty feedback" }, { status: 400 });

  const { error } = await supabase.from("digest_feedback").insert({
    user_id: userId,
    rating: rating ?? null,
    message: message ?? null,
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

  await supabase.from("digest_feedback").insert({
    user_id: userId,
    rating,
    message: null,
  });

  return NextResponse.redirect(`${APP_URL}/feedback?status=thanks&rating=${rating}`);
}
