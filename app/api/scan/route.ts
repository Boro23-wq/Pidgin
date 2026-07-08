import { auth } from "@clerk/nextjs/server";
import { getValidTokens, GmailReconnectRequiredError, isGmailReconnectRequiredError } from "@/lib/tokens";
import { fetchNewsletterMetadata } from "@/lib/gmail";
import {
  supabase,
  getBlockedDomains,
  getDismissedEmailIds,
} from "@/lib/supabase";
import { batchFlagEmails } from "@/lib/claude";

export const maxDuration = 60;

function getErrorStatus(error: unknown) {
  const maybeStatus = (error as { code?: unknown; status?: unknown })?.status;
  if (typeof maybeStatus === "number" && maybeStatus >= 400 && maybeStatus < 600) {
    return maybeStatus;
  }

  const maybeCode = (error as { code?: unknown })?.code;
  if (typeof maybeCode === "number" && maybeCode >= 400 && maybeCode < 600) {
    return maybeCode;
  }

  return 500;
}

function getScanErrorMessage(error: unknown) {
  if (isGmailReconnectRequiredError(error)) {
    return "Gmail access needs to be reconnected. Please reconnect Gmail and try again.";
  }

  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes("rate limit") || lowerMessage.includes("quota")) {
    return "Gmail is limiting requests right now. Please wait a minute and try again.";
  }

  return "Could not scan Gmail right now. Please try again.";
}

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    let tokens;
    try {
      tokens = await getValidTokens(userId);
    } catch (err) {
      if (err instanceof GmailReconnectRequiredError) {
        return Response.json(
          {
            error: "Your Gmail connection expired. Please reconnect to continue.",
            code: "reconnect_required",
          },
          { status: 400 },
        );
      }
      throw err;
    }
    if (!tokens)
      return Response.json(
        { error: "Gmail not connected", code: "not_connected" },
        { status: 400 },
      );

    // Detect first sync by checking if any summaries exist for this user.
    const { count } = await supabase
      .from("summaries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    const isFirstSync = (count ?? 0) === 0;

    // Scan from midnight today — only today's newsletters.
    const sinceDate = new Date();
    sinceDate.setHours(0, 0, 0, 0);

    const blockedDomains = await getBlockedDomains(userId);

    const allPreviews = await fetchNewsletterMetadata(
      tokens.accessToken,
      tokens.refreshToken,
      sinceDate,
      50,
      blockedDomains,
    );

    // Filter out emails already processed (already in summaries table).
    if (allPreviews.length === 0) {
      return Response.json({ newsletters: [], isFirstSync });
    }

    const emailIds = allPreviews.map((n) => n.id);
    const { data: processed } = await supabase
      .from("summaries")
      .select("source_email_id")
      .eq("user_id", userId)
      .in("source_email_id", emailIds);

    const processedSet = new Set(
      (processed ?? []).map(
        (r: { source_email_id: string }) => r.source_email_id,
      ),
    );
    const dismissedSet = await getDismissedEmailIds(emailIds, userId);
    const newsletters = allPreviews.filter(
      (n) => !processedSet.has(n.id) && !dismissedSet.has(n.id),
    );

    // Batch-classify with Claude Haiku; 12-second timeout falls back to client-side regex.
    // null means "timed out" — don't set flagged so the client regex runs instead.
    let flaggedIds: Set<string> | null = null;
    try {
      flaggedIds = await Promise.race([
        batchFlagEmails(
          newsletters.map((n) => ({
            id: n.id,
            fromName: n.fromName,
            subject: n.subject,
          })),
        ),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 12000)),
      ]);
    } catch {
      flaggedIds = null;
    }

    const classified = newsletters.map((n) => ({
      ...n,
      ...(flaggedIds !== null ? { flagged: flaggedIds.has(n.id) } : {}),
    }));
    return Response.json({ newsletters: classified, isFirstSync });
  } catch (error) {
    console.error("[scan] failed:", error);
    return Response.json(
      {
        error: getScanErrorMessage(error),
        code: isGmailReconnectRequiredError(error) ? "reconnect_required" : undefined,
      },
      { status: getErrorStatus(error) },
    );
  }
}
