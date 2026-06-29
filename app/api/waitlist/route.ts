import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { clerkClient } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  const { email, role, newsletterCount, useCases, accessType } = await req.json();

  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const normalizedEmail = email.toLowerCase().trim();

  // Save extra fields to Supabase
  const { error: dbError } = await supabase.from("waitlist").upsert(
    {
      email: normalizedEmail,
      role,
      newsletter_count: newsletterCount,
      use_cases: useCases,
      access_type: accessType,
    },
    { onConflict: "email" }
  );

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  // Add to Clerk waitlist queue (so you can approve → invite from Clerk dashboard)
  try {
    const client = await clerkClient();
    await client.waitlistEntries.create({ emailAddress: normalizedEmail, notify: false });
  } catch (e: unknown) {
    // Ignore "already on waitlist" errors — Supabase upsert already handled deduplication
    const msg = e instanceof Error ? e.message : "";
    if (!msg.includes("already") && !msg.includes("exist")) {
      console.error("[waitlist] Clerk error:", msg);
    }
  }

  return NextResponse.json({ ok: true });
}
