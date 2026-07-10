import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface Summary {
  id: string;
  created_at: string;
  user_id: string;
  newsletter_title: string;
  original_content: string;
  summary: string;
  simple_explanation: string;
  key_points: string[];
  linkedin_post: string;
  twitter_post: string;
  source_email: string;
  source_email_id: string;
  processed_date: string;
  category: string;
  source_url: string;
  topic_key: string | null;
  source_type: string | null;
  why_it_matters: string | null;
  what_to_do: string | null;
  significance: string | null;
  is_bookmarked: boolean;
  is_read: boolean;
  is_public: boolean;
}

// Everything except original_content — the raw newsletter body, which the
// client never renders. Shipping it to the browser on every dashboard load
// was pure data exposure (and bandwidth) for no product benefit.
const CLIENT_SUMMARY_COLUMNS =
  "id, created_at, user_id, newsletter_title, summary, simple_explanation, key_points, " +
  "linkedin_post, twitter_post, source_email, source_email_id, processed_date, category, " +
  "source_url, topic_key, source_type, why_it_matters, what_to_do, significance, " +
  "is_bookmarked, is_read, is_public";

export type ClientSummary = Omit<Summary, "original_content">;

// Columns that may not exist yet in a given environment's DB (migration not
// yet applied). saveSummary retries without whichever of these the DB
// actually rejects, so rollout doesn't require perfectly synced deploys.
const OPTIONAL_SUMMARY_COLUMNS = ["topic_key", "source_type", "why_it_matters", "what_to_do", "significance"];

export async function saveSummary(
  data: Omit<Summary, "id" | "created_at" | "is_public">,
  userId: string
) {
  const payload: Record<string, unknown> = { ...data, user_id: userId };

  for (let attempt = 0; attempt <= OPTIONAL_SUMMARY_COLUMNS.length; attempt++) {
    const { data: result, error } = await supabase
      .from("summaries")
      .insert([payload])
      .select();

    if (!error) return result;
    // Duplicate story from same email — unique constraint too strict, skip silently
    if (error.code === "23505") return null;

    const missingColumn = OPTIONAL_SUMMARY_COLUMNS.find(
      (col) => col in payload && error.message?.includes(col)
    );
    if (!missingColumn) throw error;
    delete payload[missingColumn];
  }
  return null;
}

export async function getTodaysSummaries(userId: string): Promise<Summary[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("summaries")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", since)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Summary[];
}

export async function getAllSummaries(userId: string, limit = 100): Promise<ClientSummary[]> {
  const { data, error } = await supabase
    .from("summaries")
    .select(CLIENT_SUMMARY_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as ClientSummary[];
}

// The share page is public and unauthenticated, so this is deliberately the
// only summary read not scoped to a user_id — is_public is what stands in for
// ownership. Sharing is opt-in (default false); nothing is readable by URL
// alone until the owner flips the flag.
export async function getPublicSummary(id: string): Promise<ClientSummary | null> {
  const { data, error } = await supabase
    .from("summaries")
    .select(CLIENT_SUMMARY_COLUMNS)
    .eq("id", id)
    .eq("is_public", true)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as ClientSummary;
}

export async function getSummaryById(id: string, userId: string): Promise<Summary | null> {
  const { data, error } = await supabase
    .from("summaries")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error) return null;
  return data as Summary;
}

export async function updateSummary(
  id: string,
  userId: string,
  updates: Partial<
    Pick<Summary, "linkedin_post" | "twitter_post" | "is_bookmarked" | "is_read" | "is_public">
  >
) {
  const { error } = await supabase
    .from("summaries")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function isEmailProcessed(emailId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("summaries")
    .select("id")
    .eq("source_email_id", emailId)
    .eq("user_id", userId)
    .limit(1);

  if (error) return false;
  return (data?.length ?? 0) > 0;
}

// ISO 8601 week bucket, e.g. "2026-W27" — used to detect a new calendar week
// without pulling in a date library.
function isoWeekString(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export interface TopicOccurrence {
  weeksSeenCount: number;
  occurrencesCount: number;
  lastTitle: string | null;
}

// Trend memory: tracks how many distinct calendar weeks a topic has recurred
// in for a user. Kept in its own long-lived table (not `summaries`, which is
// pruned after 7 days by deleteOldSummaries) so multi-week recurrence can
// still be reported after the underlying story rows are gone.
export async function upsertTopicOccurrence(
  userId: string,
  topicKey: string,
  title: string,
  seenAt: Date = new Date()
): Promise<void> {
  const week = isoWeekString(seenAt);

  const { data: existing } = await supabase
    .from("topic_occurrences")
    .select("last_seen_week, weeks_seen_count, occurrences_count")
    .eq("user_id", userId)
    .eq("topic_key", topicKey)
    .maybeSingle();

  if (!existing) {
    await supabase.from("topic_occurrences").insert({
      user_id: userId,
      topic_key: topicKey,
      first_seen_at: seenAt.toISOString(),
      last_seen_at: seenAt.toISOString(),
      last_seen_week: week,
      weeks_seen_count: 1,
      occurrences_count: 1,
      last_title: title,
    });
    return;
  }

  const weeksSeenCount =
    existing.last_seen_week === week ? existing.weeks_seen_count : existing.weeks_seen_count + 1;

  await supabase
    .from("topic_occurrences")
    .update({
      last_seen_at: seenAt.toISOString(),
      last_seen_week: week,
      weeks_seen_count: weeksSeenCount,
      occurrences_count: existing.occurrences_count + 1,
      last_title: title,
    })
    .eq("user_id", userId)
    .eq("topic_key", topicKey);
}

// Batched lookup to avoid N+1 queries when rendering a page/digest full of topics.
export async function getTopicOccurrencesForKeys(
  userId: string,
  topicKeys: string[]
): Promise<Map<string, TopicOccurrence>> {
  const uniqueKeys = [...new Set(topicKeys)];
  if (!uniqueKeys.length) return new Map();

  const { data, error } = await supabase
    .from("topic_occurrences")
    .select("topic_key, weeks_seen_count, occurrences_count, last_title")
    .eq("user_id", userId)
    .in("topic_key", uniqueKeys);

  if (error || !data) return new Map();

  return new Map(
    data.map((r) => [
      r.topic_key as string,
      {
        weeksSeenCount: r.weeks_seen_count as number,
        occurrencesCount: r.occurrences_count as number,
        lastTitle: r.last_title as string | null,
      },
    ])
  );
}

export interface RecentTopic {
  topicKey: string;
  title: string;
}

// Recently-assigned topics for a user, used to give Claude visibility into
// what other newsletters already called a given event — without this, each
// newsletter is extracted in isolation and near-identical stories from
// different sources get different topic_keys instead of merging.
export async function getRecentTopics(userId: string, sinceHours = 48): Promise<RecentTopic[]> {
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("topic_occurrences")
    .select("topic_key, last_title")
    .eq("user_id", userId)
    .gte("last_seen_at", since)
    .order("last_seen_at", { ascending: false })
    .limit(40);

  if (error || !data) return [];
  return data
    .filter((r) => r.last_title)
    .map((r) => ({ topicKey: r.topic_key as string, title: r.last_title as string }));
}

// Clears the (heavy) raw newsletter body once it's no longer needed. It's
// only ever read once, during extraction, and never re-displayed or
// re-read anywhere afterward — so there's no product reason to keep it
// around. Keeps the row and its lightweight derived insight (summary,
// key_points, why_it_matters, what_to_do, topic_key, significance) intact:
// that's the actual "memory" trend badges and topic history depend on, and
// it's cheap enough to keep far longer than the raw content.
//
// Deliberately NOT filtered on is_bookmarked. Bookmarking preserves the row
// (see deleteOldSummaries), but nothing about a bookmark needs the raw email
// body — and exempting bookmarked rows meant a user could silently retain
// full newsletter bodies forever, contradicting the 7-day promise in
// app/privacy/page.tsx. The derived insight is what a bookmark is for.
export async function clearOldRawContent(userId: string, daysOld = 7): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const { data, error } = await supabase
    .from("summaries")
    .update({ original_content: "" })
    .eq("user_id", userId)
    .lt("created_at", cutoffDate.toISOString())
    .neq("original_content", "")
    .select();

  if (error) throw error;
  return data ? data.length : 0;
}

// Long-term cutoff for the row itself. Much longer than raw-content
// clearing above — the point of extending retention was specifically so
// derived insight (and the trend-memory story built on top of it) survives
// far past 7 days; 180 days is a sane bound rather than deleting nothing
// ever, while still comfortably covering "this has recurred for weeks."
export async function deleteOldSummaries(userId: string, daysOld = 180): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const { data, error } = await supabase
    .from("summaries")
    .delete()
    .eq("user_id", userId)
    .eq("is_bookmarked", false)
    .lt("created_at", cutoffDate.toISOString())
    .select();

  if (error) throw error;
  return data ? data.length : 0;
}

export async function dismissEmails(
  emails: Array<{ id: string; fromName?: string; fromEmail?: string; subject?: string }>,
  userId: string
): Promise<void> {
  if (!emails.length) return;
  await supabase
    .from("dismissed_emails")
    .upsert(
      emails.map((e) => ({
        user_id: userId,
        email_id: e.id,
        from_name: e.fromName ?? null,
        from_email: e.fromEmail ?? null,
        subject: e.subject ?? null,
      })),
      { onConflict: "user_id,email_id" }
    );
}

export async function getDismissedEmails(userId: string): Promise<Array<{
  email_id: string;
  from_name: string | null;
  from_email: string | null;
  subject: string | null;
  dismissed_at: string | null;
}>> {
  const { data } = await supabase
    .from("dismissed_emails")
    .select("email_id, from_name, from_email, subject, dismissed_at")
    .eq("user_id", userId)
    .order("dismissed_at", { ascending: false });
  return data ?? [];
}

export async function setLastSyncedAt(userId: string): Promise<void> {
  await supabase
    .from("user_tokens")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("clerk_user_id", userId);
}

export async function getLastSyncedAt(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("user_tokens")
    .select("last_synced_at")
    .eq("clerk_user_id", userId)
    .single();
  return data?.last_synced_at ?? null;
}

export async function undismissEmail(emailId: string, userId: string): Promise<void> {
  await supabase
    .from("dismissed_emails")
    .delete()
    .eq("user_id", userId)
    .eq("email_id", emailId);
}

export async function getDismissedEmailIds(
  emailIds: string[],
  userId: string
): Promise<Set<string>> {
  if (!emailIds.length) return new Set();
  const { data } = await supabase
    .from("dismissed_emails")
    .select("email_id")
    .eq("user_id", userId)
    .in("email_id", emailIds);
  return new Set((data ?? []).map((r: { email_id: string }) => r.email_id));
}

export async function deleteSummary(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("summaries")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function getBlockedDomains(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("blocked_senders")
    .select("domain")
    .eq("user_id", userId);
  if (error) return [];
  return (data ?? []).map((r: { domain: string }) => r.domain);
}

export async function addBlockedSender(domain: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("blocked_senders")
    .upsert({ domain, user_id: userId }, { onConflict: "domain,user_id" });
  if (error) throw error;
}
