import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });

  const { data: invite } = await supabase
    .from("invites")
    .select("code, email, expires_at, used_at")
    .eq("code", code.trim())
    .maybeSingle();

  if (!invite) return NextResponse.json({ error: "Invalid invite code." }, { status: 404 });
  if (invite.used_at) return NextResponse.json({ error: "This invite has already been used." }, { status: 410 });
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: "This invite has expired." }, { status: 410 });

  const cookieStore = await cookies();
  cookieStore.set("invite_code", code.trim(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60, // 1 hour
  });

  return NextResponse.json({ ok: true, email: invite.email });
}
