import type { Summary } from "@/lib/supabase";
import { createSignedUid } from "@/lib/oauth-state";
import { localHour } from "@/lib/dates";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://pidgin.site";
const BRAND = "#0da2e7";

// Every field below originates in an email body someone else wrote, passed
// through Claude — which can be prompt-injected by that body. This is the one
// render path that isn't React-escaped, so nothing reaches the HTML unescaped.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Returns "" for anything that isn't a plain http(s) URL, so callers can
// `url ? renderLink() : ""`. Blocks `javascript:` and `data:` hrefs, and the
// escape on the way out blocks breaking out of the href attribute entirely.
export function safeUrl(value: string | null | undefined): string {
  if (!value) return "";
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return escapeHtml(parsed.toString());
  } catch {
    return "";
  }
}

export type TrendMap = Map<string, { weeksSeenCount: number; occurrencesCount: number; lastTitle: string | null }>;

// Same importance signal as the dashboard's "Top stories" section:
// corroboration (multiple sources covering the same story) + recurrence
// (trend memory) + Claude's own significance call.
const SIGNIFICANCE_WEIGHT: Record<string, number> = { major: 10, notable: 4, minor: 0 };
export function topicScore(items: Summary[], trend?: { weeksSeenCount: number }): number {
  const topSignificance = items.reduce(
    (max, a) => Math.max(max, SIGNIFICANCE_WEIGHT[a.significance ?? "notable"] ?? 4),
    0
  );
  const corroboration = Math.min(items.length, 5) * 2;
  // weeks_seen_count starts at 1 on first sighting — only weeks beyond the
  // first count as true recurrence.
  const extraWeeksSeen = Math.max((trend?.weeksSeenCount ?? 1) - 1, 0);
  const recurrence = Math.min(extraWeeksSeen, 5) * 3;
  return topSignificance + corroboration + recurrence;
}

// Stricter than the dashboard's "Top stories" bar (8) — inbox attention is
// scarcer than dashboard-scroll attention, so an email only goes out when
// something genuinely clears a higher bar. A "flexible count, curated not
// exhaustive" brief means some days this is empty and no email sends at all
// — that's intended, not a bug. There is deliberately no sender allow-list
// here: every connected newsletter is eligible, and importance signal alone
// decides what's worth emailing (see blocked_senders for exclusion instead).
export const EMAIL_SCORE_THRESHOLD = 10;

// Groups articles by topic (story, not sender) and keeps only the ones that
// clear EMAIL_SCORE_THRESHOLD, ranked highest-first. Returns [] on a quiet
// day where nothing is corroborated, recurring, or flagged major/notable
// enough — callers should skip sending rather than pad the email with filler.
export function rankQualifyingTopics(articles: Summary[], trends: TrendMap): [string, Summary[]][] {
  const grouped = new Map<string, Summary[]>();
  for (const a of articles) {
    const key = a.topic_key || `story-${a.id}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(a);
  }

  return [...grouped.entries()]
    .map(([key, items]) => [key, items, topicScore(items, trends.get(key))] as const)
    .filter(([, , score]) => score >= EMAIL_SCORE_THRESHOLD)
    .sort((a, b) => b[2] - a[2])
    .map(([key, items]) => [key, items]);
}

function formatDate(d: Date, timeZone?: string | null) {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    ...(timeZone ? { timeZone } : {}),
  });
}

// Picks the article within a topic's items whose fields best represent the
// group — highest Claude-judged significance wins, ties broken by most recent.
function primaryArticle(items: Summary[]): Summary {
  return items.reduce((best, a) => {
    const bw = SIGNIFICANCE_WEIGHT[best.significance ?? "notable"] ?? 4;
    const aw = SIGNIFICANCE_WEIGHT[a.significance ?? "notable"] ?? 4;
    if (aw !== bw) return aw > bw ? a : best;
    return a.created_at > best.created_at ? a : best;
  }, items[0]);
}

function trendBadgeHtml(trend?: { weeksSeenCount: number }): string {
  if (!trend || trend.weeksSeenCount < 2) return "";
  const nth = trend.weeksSeenCount === 2 ? "2nd" : trend.weeksSeenCount === 3 ? "3rd" : `${trend.weeksSeenCount}th`;
  return `<span style="display:inline-block;margin-left:8px;padding:2px 8px;background-color:#fef3c7;color:#92400e;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;border-radius:999px;">${nth} week running</span>`;
}

export function buildDigestHtml(
  qualifyingTopics: [string, Summary[]][],
  userFirstName: string,
  userId: string,
  trends: TrendMap,
  timeZone?: string | null
): string {
  const dateStr = formatDate(new Date(), timeZone);
  // The user's wall-clock hour, not the server's — the cron fires at a fixed
  // UTC time, which would greet everyone with the same (usually wrong) slot.
  const hour = localHour(timeZone);
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  // HMAC-signed, not bare base64 — this link is clicked from an inbox with no
  // session, so the uid is the only thing asserting whose feedback it is.
  const signedUid = createSignedUid(userId);

  // The single highest-scoring story gets hero treatment above the rest of
  // the list, mirroring the dashboard's "Top stories" hero card — one clear
  // "here's the one thing" moment instead of a flat list from the first line.
  const [heroTopic, ...restTopics] = qualifyingTopics;

  const heroHtml = heroTopic
    ? (() => {
        const [topicKey, items] = heroTopic;
        const article = primaryArticle(items);
        const trend = trends.get(topicKey);
        const heroUrl = safeUrl(article.source_url);
        return `
    <div style="margin-bottom:40px;padding:28px 24px;background-color:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;">
      <table cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
        <tr>
          <td style="padding-right:6px;padding-bottom:6px;">
            <span style="display:inline-block;padding:3px 10px;background-color:${BRAND};color:#ffffff;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;border-radius:999px;">Today's biggest story</span>
          </td>
          ${
            items.length > 1
              ? `<td style="padding-right:6px;padding-bottom:6px;"><span style="display:inline-block;padding:3px 10px;background-color:#d1fae5;color:#065f46;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;border-radius:999px;">${items.length} sources agree</span></td>`
              : ""
          }
          ${trend && trend.weeksSeenCount >= 2 ? `<td style="padding-bottom:6px;">${trendBadgeHtml(trend)}</td>` : ""}
        </tr>
      </table>
      <p style="font-size:19px;font-weight:800;color:#111827;margin:0 0 10px;line-height:1.3;">${escapeHtml(article.newsletter_title)}</p>
      ${article.why_it_matters ? `<p style="font-size:14px;color:#374151;margin:0;line-height:1.7;"><strong style="color:#111827;">Why it matters:</strong> ${escapeHtml(article.why_it_matters)}</p>` : ""}
      ${heroUrl ? `<p style="margin:14px 0 0;"><a href="${heroUrl}" style="font-size:12px;color:${BRAND};text-decoration:none;font-weight:700;">Read original →</a></p>` : ""}
    </div>`;
      })()
    : "";

  const sourcesHtml = restTopics
    .map(([topicKey, items]) => {
      const cappedItems = items.slice(0, 2);
      const headline = items[0].newsletter_title;
      const trend = trends.get(topicKey);
      const trendBadge = trendBadgeHtml(trend);
      return `
    <div style="margin-bottom:48px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr>
          <td style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#9ca3af;padding-bottom:10px;border-bottom:1px solid #e5e7eb;">
            ${escapeHtml(headline)}${trendBadge}
          </td>
        </tr>
      </table>
      ${cappedItems
        .map((a, i) => {
          const keyPoints = (Array.isArray(a.key_points) ? (a.key_points as string[]) : []).slice(0, 3);
          const articleUrl = safeUrl(a.source_url);
          return `
        <div style="${i > 0 ? "margin-top:32px;padding-top:32px;border-top:1px solid #f3f4f6;" : ""}">
          <p style="font-size:16px;font-weight:700;color:#111827;margin:0 0 10px;line-height:1.35;">${escapeHtml(a.newsletter_title)}</p>
          ${a.summary ? `<p style="font-size:14px;color:#374151;margin:0 0 14px;line-height:1.75;">${escapeHtml(a.summary)}</p>` : ""}
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
                <td style="font-size:13px;color:#4b5563;line-height:1.6;padding-bottom:6px;">${escapeHtml(pt)}</td>
              </tr>`
                )
                .join("")}
            </table>`
              : ""
          }
          ${a.why_it_matters ? `<p style="font-size:13px;color:#374151;margin:0 0 6px;line-height:1.6;"><strong style="color:#111827;">Why it matters:</strong> ${escapeHtml(a.why_it_matters)}</p>` : ""}
          ${a.what_to_do ? `<p style="font-size:13px;color:#374151;margin:0 0 10px;line-height:1.6;"><strong style="color:#111827;">What to do:</strong> ${escapeHtml(a.what_to_do)}</p>` : ""}
          ${articleUrl ? `<p style="margin:10px 0 0;"><a href="${articleUrl}" style="font-size:12px;color:${BRAND};text-decoration:none;font-weight:600;">Read original →</a></p>` : ""}
        </div>`;
        })
        .join("")}
      ${items.length > 2 ? `<p style="margin:14px 0 0;"><a href="${APP_URL}/dashboard" style="font-size:12px;color:#9ca3af;text-decoration:none;">+ ${items.length - 2} more on this in the app →</a></p>` : ""}
    </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your Morning Brief</title>
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
        ${greeting}${userFirstName ? ", " + escapeHtml(userFirstName) : ""} — here's what changed while you were building yesterday.
      </p>
      ${heroHtml}
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
              <a href="${APP_URL}/api/feedback/digest?rating=up&uid=${signedUid}"
                 style="display:inline-block;padding:8px 16px;border:1px solid #d1d5db;border-radius:8px;font-size:12px;font-weight:600;color:#374151;text-decoration:none;">
                Loved it
              </a>
            </td>
            <td>
              <a href="${APP_URL}/api/feedback/digest?rating=down&uid=${signedUid}"
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
        Sent by <strong style="color:#6b7280;">Pidgin</strong> · Your Morning Brief<br>
        <a href="${APP_URL}/dashboard" style="color:#9ca3af;text-decoration:underline;">Manage preferences</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}
