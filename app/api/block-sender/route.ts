import { auth } from "@clerk/nextjs/server";
import { getSummaryById, addBlockedSender, deleteSummary } from "@/lib/supabase";

function extractDomain(sourceEmail: string): string {
  const match = sourceEmail.match(/<([^>]+)>/) || sourceEmail.match(/(\S+@\S+)/);
  const addr = match?.[1] ?? sourceEmail;
  return addr.split("@")[1]?.replace(/[>)\s]+$/, "") ?? "";
}

// Blocked entries are matched as domain suffixes against every future scan,
// so a junk value like "a" or ".com" would block the user's entire feed.
// Require a plausible registrable domain: dotted labels, no leading dot.
const DOMAIN_RE = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;

function normalizeDomain(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const domain = input.trim().toLowerCase().replace(/^@/, "");
  if (domain.length > 253 || !DOMAIN_RE.test(domain)) return null;
  return domain;
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();

    // Direct domain blocking (used from the scan/selection modal before summaries exist)
    if (body.domain !== undefined) {
      const domain = normalizeDomain(body.domain);
      if (!domain) {
        return Response.json({ error: "Invalid domain" }, { status: 400 });
      }
      await addBlockedSender(domain, userId);
      return Response.json({ blocked: domain });
    }

    // Existing behavior: block by summaryId (looks up domain from the summary)
    const { summaryId } = body;
    if (!summaryId) {
      return Response.json({ error: "summaryId or domain required" }, { status: 400 });
    }

    const summary = await getSummaryById(summaryId, userId);
    if (!summary) {
      return Response.json({ error: "Summary not found" }, { status: 404 });
    }

    const domain = extractDomain(summary.source_email);
    if (!domain) {
      return Response.json({ error: "Could not extract domain" }, { status: 400 });
    }

    await addBlockedSender(domain, userId);
    await deleteSummary(summaryId, userId);

    return Response.json({ blocked: domain });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
