import { google } from "googleapis";

function createGmailClient(accessToken: string, refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  );
  oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

export interface EmailData {
  id: string;
  subject: string;
  from: string;
  body: string;
  internalDate: number;
  source_url: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Recursively find the best body text from a MIME payload tree.
// Many newsletters (Morning Brew, etc.) send a stub text/plain ("Oops! scrambling")
// and put all real content in text/html. We detect stubs and fall back to HTML.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractBody(payload: any): string {
  if (!payload) return "";

  // Direct body data (single-part message)
  if (payload.body?.data) {
    const raw = Buffer.from(payload.body.data, "base64").toString("utf-8");
    return payload.mimeType === "text/html" ? stripHtml(raw) : raw;
  }

  if (!payload.parts) return "";

  let plainText = "";
  let htmlText = "";

  for (const part of payload.parts) {
    if (part.mimeType === "text/plain" && part.body?.data && !plainText) {
      plainText = Buffer.from(part.body.data, "base64").toString("utf-8");
    }
    if (part.mimeType === "text/html" && part.body?.data && !htmlText) {
      htmlText = stripHtml(Buffer.from(part.body.data, "base64").toString("utf-8"));
    }
  }

  // If plain text is a stub (short) but HTML has real content, prefer HTML.
  // Threshold: plain < 600 chars AND HTML is at least 3× longer.
  if (plainText && htmlText && plainText.length < 600 && htmlText.length > plainText.length * 3) {
    return htmlText;
  }
  if (plainText) return plainText;
  if (htmlText) return htmlText;

  // Recurse into nested multipart sections
  for (const part of payload.parts) {
    const text = extractBody(part);
    if (text.length > 50) return text;
  }

  return "";
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Morning Brew / Sailthru-based newsletters don't set List-ID, so we can't
// require it. Use List-Unsubscribe (legally required for bulk mail) + blocklist.
function isLikelyNewsletter(
  from: string,
  subject: string,
  headers: Array<{ name?: string | null; value?: string | null }>,
  blockedDomains: string[] = []
): boolean {
  const hasUnsubscribe = headers.some(
    (h) => h.name?.toLowerCase() === "list-unsubscribe"
  );
  if (!hasUnsubscribe) return false;

  const fromLower = from.toLowerCase();
  const subjectLower = subject.toLowerCase();

  const blockedSenders = [
    // Shipping / logistics
    "amazon", "fedex", "ups", "usps", "dhl", "doordash", "uber", "lyft",
    "airbnb", "booking.com", "expedia", "hotels.com",
    // Finance / banking
    "chase", "mcmap.chase", "bankofamerica", "wellsfargo", "citi", "capitalone",
    "discover", "synchrony", "nerdwallet", "credit union", "experian", "equifax",
    // Job sites, ATS & job-search tools
    "linkedin.com", "jobs-noreply", "jobalerts-noreply", "indeed.com",
    "glassdoor", "handshake", "ashbyhq.com", "greenhouse.io", "lever.co",
    "workday.com", "smartrecruiters", "icims.com", "bamboohr",
    "jackapplies.com", "searchwithjack.com",
    // Events / tickets / sports
    "eventbrite", "ticketmaster", "meetup.com", "mlbemail.com",
    "nba.com", "nfl.com", "nhl.com",
    // Retail / coupons
    "groupon", "coupons.com", "retailmenot",
    // Enterprise marketing
    "enterprise.com", "enterprise-rent",
    // Institutional / school emails
    ".edu",
    // Auto dealerships
    "alstspecials.com", "dealerfire.com", "dealer.com", "dealerinspire.com",
  ];
  if (blockedSenders.some((d) => fromLower.includes(d))) return false;
  if (blockedDomains.some((d) => fromLower.includes(d))) return false;

  const blockedSubjects = [
    "your application was sent", "thanks for applying", "application received",
    "job alert", "jobs match your", "new jobs for you",
    "your order", "order confirmation", "order shipped", "your receipt",
    "payment confirmation", "statement available", "your statement",
    "party guide", "% off", "save big", "flash sale", "enter to win",
    "you're eligible", "cash bonus", "preapproval",
    // Event invites / school emails
    "join us", "you're invited", "game night", "happy hour",
    "register now", "rsvp", "save the date",
  ];
  if (blockedSubjects.some((p) => subjectLower.includes(p))) return false;

  return true;
}

function extractSourceUrl(
  headers: Array<{ name?: string | null; value?: string | null }>,
  from: string
): string {
  const listArchive = headers.find(
    (h) => h.name?.toLowerCase() === "list-archive"
  )?.value;
  if (listArchive) {
    const match = listArchive.match(/<([^>]+)>/);
    if (match?.[1]) return match[1];
  }

  const emailMatch = from.match(/<([^>]+)>/) || from.match(/(\S+@\S+)/);
  const addr = emailMatch?.[1] ?? from;
  const domain = addr.split("@")[1]?.replace(/[>)]+$/, "");
  return domain ? `https://${domain}` : "";
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export async function fetchNewsletterEmails(
  accessToken: string,
  refreshToken: string,
  sinceDate?: Date,
  maxResults = 10,
  blockedDomains: string[] = []
): Promise<EmailData[]> {
  const gmail = createGmailClient(accessToken, refreshToken);

  try {
    let query = "category:promotions OR category:updates";
    if (sinceDate) {
      const dateStr = sinceDate.toISOString().split("T")[0];
      query += ` after:${dateStr}`;
    }

    // Fetch enough candidates to find maxResults newsletters after filtering junk.
    // Gmail inbox has many non-newsletters (job alerts, bank promos) that pass
    // the List-Unsubscribe check — we need a big enough pool to filter through.
    const res = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: Math.max(maxResults * 10, 30),
    });

    const messages = res.data.messages || [];
    console.log("[gmail] query:", query, "| candidates:", messages.length);
    const emailData: EmailData[] = [];

    for (const message of messages) {
      if (emailData.length >= maxResults) break;

      const msg = await gmail.users.messages.get({
        userId: "me",
        id: message.id!,
        format: "full",
      });

      const headers = msg.data.payload?.headers || [];
      const subject = headers.find((h) => h.name === "Subject")?.value || "No Subject";
      const from = headers.find((h) => h.name === "From")?.value || "Unknown";
      const internalDate = parseInt(msg.data.internalDate || "0");

      const newsletter = isLikelyNewsletter(from, subject, headers, blockedDomains);
      const body = newsletter ? extractBody(msg.data.payload) : "";
      console.log(`[gmail] "${subject}" | from: ${from} | newsletter: ${newsletter} | bodyLen: ${body.length}`);

      if (!newsletter) continue;
      if (body.length < 100) continue;

      emailData.push({
        id: message.id!,
        subject,
        from,
        body: body.substring(0, 6000),
        internalDate,
        source_url: extractSourceUrl(headers, from),
      });
    }

    return emailData;
  } catch (error) {
    console.error("Error fetching emails:", error);
    throw error;
  }
}
