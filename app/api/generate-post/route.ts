import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { generateSocialPost } from "@/lib/claude";
import { getSummaryById, updateSummary } from "@/lib/supabase";
import { isRateLimited } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Each call is a Claude Sonnet generation — the most expensive single
  // request an authenticated user can trigger, so it can't stay unmetered.
  if (await isRateLimited(`generate-post:${userId}`, 15, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many posts generated. Please wait a bit and try again." },
      { status: 429 },
    );
  }

  try {
    const { summaryId, platform } = (await req.json()) as {
      summaryId: string;
      platform: "linkedin" | "twitter";
    };

    if (!summaryId || !platform) {
      return NextResponse.json({ error: "Missing summaryId or platform" }, { status: 400 });
    }

    const summary = await getSummaryById(summaryId, userId);
    if (!summary) {
      return NextResponse.json({ error: "Summary not found" }, { status: 404 });
    }

    const post = await generateSocialPost(summary.summary, summary.newsletter_title, platform);
    const column = platform === "linkedin" ? "linkedin_post" : "twitter_post";
    await updateSummary(summaryId, userId, { [column]: post });

    return NextResponse.json({ post }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
