import { google } from "googleapis";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const gmail = google.gmail({ version: "v1", auth: oauth2Client });

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractBody(payload: any): string {
  if (!payload) return "";
  if (payload.body?.data) {
    const raw = Buffer.from(payload.body.data, "base64").toString("utf-8");
    return payload.mimeType === "text/html" ? stripHtml(raw) : raw;
  }
  if (!payload.parts) return "";
  for (const part of payload.parts) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      return Buffer.from(part.body.data, "base64").toString("utf-8");
    }
  }
  for (const part of payload.parts) {
    if (part.mimeType === "text/html" && part.body?.data) {
      return stripHtml(Buffer.from(part.body.data, "base64").toString("utf-8"));
    }
  }
  for (const part of payload.parts) {
    const text = extractBody(part);
    if (text.length > 50) return text;
  }
  return "";
}

export async function GET() {
  try {
    const query = "category:promotions OR category:updates";

    const res = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 30,
    });

    const messages = res.data.messages || [];
    const results = [];

    for (const message of messages.slice(0, 15)) {
      const msg = await gmail.users.messages.get({
        userId: "me",
        id: message.id!,
        format: "full",
      });

      const headers = msg.data.payload?.headers || [];
      const subject = headers.find((h) => h.name === "Subject")?.value || "No Subject";
      const from = headers.find((h) => h.name === "From")?.value || "Unknown";
      const mimeType = msg.data.payload?.mimeType || "unknown";

      const hasListUnsubscribe = headers.some(
        (h) => h.name?.toLowerCase() === "list-unsubscribe"
      );
      const listUnsubscribeValue = headers.find(
        (h) => h.name?.toLowerCase() === "list-unsubscribe"
      )?.value ?? null;

      const body = extractBody(msg.data.payload);

      // List all MIME parts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parts = (msg.data.payload?.parts || []).map((p: any) => ({
        mimeType: p.mimeType,
        size: p.body?.size,
        hasData: !!p.body?.data,
      }));

      results.push({
        id: message.id,
        subject,
        from,
        mimeType,
        hasListUnsubscribe,
        listUnsubscribeValue,
        bodyLength: body.length,
        bodyPreview: body.substring(0, 200),
        parts,
        passesFilter: hasListUnsubscribe && body.length >= 100,
      });
    }

    return Response.json({
      query,
      totalFound: messages.length,
      inspected: results.length,
      passing: results.filter((r) => r.passesFilter).length,
      results,
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
