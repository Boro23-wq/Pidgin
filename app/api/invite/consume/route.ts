import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export async function POST() {
  const cookieStore = await cookies();
  const code = cookieStore.get("invite_code")?.value;
  if (!code) return NextResponse.json({ ok: true }); // no cookie, nothing to do

  const { userId } = await auth();

  await supabase
    .from("invites")
    .update({ used_at: new Date().toISOString(), used_by: userId ?? null })
    .eq("code", code)
    .is("used_at", null);

  cookieStore.delete("invite_code");
  return NextResponse.json({ ok: true });
}
