import { NextResponse } from "next/server";
import { Resend } from "resend";
import { clerkClient } from "@clerk/nextjs/server";
import { fetchNewsletterEmails } from "@/lib/gmail";
import { extractNewsletterStories } from "@/lib/claude";
import { getValidTokens } from "@/lib/tokens";
import {
  saveSummary,
  isEmailProcessed,
  deleteOldSummaries,
  clearOldRawContent,
  getBlockedDomains,
  getTodaysSummaries,
  getDismissedEmailIds,
  upsertTopicOccurrence,
  getTopicOccurrencesForKeys,
  getRecentTopics,
  type RecentTopic,
} from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { rankQualifyingTopics, buildDigestHtml } from "@/lib/digest";
import { captureServerEvent } from "@/lib/posthog-server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
const BATCH_SIZE = 3;

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

async function processUser(clerkUserId: string, autoDigestEnabled: boolean): Promise<{
  synced: number;
  sent: boolean;
  error?: string;
}> {
  try {
    const tokens = await getValidTokens(clerkUserId);
    if (!tokens) return { synced: 0, sent: false, error: "no_tokens" };

    // Clear heavy raw content after 7 days (never re-read past extraction);
    // keep the lightweight derived insight — and the trend memory built on
    // it — around much longer.
    await clearOldRawContent(clerkUserId, 7);
    await deleteOldSummaries(clerkUserId, 180);

    // Fetch today's newsletters from Gmail
    const blockedDomains = await getBlockedDomains(clerkUserId);
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const emails = await fetchNewsletterEmails(
      tokens.accessToken,
      tokens.refreshToken,
      since,
      10,
      blockedDomains
    );

    // Filter out emails the user explicitly dismissed during manual syncs
    const emailIds = emails.map((e) => e.id);
    const dismissedIds = await getDismissedEmailIds(emailIds, clerkUserId);
    const dismissedSet = new Set(dismissedIds);

    // No sender allow-list here by design — every connected newsletter is
    // eligible to be scanned. Importance signal (see lib/digest.ts) decides
    // what's worth emailing, not a manually pre-approved sender list.
    // blocked_senders (via getBlockedDomains above) remains the only
    // exclusion mechanism.
    const toProcess = emails.filter((e) => !dismissedSet.has(e.id));

    // Count today's existing summaries per source — skip sources that already have ≥2
    const today = new Date().toISOString().split("T")[0];
    const { data: todayRows } = await supabase
      .from("summaries")
      .select("source_email")
      .eq("user_id", clerkUserId)
      .eq("processed_date", today);
    const sourceCountToday = new Map<string, number>();
    for (const row of todayRows ?? []) {
      sourceCountToday.set(row.source_email, (sourceCountToday.get(row.source_email) ?? 0) + 1);
    }

    // Summarize each email
    const CONTENT_CAP = 12000;
    let synced = 0;

    // Seeds topic context so Claude can recognize the same real-world story
    // across different newsletters and reuse its topic_key instead of
    // inventing a new one. Extended with topics from each chunk as we go, so
    // later chunks in this run see what earlier chunks found.
    let knownTopics: RecentTopic[] = await getRecentTopics(clerkUserId);

    for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
      const chunk = toProcess.slice(i, i + BATCH_SIZE);
      const topicsSnapshot = knownTopics;

      const results = await Promise.allSettled(
        chunk.map(async (email) => {
          const newTopics: RecentTopic[] = [];
          try {
            // Skip if this source already has 2 summaries today — won't appear in digest
            if ((sourceCountToday.get(email.from) ?? 0) >= 2) return newTopics;

            const alreadyProcessed = await isEmailProcessed(email.id, clerkUserId);
            if (alreadyProcessed) return newTopics;

            const stories = await extractNewsletterStories(
              email.body.slice(0, CONTENT_CAP),
              email.subject,
              email.links,
              topicsSnapshot
            );
            for (const story of stories) {
              const saved = await saveSummary(
                {
                  newsletter_title: story.title,
                  original_content: email.body,
                  summary: story.summary,
                  simple_explanation: story.simpleExplanation,
                  key_points: story.keyPoints,
                  category: story.category,
                  linkedin_post: "",
                  twitter_post: "",
                  source_email: email.from,
                  source_email_id: email.id,
                  source_url: story.sourceUrl || email.source_url,
                  topic_key: story.topicKey || null,
                  source_type: "gmail",
                  why_it_matters: story.whyItMatters || null,
                  what_to_do: story.whatToDo || null,
                  significance: story.significance || "notable",
                  processed_date: email.internalDate
                    ? new Date(email.internalDate).toISOString().split("T")[0]
                    : new Date().toISOString().split("T")[0],
                  is_bookmarked: false,
                  is_read: false,
                  user_id: clerkUserId,
                },
                clerkUserId
              );
              if (saved) {
                synced++;
                if (story.topicKey) {
                  await upsertTopicOccurrence(clerkUserId, story.topicKey, story.title);
                  newTopics.push({ topicKey: story.topicKey, title: story.title });
                }
              }
            }
          } catch (err) {
            console.error(`[cron/digest] email error for ${clerkUserId}:`, err);
          }
          return newTopics;
        })
      );

      for (const r of results) {
        if (r.status === "fulfilled") knownTopics = knownTopics.concat(r.value);
      }
    }

    // Get today's summaries (including ones already synced before this run)
    const articles = await getTodaysSummaries(clerkUserId);
    if (articles.length === 0) return { synced, sent: false };

    const topicKeys = articles.map((a) => a.topic_key).filter((k): k is string => Boolean(k));
    const trends = await getTopicOccurrencesForKeys(clerkUserId, topicKeys);

    // Only send when something genuinely clears the bar — a curated brief,
    // not a guaranteed daily email. Skipping the Clerk lookup + send entirely
    // on a quiet day, rather than emailing filler just to hit a count.
    const qualifyingTopics = rankQualifyingTopics(articles, trends);
    if (qualifyingTopics.length === 0) {
      return { synced, sent: false, error: "no_qualifying_stories_today" };
    }

    // Syncing/extraction above runs for every connected user regardless of
    // email opt-in, so the dashboard stays fresh on its own — but sending an
    // actual email is still gated on having explicitly turned the digest on.
    if (!autoDigestEnabled) {
      return { synced, sent: false, error: "digest_not_enabled" };
    }

    // Look up user's email + name from Clerk
    const clerk = await clerkClient();
    let user;
    try {
      user = await clerk.users.getUser(clerkUserId);
    } catch {
      // User was deleted from Clerk but token row remains — skip silently
      return { synced, sent: false, error: "clerk_user_not_found" };
    }
    const userEmail = user.emailAddresses[0]?.emailAddress;
    if (!userEmail) return { synced, sent: false, error: "no_email" };

    const html = buildDigestHtml(qualifyingTopics, user.firstName ?? "", clerkUserId, trends);
    const { error } = await resend.emails.send({
      from: FROM,
      to: userEmail,
      subject: `Your Morning Brief — ${formatDate(new Date())}`,
      html,
    });

    if (error) {
      console.error(`[cron/digest] resend error for ${userEmail}:`, error);
      return { synced, sent: false, error: String(error) };
    }

    await captureServerEvent(clerkUserId, "digest_sent", { article_count: qualifyingTopics.length, source: "cron" });

    return { synced, sent: true };
  } catch (err) {
    console.error(`[cron/digest] fatal error for ${clerkUserId}:`, err);
    return { synced: 0, sent: false, error: String(err) };
  }
}

export async function GET(req: Request) {
  // Verify Vercel cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Sync every connected user daily, regardless of email opt-in — the
  // dashboard brief should stay fresh on its own, not only for people who've
  // also turned on the digest email. Sending is still gated separately
  // inside processUser() on auto_digest_enabled.
  const { data: tokenRows, error: tokenErr } = await supabase
    .from("user_tokens")
    .select("clerk_user_id, auto_digest_enabled");

  if (tokenErr) {
    console.error("[cron/digest] failed to fetch users:", tokenErr);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  const users = (tokenRows ?? []).map((r) => ({
    userId: r.clerk_user_id as string,
    autoDigestEnabled: Boolean(r.auto_digest_enabled),
  }));
  console.log(`[cron/digest] processing ${users.length} users`);

  const results = await Promise.allSettled(
    users.map((u) => processUser(u.userId, u.autoDigestEnabled))
  );

  const summary = results.map((r, i) => ({
    userId: users[i].userId,
    ...(r.status === "fulfilled" ? r.value : { synced: 0, sent: false, error: String(r.reason) }),
  }));

  return NextResponse.json({ ok: true, users: summary });
}
