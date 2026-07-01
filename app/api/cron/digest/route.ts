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
  getBlockedDomains,
  getTodaysSummaries,
  getDismissedEmailIds,
} from "@/lib/supabase";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://pidgin.site";
const BATCH_SIZE = 3;

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function extractSenderName(from: string) {
  const m = from.match(/^(.+?)\s*</);
  return m?.[1]?.trim().replace(/^["']|["']$/g, "") ?? from.split("@")[0];
}

function buildHtml(
  articles: Awaited<ReturnType<typeof getTodaysSummaries>>,
  userFirstName: string,
  userId: string
) {
  const dateStr = formatDate(new Date());
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const BRAND = "#0da2e7";

  const grouped = new Map<string, typeof articles>();
  for (const a of articles) {
    const src = extractSenderName(a.source_email);
    if (!grouped.has(src)) grouped.set(src, []);
    grouped.get(src)!.push(a);
  }

  const sourcesHtml = [...grouped.entries()]
    .map(
      ([source, items]) => {
        const cappedItems = items.slice(0, 2);
        return `
    <div style="margin-bottom:48px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr>
          <td style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#9ca3af;padding-bottom:10px;border-bottom:1px solid #e5e7eb;">
            ${source}
          </td>
        </tr>
      </table>
      ${cappedItems
        .map(
          (a, i) => {
            const keyPoints = (Array.isArray(a.key_points) ? (a.key_points as string[]) : []).slice(0, 3);
            return `
        <div style="${i > 0 ? "margin-top:32px;padding-top:32px;border-top:1px solid #f3f4f6;" : ""}">
          <p style="font-size:16px;font-weight:700;color:#111827;margin:0 0 10px;line-height:1.35;">${a.newsletter_title}</p>
          ${a.summary ? `<p style="font-size:14px;color:#374151;margin:0 0 14px;line-height:1.75;">${a.summary}</p>` : ""}
          ${
            keyPoints.length > 0
              ? `<table cellpadding="0" cellspacing="0" style="margin:0 0 12px;">
              ${keyPoints
                .map(
                  (pt) => `
              <tr>
                <td style="vertical-align:top;padding-right:8px;padding-bottom:6px;">
                  <span style="display:inline-block;width:5px;height:5px;border-radius:50%;background-color:${BRAND};margin-top:7px;"></span>
                </td>
                <td style="font-size:13px;color:#4b5563;line-height:1.6;padding-bottom:6px;">${pt}</td>
              </tr>`
                )
                .join("")}
            </table>`
              : ""
          }
          ${a.source_url ? `<p style="margin:10px 0 0;"><a href="${a.source_url}" style="font-size:12px;color:${BRAND};text-decoration:none;font-weight:600;">Read original →</a></p>` : ""}
        </div>`;
          }
        )
        .join("")}
      ${items.length > 2 ? `<p style="margin:14px 0 0;"><a href="${APP_URL}/dashboard" style="font-size:12px;color:#9ca3af;text-decoration:none;">+ ${items.length - 2} more from ${source} in the app →</a></p>` : ""}
    </div>`;
      }
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your Pidgin Digest</title>
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="max-width:600px;margin:0 auto;padding:48px 24px 64px;">
    <div style="background-color:#ffffff;border-radius:12px;border:1px solid #e5e7eb;padding:40px 36px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
        <tr>
          <td>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:10px;vertical-align:middle;">
                  <img src="https://pidgin.site/pidgin-main.png" alt="Pidgin" width="28" height="28" style="display:block;border:0;border-radius:6px;" />
                </td>
                <td style="vertical-align:middle;">
                  <span style="font-size:17px;font-weight:800;letter-spacing:-0.5px;color:#111827;">Pidgin</span>
                </td>
              </tr>
            </table>
          </td>
          <td align="right" style="vertical-align:middle;">
            <span style="font-size:12px;color:#9ca3af;">${dateStr}</span>
          </td>
        </tr>
      </table>
      <p style="font-size:15px;color:#6b7280;margin:0 0 36px;line-height:1.6;">
        ${greeting}${userFirstName ? ", " + userFirstName : ""} — here's everything from your newsletters today. No need to open the app.
      </p>
      ${sourcesHtml}
      <div style="margin-top:8px;margin-bottom:24px;">
        <a href="${APP_URL}/dashboard"
           style="display:inline-block;padding:12px 24px;background-color:${BRAND};color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;border-radius:8px;">
          Bookmark &amp; generate social posts →
        </a>
      </div>
      <div style="border-top:1px solid #f3f4f6;padding-top:20px;">
        <p style="font-size:12px;color:#6b7280;margin:0 0 12px;">How was today's digest?</p>
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-right:8px;">
              <a href="${APP_URL}/api/feedback/digest?rating=up&uid=${Buffer.from(userId).toString("base64url")}"
                 style="display:inline-block;padding:8px 16px;border:1px solid #d1d5db;border-radius:8px;font-size:12px;font-weight:600;color:#374151;text-decoration:none;">
                Loved it
              </a>
            </td>
            <td>
              <a href="${APP_URL}/api/feedback/digest?rating=down&uid=${Buffer.from(userId).toString("base64url")}"
                 style="display:inline-block;padding:8px 16px;border:1px solid #d1d5db;border-radius:8px;font-size:12px;font-weight:600;color:#374151;text-decoration:none;">
                Needs work
              </a>
            </td>
          </tr>
        </table>
      </div>
    </div>
    <div style="padding:20px 4px 0;">
      <p style="font-size:11px;color:#9ca3af;margin:0;line-height:1.7;">
        Sent by <strong style="color:#6b7280;">Pidgin</strong> · Your newsletter digest<br>
        <a href="${APP_URL}/dashboard" style="color:#9ca3af;text-decoration:underline;">Manage preferences</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

async function processUser(clerkUserId: string): Promise<{
  synced: number;
  sent: boolean;
  error?: string;
}> {
  try {
    const tokens = await getValidTokens(clerkUserId);
    if (!tokens) return { synced: 0, sent: false, error: "no_tokens" };

    // Delete summaries older than 7 days
    await deleteOldSummaries(clerkUserId, 7);

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

    // Restrict to sources the user has previously approved (appeared in their summaries).
    // If no history exists (new user), allow all so their first cron still works.
    const { data: knownSources } = await supabase
      .from("summaries")
      .select("source_email")
      .eq("user_id", clerkUserId);
    const approvedSenders = new Set((knownSources ?? []).map((s) => s.source_email));

    let toProcess = emails.filter((e) => {
      if (dismissedSet.has(e.id)) return false;
      if (approvedSenders.size > 0 && !approvedSenders.has(e.from)) return false;
      return true;
    });

    // Respect user's digest source priority if configured
    const { data: digestSrcs } = await supabase
      .from("digest_sources")
      .select("source_email, priority")
      .eq("user_id", clerkUserId)
      .eq("enabled", true)
      .order("priority", { ascending: true });

    if (digestSrcs && digestSrcs.length > 0) {
      const priorityMap = new Map(digestSrcs.map((s) => [s.source_email, s.priority]));
      toProcess = toProcess
        .filter((e) => priorityMap.has(e.from))
        .sort((a, b) => (priorityMap.get(a.from) ?? 99) - (priorityMap.get(b.from) ?? 99));
    }

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
    for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
      const chunk = toProcess.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        chunk.map(async (email) => {
          try {
            // Skip if this source already has 2 summaries today — won't appear in digest
            if ((sourceCountToday.get(email.from) ?? 0) >= 2) return;

            const alreadyProcessed = await isEmailProcessed(email.id, clerkUserId);
            if (alreadyProcessed) return;

            const stories = await extractNewsletterStories(
              email.body.slice(0, CONTENT_CAP),
              email.subject,
              email.links
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
                  processed_date: email.internalDate
                    ? new Date(email.internalDate).toISOString().split("T")[0]
                    : new Date().toISOString().split("T")[0],
                  is_bookmarked: false,
                  is_read: false,
                  user_id: clerkUserId,
                },
                clerkUserId
              );
              if (saved) synced++;
            }
          } catch (err) {
            console.error(`[cron/digest] email error for ${clerkUserId}:`, err);
          }
        })
      );
    }

    // Get today's summaries (including ones already synced before this run)
    let articles = await getTodaysSummaries(clerkUserId);
    if (articles.length === 0) return { synced, sent: false };

    // Enforce user's digest source selection and priority order
    if (digestSrcs && digestSrcs.length > 0) {
      const priorityMap = new Map(digestSrcs.map((s) => [s.source_email, s.priority]));
      articles = articles
        .filter((a) => priorityMap.has(a.source_email))
        .sort((a, b) => (priorityMap.get(a.source_email) ?? 99) - (priorityMap.get(b.source_email) ?? 99));
      if (articles.length === 0) return { synced, sent: false };
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

    const html = buildHtml(articles, user.firstName ?? "", clerkUserId);
    const { error } = await resend.emails.send({
      from: FROM,
      to: userEmail,
      subject: `Pidgin digest — ${formatDate(new Date())}`,
      html,
    });

    if (error) {
      console.error(`[cron/digest] resend error for ${userEmail}:`, error);
      return { synced, sent: false, error: String(error) };
    }

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

  // Get all users who have opted in to daily digest
  const { data: tokenRows, error: tokenErr } = await supabase
    .from("user_tokens")
    .select("clerk_user_id")
    .eq("auto_digest_enabled", true);

  if (tokenErr) {
    console.error("[cron/digest] failed to fetch users:", tokenErr);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  const userIds = (tokenRows ?? []).map((r) => r.clerk_user_id as string);
  console.log(`[cron/digest] processing ${userIds.length} users`);

  const results = await Promise.allSettled(userIds.map(processUser));

  const summary = results.map((r, i) => ({
    userId: userIds[i],
    ...(r.status === "fulfilled" ? r.value : { synced: 0, sent: false, error: String(r.reason) }),
  }));

  return NextResponse.json({ ok: true, users: summary });
}
