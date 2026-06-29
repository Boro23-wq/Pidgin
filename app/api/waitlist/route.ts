import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { clerkClient } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  const { email, role, newsletterCount, useCases, accessType } = await req.json();

  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const normalizedEmail = email.toLowerCase().trim();

  // Check if already on waitlist
  const { data: existing } = await supabase
    .from("waitlist")
    .select("email")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ existing: true });
  }

  // Save to Supabase
  const { error: dbError } = await supabase.from("waitlist").insert({
    email: normalizedEmail,
    role,
    newsletter_count: newsletterCount,
    use_cases: useCases,
    access_type: accessType,
  });

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  // Add to Clerk waitlist queue
  let clerkError: string | null = null;
  try {
    const client = await clerkClient();
    await client.waitlistEntries.create({ emailAddress: normalizedEmail, notify: false });
  } catch (e: unknown) {
    clerkError = e instanceof Error ? e.message : String(e);
    console.error("[waitlist] Clerk error:", clerkError);
  }

  return NextResponse.json({ ok: true, clerkError });
}
