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
  links: Array<{ text: string; url: string }>;
  internalDate: number;
  source_url: string;
}

export interface EmailPreview {
  id: string;
  subject: string;
  from: string;
  fromName: string;
  fromEmail: string;
  domain: string;
  receivedAt: string; // ISO timestamp
  flagged?: boolean; // set by server-side Claude classification in scan route
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

// Extract raw HTML from a MIME payload tree (first text/html part found).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractRawHtml(payload: any): string {
  if (!payload) return "";
  if (payload.body?.data && payload.mimeType === "text/html") {
    return Buffer.from(payload.body.data, "base64").toString("utf-8");
  }
  if (!payload.parts) return "";
  for (const part of payload.parts) {
    if (part.mimeType === "text/html" && part.body?.data) {
      return Buffer.from(part.body.data, "base64").toString("utf-8");
    }
    const nested = extractRawHtml(part);
    if (nested) return nested;
  }
  return "";
}

// Extract editorial <a href> links from raw HTML, filtering out tracking/social/unsubscribe noise.
function extractLinks(html: string): Array<{ text: string; url: string }> {
  const links: Array<{ text: string; url: string }> = [];
  const re = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = m[1].trim();
    const text = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!url.startsWith("http")) continue;
    if (
      /unsubscribe|manage[\w-]*preference|r\.email|open\.email|mailchi\.mp|list-manage|cdn\.|cloudfront|amazonaws|instagram\.com\/|twitter\.com\/|facebook\.com\/|linkedin\.com\/company|youtube\.com\/channel|mailto:/i.test(
        url
      )
    )
      continue;
    if (text.length < 3) continue;
    links.push({ text, url });
  }
  // Dedupe by URL, keep order, cap at 40
  const seen = new Set<string>();
  return links.filter((l) => (seen.has(l.url) ? false : seen.add(l.url) && true)).slice(0, 40);
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

  const subjectLower = subject.toLowerCase();
  const { fromEmail, domain } = parseFrom(from);
  const senderDomain = domain.toLowerCase();
  const localPart = fromEmail.split("@")[0]?.toLowerCase() ?? "";

  // Matched against the sender's domain only (exact or subdomain), never the
  // display name — substring matching over the whole From header blocked
  // legitimate senders (e.g. "ups" matched groups.io, "citi" matched publicity).
  const blockedSenderDomains = [
    // Shipping / logistics / travel
    "amazon.com", "fedex.com", "ups.com", "usps.com", "dhl.com",
    "doordash.com", "uber.com", "lyft.com", "airbnb.com", "booking.com",
    "expedia.com", "hotels.com",
    // Finance / banking
    "chase.com", "bankofamerica.com", "wellsfargo.com", "citi.com",
    "citibank.com", "capitalone.com", "discover.com", "synchrony.com",
    "synchronybank.com", "nerdwallet.com", "experian.com", "equifax.com",
    // Job sites, ATS & job-search tools
    "linkedin.com", "indeed.com", "glassdoor.com", "joinhandshake.com",
    "ashbyhq.com", "greenhouse.io", "lever.co", "workday.com",
    "myworkday.com", "smartrecruiters.com", "icims.com", "bamboohr.com",
    "jackapplies.com", "searchwithjack.com",
    // Events / tickets / sports
    "eventbrite.com", "ticketmaster.com", "meetup.com", "mlbemail.com",
    "nba.com", "nfl.com", "nhl.com",
    // Retail / coupons
    "groupon.com", "coupons.com", "retailmenot.com",
    // Enterprise marketing
    "enterprise.com",
    // Auto dealerships
    "alstspecials.com", "dealerfire.com", "dealer.com", "dealerinspire.com",
    // Institutional / school emails (TLD)
    "edu",
  ];
  const domainMatches = (blocked: string) => {
    const b = blocked.toLowerCase().replace(/^@/, "");
    return senderDomain === b || senderDomain.endsWith(`.${b}`);
  };
  if (blockedSenderDomains.some(domainMatches)) return false;
  if (blockedDomains.some(domainMatches)) return false;

  // ATS/job-board blasts come from many custom domains but share these
  // local parts.
  const blockedLocalParts = ["jobs-noreply", "jobalerts-noreply"];
  if (blockedLocalParts.includes(localPart)) return false;

  const blockedSubjects = [
    "your application was sent", "thanks for applying", "application received",
    "job alert", "jobs match your", "new jobs for you",
    "your order", "order confirmation", "order shipped", "your receipt",
    "payment confirmation", "statement available", "your statement",
    "party guide", "% off", "save big", "flash sale", "enter to win",
    "you're eligible", "cash bonus", "preapproval",
    "you're invited",
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

function parseFrom(from: string): { fromName: string; fromEmail: string; domain: string } {
  const nameMatch = from.match(/^(.+?)\s*</);
  const emailMatch = from.match(/<([^>]+)>/) || from.match(/(\S+@\S+)/);
  const fromEmail = emailMatch?.[1] ?? from;
  const fromName = nameMatch?.[1]?.trim().replace(/^["']|["']$/g, "") ?? fromEmail.split("@")[0];
  const domain = fromEmail.split("@")[1]?.replace(/[>)\s]+$/, "") ?? "";
  return { fromName, fromEmail, domain };
}

// Primary is included because many newsletters (Substack, personal lists)
// land there; isLikelyNewsletter screens out the personal mail it brings in.
// The categories must be parenthesized — Gmail's implicit AND binds tighter
// than OR, so without grouping `after:` would only constrain the last term.
// Epoch seconds because Gmail reads a plain date in the account's timezone,
// which drifts a day off the server-computed midnight on UTC hosts.
function buildNewsletterQuery(sinceDate?: Date): string {
  let query = "(category:promotions OR category:updates OR category:primary)";
  if (sinceDate) {
    query += ` after:${Math.floor(sinceDate.getTime() / 1000)}`;
  }
  return query;
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
    const query = buildNewsletterQuery(sinceDate);

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

      const rawHtml = extractRawHtml(msg.data.payload);
      emailData.push({
        id: message.id!,
        subject,
        from,
        body: body.substring(0, 8000),
        links: extractLinks(rawHtml),
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

// Lightweight metadata-only fetch — no body download, fast.
// Used by the scan phase to show the selection modal before Claude processing.
export async function fetchNewsletterMetadata(
  accessToken: string,
  refreshToken: string,
  sinceDate?: Date,
  maxResults?: number,
  blockedDomains: string[] = []
): Promise<EmailPreview[]> {
  const gmail = createGmailClient(accessToken, refreshToken);

  try {
    const query = buildNewsletterQuery(sinceDate);

    const listMax = maxResults ? Math.max(maxResults * 3, 60) : 100;
    const res = await gmail.users.messages.list({ userId: "me", q: query, maxResults: listMax });
    const messages = res.data.messages || [];
    console.log("[gmail/scan] query:", query, "| candidates:", messages.length);

    const previews: EmailPreview[] = [];
    const batchSize = 12;

    for (let i = 0; i < messages.length; i += batchSize) {
      if (maxResults && previews.length >= maxResults) break;

      const batch = messages.slice(i, i + batchSize);
      const batchMessages = await Promise.all(
        batch.map(async (message) => {
          if (!message.id) return null;

          const msg = await gmail.users.messages.get({
            userId: "me",
            id: message.id,
            format: "metadata",
            metadataHeaders: ["Subject", "From", "List-Unsubscribe", "List-Archive"],
          });

          return { id: message.id, data: msg.data };
        }),
      );

      for (const msg of batchMessages) {
        if (!msg) continue;
        if (maxResults && previews.length >= maxResults) break;

        const headers = msg.data.payload?.headers || [];
        const subject = headers.find((h) => h.name === "Subject")?.value || "No Subject";
        const from = headers.find((h) => h.name === "From")?.value || "Unknown";
        const internalDate = parseInt(msg.data.internalDate || "0");

        if (!isLikelyNewsletter(from, subject, headers, blockedDomains)) continue;

        const { fromName, fromEmail, domain } = parseFrom(from);
        previews.push({
          id: msg.id,
          subject,
          from,
          fromName,
          fromEmail,
          domain,
          receivedAt: new Date(internalDate).toISOString(),
        });
      }
    }

    console.log("[gmail/scan] newsletters found:", previews.length);
    return previews;
  } catch (error) {
    console.error("Error fetching newsletter metadata:", error);
    throw error;
  }
}

// Fetch a single email's full content by Gmail message ID.
// Used during the import phase to fetch only the emails the user selected.
export async function getEmailById(
  accessToken: string,
  refreshToken: string,
  id: string
): Promise<EmailData | null> {
  const gmail = createGmailClient(accessToken, refreshToken);

  try {
    const msg = await gmail.users.messages.get({ userId: "me", id, format: "full" });

    const headers = msg.data.payload?.headers || [];
    const subject = headers.find((h) => h.name === "Subject")?.value || "No Subject";
    const from = headers.find((h) => h.name === "From")?.value || "Unknown";
    const internalDate = parseInt(msg.data.internalDate || "0");
    const body = extractBody(msg.data.payload);
    if (body.length < 100) return null;

    const rawHtml = extractRawHtml(msg.data.payload);
    return {
      id,
      subject,
      from,
      body: body.substring(0, 8000),
      links: extractLinks(rawHtml),
      internalDate,
      source_url: extractSourceUrl(headers, from),
    };
  } catch (error) {
    console.error("[gmail] getEmailById error:", id, error);
    return null;
  }
}
