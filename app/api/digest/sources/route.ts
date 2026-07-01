import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check if user has already opted in to digest
  const { data: tokenRow } = await supabase
    .from("user_tokens")
    .select("auto_digest_enabled")
    .eq("clerk_user_id", userId)
    .single();
  const digestEnabled = tokenRow?.auto_digest_enabled ?? false;

  // Return existing digest source config if set
  const { data: existing } = await supabase
    .from("digest_sources")
    .select("source_email, priority, enabled")
    .eq("user_id", userId)
    .order("priority", { ascending: true });

  if (existing && existing.length > 0) {
    return NextResponse.json({ sources: existing, configured: true, digestEnabled });
  }

  // First-time setup: derive distinct sources from the user's summaries
  const { data: summaryRows } = await supabase
    .from("summaries")
    .select("source_email")
    .eq("user_id", userId)
    .order("processed_date", { ascending: false });

  const seen = new Set<string>();
  const sources: Array<{ source_email: string; priority: number; enabled: boolean }> = [];
  for (const row of summaryRows ?? []) {
    if (!seen.has(row.source_email)) {
      seen.add(row.source_email);
      sources.push({ source_email: row.source_email, priority: sources.length, enabled: sources.length < 7 });
    }
  }

  return NextResponse.json({ sources, configured: false, digestEnabled });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { sources?: Array<{ source_email: string; priority: number; enabled: boolean }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sources = body.sources;
  if (!Array.isArray(sources)) {
    return NextResponse.json({ error: "sources must be an array" }, { status: 400 });
  }

  // Replace existing config for this user
  await supabase.from("digest_sources").delete().eq("user_id", userId);

  if (sources.length > 0) {
    const { error } = await supabase.from("digest_sources").insert(
      sources.map((s) => ({
        user_id: userId,
        source_email: s.source_email,
        priority: s.priority,
        enabled: s.enabled,
      }))
    );
    if (error) {
      console.error("[digest/sources] insert error:", error);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
