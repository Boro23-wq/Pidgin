import { describe, it, expect } from "vitest";
import { topicScore, rankQualifyingTopics, EMAIL_SCORE_THRESHOLD, type TrendMap } from "./digest";
import type { Summary } from "./supabase";

// Minimal, fully-populated fixture — only the fields that affect scoring
// (significance, topic_key) are meant to be overridden per test.
function makeSummary(overrides: Partial<Summary> = {}): Summary {
  return {
    id: "s1",
    created_at: "2026-07-06T12:00:00.000Z",
    user_id: "user_1",
    newsletter_title: "Test story",
    original_content: "",
    summary: "A summary.",
    simple_explanation: "",
    key_points: [],
    linkedin_post: "",
    twitter_post: "",
    source_email: "Newsletter <news@example.com>",
    source_email_id: "email_1",
    processed_date: "2026-07-06",
    category: "Business",
    source_url: "https://example.com/story",
    topic_key: "topic-a",
    source_type: "gmail",
    why_it_matters: "It matters.",
    what_to_do: "Do something.",
    significance: "notable",
    is_bookmarked: false,
    is_read: false,
    ...overrides,
  };
}

describe("topicScore", () => {
  it("scores a brand-new, single-source, notable topic as significance + corroboration only", () => {
    const items = [makeSummary({ significance: "notable" })];
    // topSignificance 4 + corroboration (1 * 2 = 2) + recurrence 0
    expect(topicScore(items)).toBe(6);
  });

  it("does not give a first-sighting topic any recurrence bonus (regression: weeksSeenCount starts at 1, not 0)", () => {
    const items = [makeSummary({ significance: "notable" })];
    // A topic seen for the first time has weeksSeenCount = 1 — this must
    // score identically whether trend is omitted or explicitly {weeksSeenCount: 1}.
    const withoutTrend = topicScore(items);
    const withFirstSighting = topicScore(items, { weeksSeenCount: 1 });
    expect(withFirstSighting).toBe(withoutTrend);
    expect(withFirstSighting).toBe(6);
  });

  it("rewards genuine recurrence only for weeks beyond the first", () => {
    const items = [makeSummary({ significance: "minor" })];
    // minor = 0 significance + corroboration 2 + recurrence: 3rd week seen
    // means 2 extra weeks beyond the first => min(2,5)*3 = 6
    expect(topicScore(items, { weeksSeenCount: 3 })).toBe(8);
  });

  it("takes the highest significance across corroborating articles, not the first", () => {
    const items = [
      makeSummary({ significance: "minor" }),
      makeSummary({ id: "s2", significance: "major" }),
      makeSummary({ id: "s3", significance: "notable" }),
    ];
    // topSignificance 10 (major) + corroboration (3*2=6) + recurrence 0
    expect(topicScore(items)).toBe(16);
  });

  it("caps corroboration at 5 sources so a viral story can't dominate purely on count", () => {
    const items = Array.from({ length: 10 }, (_, i) => makeSummary({ id: `s${i}`, significance: "minor" }));
    // corroboration capped at min(10,5)*2 = 10, not 20
    expect(topicScore(items)).toBe(10);
  });

  it("caps recurrence at 5 extra weeks", () => {
    const items = [makeSummary({ significance: "minor" })];
    // minor (0) + corroboration (1*2=2) + recurrence: weeksSeenCount 10 =>
    // extraWeeksSeen 9, capped at min(9,5)*3 = 15 => total 17
    expect(topicScore(items, { weeksSeenCount: 10 })).toBe(17);
  });
});

describe("rankQualifyingTopics", () => {
  it("excludes topics that don't clear EMAIL_SCORE_THRESHOLD and sorts the rest highest-first", () => {
    const trends: TrendMap = new Map([["topic-recurring", { weeksSeenCount: 4, occurrencesCount: 4, lastTitle: null }]]);

    const articles: Summary[] = [
      // Score 6 (notable, 1 source, no trend) — below threshold, should be excluded.
      makeSummary({ id: "low-1", topic_key: "topic-low", significance: "notable" }),
      // Score 16 (major, 3 corroborating sources) — clears the bar.
      makeSummary({ id: "high-1", topic_key: "topic-high", significance: "major" }),
      makeSummary({ id: "high-2", topic_key: "topic-high", significance: "major" }),
      makeSummary({ id: "high-3", topic_key: "topic-high", significance: "major" }),
      // Score 0 (minor, 1 source) + recurrence: 3 extra weeks => min(3,5)*3=9 => total 11. Clears the bar.
      makeSummary({ id: "recurring-1", topic_key: "topic-recurring", significance: "minor" }),
    ];

    const result = rankQualifyingTopics(articles, trends);
    const keys = result.map(([key]) => key);

    expect(keys).not.toContain("topic-low");
    expect(keys).toEqual(["topic-high", "topic-recurring"]);
  });

  it("returns an empty list on a quiet day where nothing clears the bar", () => {
    const articles: Summary[] = [makeSummary({ topic_key: "topic-a", significance: "notable" })];
    const result = rankQualifyingTopics(articles, new Map());
    expect(result).toEqual([]);
  });

  it("EMAIL_SCORE_THRESHOLD is stricter than the dashboard's Top Stories bar (8), by design", () => {
    expect(EMAIL_SCORE_THRESHOLD).toBeGreaterThan(8);
  });
});
