import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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

// GET — from email links (?rating=up|down&uid=base64url(userId))
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rating = searchParams.get("rating");
  const uid = searchParams.get("uid");

  if (!uid || !rating || !["up", "down"].includes(rating)) {
    return NextResponse.redirect(`${APP_URL}/feedback?status=invalid`);
  }

  let userId: string;
  try {
    userId = Buffer.from(uid, "base64url").toString("utf-8");
  } catch {
    return NextResponse.redirect(`${APP_URL}/feedback?status=invalid`);
  }

  await supabase.from("digest_feedback").insert({
    user_id: userId,
    rating,
    message: null,
  });

  return NextResponse.redirect(`${APP_URL}/feedback?status=thanks&rating=${rating}`);
}
