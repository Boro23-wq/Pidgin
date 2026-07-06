import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAllSummaries, deleteOldSummaries, getTopicOccurrencesForKeys } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const summaries = await getAllSummaries(userId, 500);

    // Bundle trend memory alongside summaries so the dashboard can render
    // "Nth week running" badges without a second round trip.
    const topicKeys = summaries
      .map((s) => s.topic_key)
      .filter((k): k is string => Boolean(k));
    const trendMap = await getTopicOccurrencesForKeys(userId, topicKeys);

    return NextResponse.json(
      { summaries, trends: Object.fromEntries(trendMap) },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const count = await deleteOldSummaries(userId, 0);
    return NextResponse.json({ deleted: count });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
