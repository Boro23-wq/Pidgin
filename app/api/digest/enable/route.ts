import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Lightweight status check — no sender list, no source picking. There's no
// per-sender configuration anymore: every connected newsletter is eligible,
// and importance signal decides what's worth emailing (see lib/digest.ts).
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: tokenRow } = await supabase
    .from("user_tokens")
    .select("auto_digest_enabled")
    .eq("clerk_user_id", userId)
    .single();
  const digestEnabled = tokenRow?.auto_digest_enabled ?? false;

  const { count } = await supabase
    .from("summaries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  return NextResponse.json({ digestEnabled, hasSummaries: (count ?? 0) > 0 });
}

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("user_tokens")
    .update({ auto_digest_enabled: true })
    .eq("clerk_user_id", userId);

  if (error) {
    console.error("[digest/enable]", error);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
