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

function buildHtml(articles: Awaited<ReturnType<typeof getTodaysSummaries>>, userFirstName: string) {
  const dateStr = formatDate(new Date());
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

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
          <td style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#4b5563;padding-bottom:10px;border-bottom:1px solid #1f2937;">
            ${source}
          </td>
        </tr>
      </table>

      ${items.map((a, i) => {
        const keyPoints: string[] = Array.isArray(a.key_points) ? a.key_points : [];
        return `
        <div style="${i > 0 ? "margin-top:32px;padding-top:32px;border-top:1px solid #111827;" : ""}">
          <!-- Title -->
          <p style="font-size:16px;font-weight:700;color:#f9fafb;margin:0 0 10px;line-height:1.35;">${a.newsletter_title}</p>

          <!-- Full summary -->
          ${a.summary ? `<p style="font-size:14px;color:#9ca3af;margin:0 0 14px;line-height:1.75;">${a.summary}</p>` : ""}

          <!-- Key points -->
          ${keyPoints.length > 0 ? `
          <table cellpadding="0" cellspacing="0" style="margin:0 0 12px;">
            ${keyPoints.map(pt => `
            <tr>
              <td style="vertical-align:top;padding-right:8px;padding-bottom:6px;">
                <span style="display:inline-block;width:5px;height:5px;border-radius:50%;background-color:#6366f1;margin-top:7px;"></span>
              </td>
              <td style="font-size:13px;color:#6b7280;line-height:1.6;padding-bottom:6px;">${pt}</td>
            </tr>`).join("")}
          </table>` : ""}

          <!-- Simple explanation -->
          ${a.simple_explanation ? `
          <div style="border-left:2px solid #374151;padding-left:12px;margin-top:12px;">
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
<body style="margin:0;padding:0;background-color:#030712;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="max-width:600px;margin:0 auto;padding:48px 32px 64px;">

    <!-- Header -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:40px;">
      <tr>
        <td>
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-right:10px;vertical-align:middle;">
                <img src="${APP_URL}/pidgin-main.png" alt="Pidgin" width="28" height="28" style="display:block;border:0;border-radius:6px;" />
              </td>
              <td style="vertical-align:middle;">
                <span style="font-size:18px;font-weight:800;letter-spacing:-0.5px;color:#ffffff;">Pidgin</span>
              </td>
            </tr>
          </table>
        </td>
        <td align="right" style="vertical-align:middle;">
          <span style="font-size:12px;color:#374151;">${dateStr}</span>
        </td>
      </tr>
    </table>

    <!-- Greeting -->
    <p style="font-size:15px;color:#6b7280;margin:0 0 40px;line-height:1.5;">
      ${greeting}${userFirstName ? ", " + userFirstName : ""} — here's everything from your newsletters today. No need to open the app.
    </p>

    <!-- Articles -->
    ${sourcesHtml}

    <!-- CTA -->
    <div style="margin-top:16px;margin-bottom:48px;">
      <a href="${APP_URL}/dashboard"
         style="display:inline-block;padding:12px 24px;background-color:#6366f1;color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;border-radius:8px;">
        Bookmark &amp; generate social posts →
      </a>
    </div>

    <!-- Divider -->
    <div style="border-top:1px solid #111827;padding-top:24px;">
      <p style="font-size:11px;color:#374151;margin:0;line-height:1.7;">
        Sent by <strong style="color:#4b5563;">Pidgin</strong> · Your newsletter digest<br>
        <a href="${APP_URL}/dashboard" style="color:#4b5563;text-decoration:underline;">Manage preferences</a>
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

  const html = buildHtml(articles, user?.firstName ?? "");
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
