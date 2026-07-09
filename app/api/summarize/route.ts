import { auth } from "@clerk/nextjs/server";
import { fetchNewsletterEmails, getEmailById } from "@/lib/gmail";
import { extractNewsletterStories } from "@/lib/claude";
import { getValidTokens, GmailReconnectRequiredError, isGmailReconnectRequiredError } from "@/lib/tokens";
import * as Sentry from "@sentry/nextjs";
import {
  saveSummary,
  isEmailProcessed,
  deleteOldSummaries,
  clearOldRawContent,
  getBlockedDomains,
  upsertTopicOccurrence,
  getRecentTopics,
  setLastSyncedAt,
  type RecentTopic,
} from "@/lib/supabase";

const BATCH_SIZE = 3;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        let selectedEmailIds: string[] | undefined;
        try {
          const body = await req.json();
          selectedEmailIds = Array.isArray(body.emailIds) ? body.emailIds : undefined;
        } catch {
          // no body
        }

        let tokens;
        try {
          tokens = await getValidTokens(userId);
        } catch (err) {
          if (err instanceof GmailReconnectRequiredError) {
            send({
              type: "error",
              message: "Your Gmail connection expired. Please reconnect to continue.",
              code: "reconnect_required",
            });
            controller.close();
            return;
          }
          throw err;
        }
        if (!tokens) {
          send({
            type: "error",
            message: "Gmail not connected. Please connect your Gmail account.",
            code: "not_connected",
          });
          controller.close();
          return;
        }

        await clearOldRawContent(userId, 7);
        const deletedCount = await deleteOldSummaries(userId, 180);
        const blockedDomains = await getBlockedDomains(userId);

        let emails;
        if (selectedEmailIds?.length) {
          const results = await Promise.all(
            selectedEmailIds.map((id) => getEmailById(tokens.accessToken, tokens.refreshToken, id))
          );
          emails = results.filter((e) => e !== null);
        } else {
          const since = new Date();
          since.setHours(0, 0, 0, 0);
          emails = await fetchNewsletterEmails(
            tokens.accessToken,
            tokens.refreshToken,
            since,
            10,
            blockedDomains
          );
        }

        if (emails.length === 0) {
          send({ type: "complete", processedCount: 0, skippedCount: 0, deletedCount });
          controller.close();
          return;
        }

        send({ type: "start", total: emails.length });

        let processedCount = 0;
        let skippedCount = 0;
        let completedCount = 0;

        // Seeds topic context so Claude can recognize the same real-world
        // story across different newsletters and reuse its topic_key instead
        // of inventing a new one. Extended with topics from each chunk as we
        // go, so later chunks in this run see what earlier chunks found.
        let knownTopics: RecentTopic[] = await getRecentTopics(userId);

        // Process in parallel batches to speed things up
        for (let i = 0; i < emails.length; i += BATCH_SIZE) {
          const chunk = emails.slice(i, i + BATCH_SIZE);
          const topicsSnapshot = knownTopics;

          const results = await Promise.allSettled(
            chunk.map(async (email) => {
              const newTopics: RecentTopic[] = [];
              try {
                const alreadyProcessed = await isEmailProcessed(email.id, userId);
                if (alreadyProcessed) {
                  skippedCount++;
                  return newTopics;
                }

                const stories = await extractNewsletterStories(
                  email.body,
                  email.subject,
                  email.links,
                  topicsSnapshot
                );

                if (stories.length === 0) {
                  send({ type: "item-error", title: email.subject, message: "No stories extracted" });
                  return newTopics;
                }

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
                      user_id: userId,
                    },
                    userId
                  );
                  if (saved) {
                    processedCount++;
                    if (story.topicKey) {
                      await upsertTopicOccurrence(userId, story.topicKey, story.title);
                      newTopics.push({ topicKey: story.topicKey, title: story.title });
                    }
                  }
                }
              } catch (err) {
                console.error("[summarize] email error:", email.subject, err);
                send({ type: "item-error", title: email.subject, message: String(err) });
              } finally {
                completedCount++;
                send({
                  type: "progress",
                  current: completedCount,
                  total: emails.length,
                  title: email.subject,
                });
              }
              return newTopics;
            })
          );

          for (const r of results) {
            if (r.status === "fulfilled") knownTopics = knownTopics.concat(r.value);
          }
        }

        await setLastSyncedAt(userId);
        send({ type: "complete", processedCount, skippedCount, deletedCount });
      } catch (err) {
        if (isGmailReconnectRequiredError(err)) {
          send({
            type: "error",
            message: "Your Gmail connection expired. Please reconnect to continue.",
            code: "reconnect_required",
          });
        } else {
          // Same reasoning as /api/scan: the reconnect case is already fully
          // understood and handled, so only capture genuinely unexpected
          // failures here.
          Sentry.captureException(err);
          send({ type: "error", message: String(err) });
        }
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
