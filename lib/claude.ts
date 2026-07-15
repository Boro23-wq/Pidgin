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

export const SIGNIFICANCE_LEVELS = ["major", "notable", "minor"] as const;
export type Significance = (typeof SIGNIFICANCE_LEVELS)[number];

export interface NewsletterStory {
  title: string;
  summary: string;
  simpleExplanation: string;
  keyPoints: string[];
  category: Category;
  sourceUrl: string;
  topicKey: string;
  whyItMatters: string;
  whatToDo: string;
  significance: Significance;
}

export async function extractNewsletterStories(
  content: string,
  newsletterTitle: string,
  links: Array<{ text: string; url: string }> = [],
  recentTopics: Array<{ topicKey: string; title: string }> = []
): Promise<NewsletterStory[]> {
  const linksSection =
    links.length > 0
      ? `Available links found in this email (pick sourceUrl from this list only — do not invent URLs):\n${links.map((l) => `- "${l.text}" → ${l.url}`).join("\n")}\n\n`
      : "";

  const recentTopicsSection =
    recentTopics.length > 0
      ? `\n\nTopics already identified from other newsletters recently (for topicKey matching only — does not change what fields to output):\n${recentTopics.slice(0, 15).map((t) => `- "${t.title}" → topicKey: "${t.topicKey}"`).join("\n")}\nIf a story below is about the same real-world event as one of these, reuse that EXACT topicKey. Otherwise create a new topicKey per the rules above.`
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
    "topicKey": "kebab-case slug for the main topic, e.g. openai-gpt56-government-approval or europe-us-ac-debate",
    "whyItMatters": "1-2 sentences on why this specifically matters to a busy founder/builder — distinct from the summary, more pointed about the implication",
    "whatToDo": "1 short actionable sentence — e.g. 'Worth reading if you're evaluating vector databases' or 'No action needed, just FYI'",
    "significance": "one of: major | notable | minor — how big a deal this is for a founder/builder audience"
  }
]

Rules:
- Extract ALL distinct editorial stories — no cap on the number
- One object per story — do not merge separate stories into one
- EXCLUDE: sponsored or advertiser content (anything marked "Sponsored By", "Partner", "Advertisement", "Brought to you by"), link roundups without editorial explanation, bare section headers, unsubscribe footers, boilerplate
- Minimum to include: ~3 sentences of real editorial content about a specific topic
- sourceUrl must come from the links list above — never invent or hallucinate a URL
- topicKey should be 2-5 kebab words that uniquely identify the news event
- whyItMatters should not just restate the summary — give the sharper "so what" for someone building a product/company
- whatToDo should be a concrete, honest recommendation, including "no action needed" when that's true — don't manufacture urgency
- significance: "major" = genuinely industry-shifting or high-stakes (rare — most stories are NOT this); "notable" = worth knowing about, normal editorial news; "minor" = incremental, niche, or low-stakes. Be conservative with "major" — most days should have few or none
- Every story object must include ALL fields above (title, summary, simpleExplanation, keyPoints, category, sourceUrl, topicKey, whyItMatters, whatToDo, significance) — never omit whyItMatters, whatToDo, or significance, even when reusing a topicKey from the list below${recentTopicsSection}

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
    whyItMatters: String(s.whyItMatters ?? "").trim(),
    whatToDo: String(s.whatToDo ?? "").trim(),
    significance: SIGNIFICANCE_LEVELS.includes(s.significance as Significance)
      ? (s.significance as Significance)
      : "notable",
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
  const naturalVoiceRules = `NATURAL VOICE RULES (apply throughout, non-negotiable):
- Never fabricate personal authority or experience, like "I've spent years studying this" or "I've seen dozens of cases like this." You are summarizing a newsletter story, not recounting your own history.
- Never use inflated superlatives about the story itself, like "one of the most explosive cases I've ever seen" or "this is the biggest thing to happen in years." Let the facts carry the weight instead of the adjectives.
- Do not use the em dash (—) at all unless there is truly no other way to phrase the sentence. Use a period, comma, or "and"/"but" instead.
- Sound like a person talking, not a content-marketing template. Skip generic openers like "Big news:" or "Here's the thing:".
- Prefer plain, everyday words over buzzwords ("game-changing", "unprecedented", "revolutionary").`;

  const instructions =
    platform === "linkedin"
      ? `Write a LinkedIn post using the 8-Step LinkedIn Framework below. The post should be substantive, aiming for 300-500 words with plenty of white space for easy reading.

8-STEP FRAMEWORK (follow every step in order):

1. HOOK: One short punchy sentence (7-10 words) stating a concrete fact or number from the story. Never start with "I".

2. REHOOK: One follow-up sentence that adds contradiction or suspense to push the reader to click "see more".

3. CONTEXT: 1-2 sentences grounding the story, e.g. what happened and who's involved. Do not claim personal expertise or history you don't have; stick to the facts of the story.

4. BODY (60% of the post): The substance. Use short single-sentence paragraphs, numbered lists, or bullet points. Lots of white space. Break ideas into digestible chunks. Minimum 5-8 short paragraphs or list items here.

5. LESSON: One key takeaway sentence. The single most important thing the reader should remember.

6. POWER STATEMENT: 1-2 sentences that leave the reader thinking, grounded in the facts rather than hype.

7. CALL TO ENGAGE: Start with "P.S." and ask an open-ended question (not yes/no) that invites personal stories or opinions in the comments.

8. CTA: Tell them exactly what to do next (follow for more, repost if this helped, DM for X, etc.).

Add 3-5 relevant hashtags at the very end (on their own line).`
      : `Write a high-engagement X (Twitter) post using this structure:

1. HOOK: One punchy opening line that stops the scroll, using a concrete fact, number, or genuine question from the story. Never start with "I".

2. BODY: 4-8 short punchy lines, each on its own line. Use numbers, specifics, and contrast. Lots of white space. Make every line earn its place.

3. TAKEAWAY: One sharp sentence: the single thing the reader should remember.

4. CTA: Ask an open-ended question to drive replies, or tell them to repost/follow.

5. HASHTAGS: 2-4 relevant hashtags on their own line.

Aim for 500-800 characters. Write with energy and confidence, grounded in the facts rather than hype. Use 1-2 emojis max, placed for impact not decoration.`;

  const prompt = `${instructions}

${naturalVoiceRules}

Newsletter title: ${title}

Summary:
${summary}

Return ONLY the post text, no quotes, no explanation, no labels like "Hook:" or "Body:", just the raw post exactly as it would appear on the platform.`;

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
