import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getTodaysSummaries } from "@/lib/supabase";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function extractSenderName(from: string) {
  const m = from.match(/^(.+?)\s*</);
  return m?.[1]?.trim().replace(/^["']|["']$/g, "") ?? from.split("@")[0];
}

function buildHtml(articles: Awaited<ReturnType<typeof getTodaysSummaries>>, userFirstName: string, userId: string) {
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

  const sourcesHtml = [...grouped.entries()].map(([source, items]) => `
    <div style="margin-bottom:48px;">
      <!-- Source label -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr>
          <td style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#9ca3af;padding-bottom:10px;border-bottom:1px solid #e5e7eb;">
            ${source}
          </td>
        </tr>
      </table>

      ${items.map((a, i) => {
        const keyPoints: string[] = Array.isArray(a.key_points) ? a.key_points : [];
        return `
        <div style="${i > 0 ? "margin-top:32px;padding-top:32px;border-top:1px solid #f3f4f6;" : ""}">
          <!-- Title -->
          <p style="font-size:16px;font-weight:700;color:#111827;margin:0 0 10px;line-height:1.35;">${a.newsletter_title}</p>

          <!-- Full summary -->
          ${a.summary ? `<p style="font-size:14px;color:#374151;margin:0 0 14px;line-height:1.75;">${a.summary}</p>` : ""}

          <!-- Key points -->
          ${keyPoints.length > 0 ? `
          <table cellpadding="0" cellspacing="0" style="margin:0 0 12px;">
            ${keyPoints.map(pt => `
            <tr>
              <td style="vertical-align:top;padding-right:8px;padding-bottom:6px;">
                <span style="display:inline-block;width:5px;height:5px;border-radius:50%;background-color:${BRAND};margin-top:7px;"></span>
              </td>
              <td style="font-size:13px;color:#4b5563;line-height:1.6;padding-bottom:6px;">${pt}</td>
            </tr>`).join("")}
          </table>` : ""}

          <!-- Simple explanation -->
          ${a.simple_explanation ? `
          <div style="border-left:2px solid #e5e7eb;padding-left:12px;margin-top:12px;">
            <p style="font-size:12px;color:#6b7280;margin:0;line-height:1.65;font-style:italic;">${a.simple_explanation}</p>
          </div>` : ""}
        </div>`;
      }).join("")}
    </div>
  `).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your Pidgin Digest</title>
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="max-width:600px;margin:0 auto;padding:48px 24px 64px;">

    <!-- Card wrapper -->
    <div style="background-color:#ffffff;border-radius:12px;border:1px solid #e5e7eb;padding:40px 36px;">

      <!-- Header -->
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

      <!-- Greeting -->
      <p style="font-size:15px;color:#6b7280;margin:0 0 36px;line-height:1.6;">
        ${greeting}${userFirstName ? ", " + userFirstName : ""} — here's everything from your newsletters today. No need to open the app.
      </p>

      <!-- Articles -->
      ${sourcesHtml}

      <!-- CTA -->
      <div style="margin-top:8px;margin-bottom:24px;">
        <a href="${APP_URL}/dashboard"
           style="display:inline-block;padding:12px 24px;background-color:${BRAND};color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;border-radius:8px;">
          Bookmark &amp; generate social posts →
        </a>
      </div>

      <!-- Feedback -->
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

    <!-- Footer -->
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

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;
  if (!userEmail) return NextResponse.json({ error: "No email found for user" }, { status: 400 });

  const articles = await getTodaysSummaries(userId);
  if (articles.length === 0) {
    return NextResponse.json({ sent: false, reason: "No articles today" });
  }

  const html = buildHtml(articles, user?.firstName ?? "", userId);
  const dateStr = formatDate(new Date());

  const { error } = await resend.emails.send({
    from: FROM,
    to: userEmail,
    subject: `Pidgin digest — ${dateStr}`,
    html,
  });

  if (error) {
    console.error("[digest] resend error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }

  return NextResponse.json({ sent: true, count: articles.length, to: userEmail });
}
