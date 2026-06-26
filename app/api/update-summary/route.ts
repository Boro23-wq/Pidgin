import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { updateSummary } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id, is_bookmarked, is_read } = (await req.json()) as {
      id: string;
      is_bookmarked?: boolean;
      is_read?: boolean;
    };

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const updates: Record<string, boolean> = {};
    if (is_bookmarked !== undefined) updates.is_bookmarked = is_bookmarked;
    if (is_read !== undefined) updates.is_read = is_read;

    await updateSummary(id, userId, updates);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
