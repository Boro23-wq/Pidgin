import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { summaryId, reason } = await req.json();
  if (!summaryId) return NextResponse.json({ error: "Missing summaryId" }, { status: 400 });

  try {
    await supabase.from("feedback").insert({
      user_id: userId,
      summary_id: summaryId,
      reason: reason ?? "inaccurate",
      created_at: new Date().toISOString(),
    });
  } catch {
    // Table may not exist yet — fail silently, UI feedback still shows
  }

  return NextResponse.json({ ok: true });
}
