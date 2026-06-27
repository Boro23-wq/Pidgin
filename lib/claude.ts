import Anthropic from "@anthropic-ai/sdk";
import { jsonrepair } from "jsonrepair";

const client = new Anthropic();

export const CATEGORIES = [
  "AI & ML",
  "Tech",
  "Science",
  "Business",
  "Finance",
  "Politics",
  "Health",
  "Startups",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface NewsletterStory {
  title: string;
  summary: string;
  simpleExplanation: string;
  keyPoints: string[];
  category: Category;
  sourceUrl: string;
  topicKey: string;
}

export async function extractNewsletterStories(
  content: string,
  newsletterTitle: string,
  links: Array<{ text: string; url: string }> = []
): Promise<NewsletterStory[]> {
  const linksSection =
    links.length > 0
      ? `Available links found in this email (pick sourceUrl from this list only — do not invent URLs):\n${links.map((l) => `- "${l.text}" → ${l.url}`).join("\n")}\n\n`
      : "";

  const prompt = `You are a newsletter story extractor. Extract every distinct editorial news story from this newsletter.

${linksSection}Return a JSON array:
[
  {
    "title": "short descriptive headline (5-10 words)",
    "summary": "comprehensive factual summary in 6-9 sentences — cover: (1) what happened and who's involved, (2) the key numbers, data, or quotes, (3) why this matters and what problem it solves or creates, (4) relevant context or background, (5) what comes next or what to watch for",
    "simpleExplanation": "1-2 plain-language sentences explaining this as if to someone outside the industry — use a concrete analogy or real-world comparison to make it click",
    "keyPoints": ["takeaway 1", "takeaway 2", "takeaway 3", "takeaway 4"],
    "category": "one of: AI & ML | Tech | Science | Business | Finance | Politics | Health | Startups | Other",
    "sourceUrl": "the most relevant URL from the links list above for this story, or empty string if none fits",
    "topicKey": "kebab-case slug for the main topic, e.g. openai-gpt56-government-approval or europe-us-ac-debate"
  }
]

Rules:
- Extract ALL distinct editorial stories — no cap on the number
- One object per story — do not merge separate stories into one
- EXCLUDE: sponsored or advertiser content (anything marked "Sponsored By", "Partner", "Advertisement", "Brought to you by"), link roundups without editorial explanation, bare section headers, unsubscribe footers, boilerplate
- Minimum to include: ~3 sentences of real editorial content about a specific topic
- sourceUrl must come from the links list above — never invent or hallucinate a URL
- topicKey should be 2-5 kebab words that uniquely identify the news event

Newsletter source: ${newsletterTitle}

Content:
${content}

Return only a valid JSON array, nothing else.`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 3000,
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = response.content.find((b) => b.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  const raw = textContent.text;

  // Parse: try array first, then unwrap {stories:[...]} wrapper.
  // jsonrepair handles unescaped quotes/newlines/control chars that Claude occasionally emits.
  let parsed: unknown;
  try {
    const arrayMatch = raw.match(/\[[\s\S]*\]/);
    const candidate = arrayMatch ? arrayMatch[0] : raw;
    try {
      parsed = JSON.parse(candidate);
    } catch {
      parsed = JSON.parse(jsonrepair(candidate));
    }
    if (!Array.isArray(parsed)) {
      const obj = parsed as Record<string, unknown>;
      parsed = obj.stories ?? obj.items ?? obj.data ?? [];
    }
  } catch (err) {
    console.error("[claude] JSON parse failed, skipping newsletter:", err);
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  const validLinks = new Set(links.map((l) => l.url));

  return (parsed as NewsletterStory[]).map((s) => ({
    title: String(s.title ?? "").trim(),
    summary: String(s.summary ?? "").trim(),
    simpleExplanation: String(s.simpleExplanation ?? "").trim(),
    keyPoints: Array.isArray(s.keyPoints) ? s.keyPoints.map(String) : [],
    category: CATEGORIES.includes(s.category as Category)
      ? (s.category as Category)
      : "Other",
    sourceUrl:
      s.sourceUrl && validLinks.has(s.sourceUrl) ? s.sourceUrl : "",
    topicKey: String(s.topicKey ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, ""),
  }));
}

export async function batchFlagEmails(
  emails: Array<{ id: string; fromName: string; subject: string }>
): Promise<Set<string>> {
  if (!emails.length) return new Set();

  const list = emails
    .map((e, i) => `${i + 1}. from="${e.fromName}" subject="${e.subject}"`)
    .join("\n");

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `Classify these emails. Return a JSON array of the NUMBERS that are NOT real newsletters.

Flag these:
- Social media notifications (likes, follows, comments, new followers, mentions)
- Retail / shopping deals, coupons, % off, weekend sales, bonus credits
- Event / venue / nightclub / concert / ticket promotions
- Job alerts, resume services, career coaching, recruiting emails
- SaaS product onboarding ("haven't used X yet", "let's fix that", "getting started with")
- Transactional / account emails (receipts, confirmations, account activity)

Keep as newsletters (do NOT flag):
- Editorial news digests (tech, business, finance, AI, science, politics, health)
- Opinion or analysis newsletters
- Industry roundups with real editorial news content

Emails:
${list}

Return ONLY a JSON array like [1, 4, 7]. Return [] if none to flag. No explanation.`,
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") return new Set();
  const match = text.text.match(/\[[\d,\s]*\]/);
  if (!match) return new Set();
  const indices = JSON.parse(match[0]) as number[];
  return new Set(
    indices
      .filter(Number.isInteger)
      .map((i) => emails[i - 1]?.id)
      .filter((id): id is string => Boolean(id))
  );
}

export async function generateSocialPost(
  summary: string,
  title: string,
  platform: "linkedin" | "twitter"
): Promise<string> {
  const instructions =
    platform === "linkedin"
      ? `Write a LinkedIn post using the 8-Step LinkedIn Framework below. The post should be substantive — aim for 300–500 words with plenty of white space for easy reading.

8-STEP FRAMEWORK (follow every step in order):

1. HOOK — One short punchy sentence (7–10 words). Use a number or bold statement that "opens a loop". Never start with "I".

2. REHOOK — One follow-up sentence that adds contradiction or suspense to push the reader to click "see more".

3. CREDIBILITY BUILDER — 1–2 sentences that briefly establish authority or context. Give the reader a reason to trust the insight.

4. BODY (60% of the post) — The substance. Use short single-sentence paragraphs, numbered lists, or bullet points. Lots of white space. Break ideas into digestible chunks. Minimum 5–8 short paragraphs or list items here.

5. LESSON — One key takeaway sentence. The single most important thing the reader should remember.

6. POWER STATEMENT — 1–2 sentences that leave the reader inspired, provoked, or thinking differently.

7. CALL TO ENGAGE — Start with "P.S." and ask an open-ended question (not yes/no) that invites personal stories or opinions in the comments.

8. CTA — Tell them exactly what to do next (follow for more, repost if this helped, DM for X, etc.).

Add 3–5 relevant hashtags at the very end (on their own line).`
      : "Write a Twitter/X post (max 280 characters, punchy and engaging, include 1-2 relevant emojis and hashtags).";

  const prompt = `${instructions}

Newsletter title: ${title}

Summary:
${summary}

Return ONLY the post text, no quotes, no explanation, no labels like "Hook:" or "Body:" — just the raw post exactly as it would appear on the platform.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1200,
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = response.content.find((b) => b.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  return textContent.text.trim();
}
