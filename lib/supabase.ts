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
  is_bookmarked: boolean;
  is_read: boolean;
}

export async function saveSummary(
  data: Omit<Summary, "id" | "created_at">,
  userId: string
) {
  const payload: Record<string, unknown> = { ...data, user_id: userId };
  const { data: result, error } = await supabase
    .from("summaries")
    .insert([payload])
    .select();

  if (error) {
    // topic_key column not yet migrated — retry without it
    if (error.message?.includes("topic_key")) {
      const fallback: Record<string, unknown> = { ...payload };
      delete fallback.topic_key;
      const { data: result2, error: error2 } = await supabase
        .from("summaries")
        .insert([fallback])
        .select();
      if (error2) {
        // Duplicate story from same email — unique constraint too strict, skip silently
        if (error2.code === "23505") return null;
        throw error2;
      }
      return result2;
    }
    // Duplicate story from same email — unique constraint too strict, skip silently
    if (error.code === "23505") return null;
    throw error;
  }
  return result;
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

export async function getAllSummaries(userId: string, limit = 100): Promise<Summary[]> {
  const { data, error } = await supabase
    .from("summaries")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as Summary[];
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
  updates: Partial<Pick<Summary, "linkedin_post" | "twitter_post" | "is_bookmarked" | "is_read">>
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

export async function deleteOldSummaries(userId: string, daysOld = 90): Promise<number> {
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
