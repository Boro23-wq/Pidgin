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
  is_bookmarked: boolean;
  is_read: boolean;
}

export async function saveSummary(
  data: Omit<Summary, "id" | "created_at">,
  userId: string
) {
  const { data: result, error } = await supabase
    .from("summaries")
    .insert([{ ...data, user_id: userId }])
    .select();

  if (error) throw error;
  return result;
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
    .lt("created_at", cutoffDate.toISOString())
    .select();

  if (error) throw error;
  return data ? data.length : 0;
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
