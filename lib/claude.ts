import Anthropic from "@anthropic-ai/sdk";

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

interface SummaryResult {
  summary: string;
  simpleExplanation: string;
  keyPoints: string[];
  category: Category;
}

export async function summarizeNewsletter(
  content: string,
  title: string
): Promise<SummaryResult> {
  const prompt = `You are a newsletter summarizer. Analyze this newsletter and return JSON with exactly these keys:

{
  "summary": "2-3 sentence factual summary",
  "simpleExplanation": "plain-language explanation with a concrete example",
  "keyPoints": ["takeaway 1", "takeaway 2", "takeaway 3"],
  "category": "one of: AI & ML | Tech | Science | Business | Finance | Politics | Health | Startups | Other"
}

Newsletter Title: ${title}

Content:
${content}

Return only valid JSON, nothing else.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = response.content.find((b) => b.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not parse JSON from response");

  const result = JSON.parse(jsonMatch[0]) as SummaryResult;
  // Validate category
  if (!CATEGORIES.includes(result.category)) result.category = "Other";
  return result;
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
