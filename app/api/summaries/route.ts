import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAllSummaries } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const summaries = await getAllSummaries(userId, 30);
    return NextResponse.json(summaries, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
