import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ connected: false }, { status: 401 });

  const { data } = await supabase
    .from("user_tokens")
    .select("gmail_address")
    .eq("clerk_user_id", userId)
    .single();

  return Response.json({
    connected: !!data,
    gmailAddress: data?.gmail_address ?? null,
  });
}
