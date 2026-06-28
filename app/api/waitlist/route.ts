import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const { email, role, newsletterCount, useCases, accessType } = await req.json();

  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const { error } = await supabase.from("waitlist").upsert(
    {
      email: email.toLowerCase().trim(),
      role,
      newsletter_count: newsletterCount,
      use_cases: useCases,
      access_type: accessType,
    },
    { onConflict: "email" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
