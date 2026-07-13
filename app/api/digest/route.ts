import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getTodaysSummaries, getTopicOccurrencesForKeys, getUserTimezone } from "@/lib/supabase";
import { rankQualifyingTopics, buildDigestHtml } from "@/lib/digest";
import { captureServerEvent } from "@/lib/posthog-server";
import { isRateLimited } from "@/lib/rate-limit";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

function formatDate(d: Date, timeZone?: string | null) {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    ...(timeZone ? { timeZone } : {}),
  });
}

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Sends a real email via Resend — cap re-sends so a stuck button or a
  // looping client can't drain the send quota.
  if (await isRateLimited(`digest-send:${userId}`, 3, 24 * 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Digest already sent recently. Please try again later." },
      { status: 429 },
    );
  }

  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;
  if (!userEmail) return NextResponse.json({ error: "No email found for user" }, { status: 400 });

  const articles = await getTodaysSummaries(userId);
  if (articles.length === 0) {
    return NextResponse.json({ sent: false, reason: "No articles today" });
  }

  const topicKeys = articles.map((a) => a.topic_key).filter((k): k is string => Boolean(k));
  const trends = await getTopicOccurrencesForKeys(userId, topicKeys);

  // Same importance bar as the scheduled digest — a manual send should mean
  // the same thing as the automatic one, not a different, looser definition
  // of "digest." No sender allow-list here either; see lib/digest.ts.
  const qualifyingTopics = rankQualifyingTopics(articles, trends);
  if (qualifyingTopics.length === 0) {
    return NextResponse.json({ sent: false, reason: "Nothing significant enough to send today" });
  }

  const timeZone = await getUserTimezone(userId);
  const html = buildDigestHtml(qualifyingTopics, user?.firstName ?? "", userId, trends, timeZone);
  const dateStr = formatDate(new Date(), timeZone);

  const { error } = await resend.emails.send({
    from: FROM,
    to: userEmail,
    subject: `Your Morning Brief — ${dateStr}`,
    html,
  });

  if (error) {
    console.error("[digest] resend error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }

  await captureServerEvent(userId, "digest_sent", { article_count: qualifyingTopics.length, source: "manual" });

  return NextResponse.json({ sent: true, count: qualifyingTopics.length, to: userEmail });
}
