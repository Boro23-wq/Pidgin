import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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

  return NextResponse.json({ ok: true });
}
