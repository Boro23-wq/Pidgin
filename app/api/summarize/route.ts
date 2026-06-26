import { auth } from "@clerk/nextjs/server";
import { fetchNewsletterEmails } from "@/lib/gmail";
import { summarizeNewsletter } from "@/lib/claude";
import { getValidTokens } from "@/lib/tokens";
import {
  saveSummary,
  isEmailProcessed,
  deleteOldSummaries,
  getBlockedDomains,
} from "@/lib/supabase";

export async function POST() {
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
        const tokens = await getValidTokens(userId);
        if (!tokens) {
          send({ type: "error", message: "Gmail not connected. Please connect your Gmail account." });
          controller.close();
          return;
        }

        const deletedCount = await deleteOldSummaries(userId, 90);
        const blockedDomains = await getBlockedDomains(userId);
        console.log("[summarize] userId:", userId, "blockedDomains:", blockedDomains);

        const since = new Date();
        since.setDate(since.getDate() - 30);
        const emails = await fetchNewsletterEmails(
          tokens.accessToken,
          tokens.refreshToken,
          since,
          10,
          blockedDomains
        );
        console.log("[summarize] emails found:", emails.length, emails.map(e => e.subject));

        if (emails.length === 0) {
          send({ type: "complete", processedCount: 0, skippedCount: 0, deletedCount });
          controller.close();
          return;
        }

        send({ type: "start", total: emails.length });

        let processedCount = 0;
        let skippedCount = 0;

        for (let i = 0; i < emails.length; i++) {
          const email = emails[i];
          send({ type: "progress", current: i + 1, total: emails.length, title: email.subject });

          try {
            const alreadyProcessed = await isEmailProcessed(email.id, userId);
            if (alreadyProcessed) {
              skippedCount++;
              continue;
            }

            console.log("[summarize] calling Claude for:", email.subject);
            const summaryData = await summarizeNewsletter(email.body, email.subject);
            console.log("[summarize] Claude done, saving to DB...");

            await saveSummary(
              {
                newsletter_title: email.subject,
                original_content: email.body,
                summary: summaryData.summary,
                simple_explanation: summaryData.simpleExplanation,
                key_points: summaryData.keyPoints,
                category: summaryData.category,
                linkedin_post: "",
                twitter_post: "",
                source_email: email.from,
                source_email_id: email.id,
                source_url: email.source_url,
                processed_date: new Date().toISOString().split("T")[0],
                is_bookmarked: false,
                is_read: false,
                user_id: userId,
              },
              userId
            );

            processedCount++;
            console.log("[summarize] saved:", email.subject);
            send({ type: "saved", title: email.subject });
          } catch (err) {
            console.error("[summarize] item-error for", email.subject, err);
            send({ type: "item-error", title: email.subject, message: String(err) });
          }
        }

        send({ type: "complete", processedCount, skippedCount, deletedCount });
      } catch (err) {
        send({ type: "error", message: String(err) });
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
