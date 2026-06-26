"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Search,
  RefreshCw,
  Sparkles,
  Linkedin,
  Twitter,
  Copy,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Zap,
  Bookmark,
  BookmarkCheck,
  Ban,
  ExternalLink,
  X,
  ChevronDown,
  ChevronUp,
  Mail,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/theme-toggle";
import { CustomUserButton } from "@/components/custom-user-button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Summary {
  id: string;
  created_at: string;
  newsletter_title: string;
  simple_explanation: string;
  summary: string;
  key_points: string[];
  linkedin_post: string;
  twitter_post: string;
  source_email: string;
  source_url: string;
  category: string;
  is_bookmarked: boolean;
  is_read: boolean;
}

interface SyncStats {
  processedCount: number;
  skippedCount: number;
  deletedCount: number;
}

interface SyncProgress {
  current: number;
  total: number;
  title: string;
}

type Platform = "linkedin" | "twitter";
type SortOption = "newest" | "oldest" | "source" | "category";
type DateFilter = "7d" | "30d" | "90d" | "all";

// ---------------------------------------------------------------------------
// Category config
// ---------------------------------------------------------------------------
const CATEGORIES = [
  "All",
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

const CAT_STYLE: Record<string, string> = {
  "AI & ML":  "bg-indigo-500/15 text-indigo-400 border-indigo-500/25",
  "Tech":     "bg-blue-500/15 text-blue-400 border-blue-500/25",
  "Science":  "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
  "Business": "bg-amber-500/15 text-amber-400 border-amber-500/25",
  "Finance":  "bg-green-500/15 text-green-400 border-green-500/25",
  "Politics": "bg-red-500/15 text-red-400 border-red-500/25",
  "Health":   "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  "Startups": "bg-purple-500/15 text-purple-400 border-purple-500/25",
  "Other":    "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function extractSenderName(email: string) {
  const match = email.match(/^(.+?)\s*</);
  if (match) return match[1].trim().replace(/^["']|["']$/g, "");
  return email.split("@")[0];
}

function extractSenderDomain(email: string): string {
  const emailMatch = email.match(/<([^>]+)>/) || email.match(/(\S+@\S+)/);
  const addr = emailMatch?.[1] ?? email;
  return addr.split("@")[1]?.replace(/[>)]+$/, "") ?? "";
}

function getCategoryStyle(cat: string) {
  return CAT_STYLE[cat] ?? CAT_STYLE["Other"];
}

function twitterShareUrl(text: string) {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

function dateFilterCutoff(filter: DateFilter): Date | null {
  if (filter === "all") return null;
  const days = { "7d": 7, "30d": 30, "90d": 90 }[filter];
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function MetricTile({
  label,
  value,
  icon,
  sub,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3.5 flex items-center gap-3">
      <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SocialPostPanel({
  summaryId,
  platform,
  existingPost,
  generatedPost,
  isGenerating,
  isCopied,
  onGenerate,
  onCopy,
}: {
  summaryId: string;
  platform: Platform;
  existingPost: string;
  generatedPost?: string;
  isGenerating: boolean;
  isCopied: boolean;
  onGenerate: (id: string, p: Platform) => void;
  onCopy: (text: string, key: string) => void;
}) {
  const post = generatedPost || existingPost;
  const isLi = platform === "linkedin";

  return (
    <div className="rounded-md border border-border bg-background/40 p-3 space-y-2.5">
      <div className="flex items-center gap-1.5">
        {isLi ? (
          <Linkedin className="w-3.5 h-3.5 text-[#0A66C2]" />
        ) : (
          <Twitter className="w-3.5 h-3.5 text-[#1D9BF0]" />
        )}
        <span className="text-xs font-medium text-muted-foreground">
          {isLi ? "LinkedIn" : "X / Twitter"}
        </span>
      </div>

      {post ? (
        <>
          <p className="text-xs leading-relaxed text-foreground/80 whitespace-pre-wrap break-words">
            {post}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[11px] px-2 gap-1"
              onClick={() => onCopy(post, `${summaryId}-${platform}`)}
            >
              {isCopied ? (
                <><CheckCircle2 className="w-3 h-3 text-green-400" />Copied</>
              ) : (
                <><Copy className="w-3 h-3" />Copy</>
              )}
            </Button>
            {!isLi && (
              <a
                href={twitterShareUrl(post)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" variant="outline" className="h-6 text-[11px] px-2 gap-1">
                  <ExternalLink className="w-3 h-3" />
                  Share
                </Button>
              </a>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[11px] px-2 gap-1 text-muted-foreground"
              disabled={isGenerating}
              onClick={() => onGenerate(summaryId, platform)}
            >
              {isGenerating ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              Regenerate
            </Button>
          </div>
        </>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs px-2.5 gap-1.5"
          disabled={isGenerating}
          onClick={() => onGenerate(summaryId, platform)}
        >
          {isGenerating ? (
            <><Loader2 className="w-3 h-3 animate-spin" />Generating…</>
          ) : (
            <><Sparkles className="w-3 h-3" />Generate</>
          )}
        </Button>
      )}
    </div>
  );
}

function NewsletterCard({
  summary,
  isExpanded,
  isBookmarked,
  generatedPosts,
  generating,
  copying,
  onToggleExpand,
  onToggleBookmark,
  onGenerate,
  onCopy,
  onBlock,
}: {
  summary: Summary;
  isExpanded: boolean;
  isBookmarked: boolean;
  generatedPosts: Record<string, { linkedin?: string; twitter?: string }>;
  generating: Record<string, boolean>;
  copying: string | null;
  onToggleExpand: (id: string) => void;
  onToggleBookmark: (id: string) => void;
  onGenerate: (id: string, p: Platform) => void;
  onCopy: (text: string, key: string) => void;
  onBlock: (id: string) => void;
}) {
  const posts = generatedPosts[summary.id] ?? {};
  const cat = summary.category || "Other";
  const catStyle = getCategoryStyle(cat);
  const senderName = extractSenderName(summary.source_email);
  const senderDomain = extractSenderDomain(summary.source_email);
  const sourceHref = summary.source_url || (senderDomain ? `https://${senderDomain}` : null);

  return (
    <article
      className={`rounded-lg border bg-card overflow-hidden transition-all duration-150 ${
        isExpanded ? "border-border/80 ring-1 ring-primary/20" : "border-border hover:border-border/70 min-h-24"
      } ${!summary.is_read && !isExpanded ? "border-l-[3px] border-l-primary/50" : ""}`}
    >
      <div className="px-4 sm:px-5 pt-3.5 flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${catStyle}`}
          >
            {cat}
          </span>
          {sourceHref ? (
            <a
              href={sourceHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <Mail className="w-3 h-3" />
              {senderName}
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Mail className="w-3 h-3" />
              {senderName}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground/40">
            {timeAgo(summary.created_at)}
          </span>
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={() => onBlock(summary.id)}
            title="Block this sender"
            className="p-1 rounded transition-colors text-muted-foreground/25 hover:text-red-400"
          >
            <Ban className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onToggleBookmark(summary.id)}
            className={`p-1 rounded flex-shrink-0 transition-colors ${
              isBookmarked
                ? "text-amber-400 hover:text-amber-300"
                : "text-muted-foreground/30 hover:text-muted-foreground"
            }`}
            aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
          >
            {isBookmarked ? (
              <BookmarkCheck className="w-3.5 h-3.5" />
            ) : (
              <Bookmark className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      <button
        className="w-full text-left px-4 sm:px-5 pt-2 pb-3.5 flex items-start justify-between gap-3 group"
        onClick={() => onToggleExpand(summary.id)}
      >
        <h2 className="text-sm font-semibold leading-snug text-foreground group-hover:text-primary/90 transition-colors">
          {summary.newsletter_title}
        </h2>
        <span className="flex-shrink-0 mt-0.5">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </span>
      </button>

      {isExpanded && (
        <div className="border-t border-border">
          <div className="px-4 sm:px-5 py-4 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {summary.simple_explanation}
            </p>

            {summary.key_points?.length > 0 && (
              <ul className="space-y-2">
                {summary.key_points.map((point, i) => (
                  <li key={i} className="flex gap-2.5 text-sm">
                    <span className="text-primary mt-0.5 flex-shrink-0 text-xs">▸</span>
                    <span className="text-foreground/85">{point}</span>
                  </li>
                ))}
              </ul>
            )}

            <p className="text-[10px] text-muted-foreground/50">
              {formatDate(summary.created_at)}
            </p>
          </div>

          <div className="px-4 sm:px-5 py-4 bg-secondary/20 border-t border-border space-y-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              Social Posts
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SocialPostPanel
                summaryId={summary.id}
                platform="linkedin"
                existingPost={summary.linkedin_post}
                generatedPost={posts.linkedin}
                isGenerating={!!generating[`${summary.id}-linkedin`]}
                isCopied={copying === `${summary.id}-linkedin`}
                onGenerate={onGenerate}
                onCopy={onCopy}
              />
              <SocialPostPanel
                summaryId={summary.id}
                platform="twitter"
                existingPost={summary.twitter_post}
                generatedPost={posts.twitter}
                isGenerating={!!generating[`${summary.id}-twitter`]}
                isCopied={copying === `${summary.id}-twitter`}
                onGenerate={onGenerate}
                onCopy={onCopy}
              />
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Dashboard page
// ---------------------------------------------------------------------------
export default function Dashboard() {
  const { isLoaded } = useUser();

  // ── Data ──────────────────────────────────────────────────────────────────
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  const [gmailAddress, setGmailAddress] = useState<string | null>(null);

  // ── Per-card state ────────────────────────────────────────────────────────
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const [read, setRead] = useState<Set<string>>(new Set());
  const [generatedPosts, setGeneratedPosts] = useState<
    Record<string, { linkedin?: string; twitter?: string }>
  >({});
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [copying, setCopying] = useState<string | null>(null);

  // ── Filter / search state ─────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeSource, setActiveSource] = useState("All");
  const [dateFilter, setDateFilter] = useState<DateFilter>("90d");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!summaries.length) return;
    setBookmarked(new Set(summaries.filter((s) => s.is_bookmarked).map((s) => s.id)));
    setRead(new Set(summaries.filter((s) => s.is_read).map((s) => s.id)));
  }, [summaries]);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchSummaries = useCallback(async () => {
    try {
      const res = await fetch("/api/summaries", { cache: "no-store" });
      const data = await res.json();
      setSummaries(Array.isArray(data) ? data : []);
    } catch {
      setSummaries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummaries();
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((d) => {
        setGmailConnected(d.connected);
        setGmailAddress(d.gmailAddress ?? null);
      })
      .catch(() => setGmailConnected(false));
  }, [fetchSummaries]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    setSyncStats(null);
    setSyncProgress(null);

    try {
      const response = await fetch("/api/summarize", { method: "POST" });
      if (!response.body) throw new Error("No response stream");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "start") {
              setSyncProgress({ current: 0, total: data.total, title: "Starting…" });
            } else if (data.type === "progress") {
              setSyncProgress({ current: data.current, total: data.total, title: data.title });
            } else if (data.type === "complete") {
              setSyncStats({
                processedCount: data.processedCount ?? 0,
                skippedCount: data.skippedCount ?? 0,
                deletedCount: data.deletedCount ?? 0,
              });
              setSyncProgress(null);
              await fetchSummaries();
            } else if (data.type === "error") {
              setSyncError(data.message);
            }
          } catch {
            // skip malformed SSE line
          }
        }
      }
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
      setSyncProgress(null);
    }
  };

  // ── Card actions ──────────────────────────────────────────────────────────
  const handleToggleExpand = useCallback(
    (id: string) => {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
      if (!read.has(id)) {
        setRead((prev) => new Set([...prev, id]));
        fetch("/api/update-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, is_read: true }),
        }).catch(() => {});
      }
    },
    [read]
  );

  const handleToggleBookmark = useCallback((id: string) => {
    setBookmarked((prev) => {
      const next = new Set(prev);
      const newVal = !next.has(id);
      newVal ? next.add(id) : next.delete(id);
      fetch("/api/update-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_bookmarked: newVal }),
      }).catch(() => {});
      return next;
    });
  }, []);

  const handleGenerate = async (summaryId: string, platform: Platform) => {
    const key = `${summaryId}-${platform}`;
    setGenerating((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await fetch("/api/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summaryId, platform }),
      });
      const data = await res.json();
      if (data.post) {
        setGeneratedPosts((prev) => ({
          ...prev,
          [summaryId]: { ...prev[summaryId], [platform]: data.post },
        }));
      }
    } catch {
      /* ignore */
    } finally {
      setGenerating((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopying(key);
    setTimeout(() => setCopying(null), 2000);
  };

  const handleBlock = async (summaryId: string) => {
    const original = summaries.find((s) => s.id === summaryId);
    setSummaries((prev) => prev.filter((s) => s.id !== summaryId));
    try {
      await fetch("/api/block-sender", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summaryId }),
      });
    } catch {
      if (original) setSummaries((prev) => [original, ...prev]);
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const uniqueSources = useMemo(
    () => Array.from(new Set(summaries.map((s) => extractSenderName(s.source_email)))).sort(),
    [summaries]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    summaries.forEach((s) => {
      const cat = s.category || "Other";
      counts[cat] = (counts[cat] ?? 0) + 1;
    });
    return counts;
  }, [summaries]);

  const filteredSummaries = useMemo(() => {
    let result = summaries;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.newsletter_title.toLowerCase().includes(q) ||
          s.simple_explanation.toLowerCase().includes(q) ||
          s.key_points?.some((p) => p.toLowerCase().includes(q)) ||
          extractSenderName(s.source_email).toLowerCase().includes(q)
      );
    }

    if (activeCategory !== "All") {
      result = result.filter((s) => (s.category || "Other") === activeCategory);
    }

    if (activeSource !== "All") {
      result = result.filter(
        (s) => extractSenderName(s.source_email) === activeSource
      );
    }

    const cutoff = dateFilterCutoff(dateFilter);
    if (cutoff) {
      result = result.filter((s) => new Date(s.created_at) >= cutoff);
    }

    if (bookmarkedOnly) {
      result = result.filter((s) => bookmarked.has(s.id));
    }

    return [...result].sort((a, b) => {
      if (sortBy === "oldest")
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === "source")
        return extractSenderName(a.source_email).localeCompare(
          extractSenderName(b.source_email)
        );
      if (sortBy === "category")
        return (a.category || "Other").localeCompare(b.category || "Other");
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [summaries, searchQuery, activeCategory, activeSource, dateFilter, bookmarkedOnly, sortBy, bookmarked]);

  const metrics = useMemo(() => {
    const liReady = summaries.filter(
      (s) => s.linkedin_post || generatedPosts[s.id]?.linkedin
    ).length;
    const twReady = summaries.filter(
      (s) => s.twitter_post || generatedPosts[s.id]?.twitter
    ).length;
    return {
      total: summaries.length,
      liReady,
      twReady,
      sources: uniqueSources.length,
      bookmarkedCount: bookmarked.size,
    };
  }, [summaries, generatedPosts, uniqueSources, bookmarked]);

  const hasActiveFilters =
    searchQuery || activeCategory !== "All" || activeSource !== "All" ||
    dateFilter !== "90d" || sortBy !== "newest" || bookmarkedOnly;

  const clearFilters = () => {
    setSearchInput("");
    setSearchQuery("");
    setActiveCategory("All");
    setActiveSource("All");
    setDateFilter("90d");
    setSortBy("newest");
    setBookmarkedOnly(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (!isLoaded) return <div className="min-h-screen bg-background" />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 py-3">
            {/* Logo */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/pidgin-main.png" alt="Pidgin" className="w-7 h-7 rounded-md" />
              <span className="font-semibold text-sm hidden sm:block">Pidgin</span>
            </div>

            {/* Search — hidden during onboarding */}
            {gmailConnected !== false && (
              <div className="flex-1 max-w-xl relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  ref={searchRef}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search newsletters… (press /)"
                  className="pl-8 h-8 text-xs bg-secondary/50 border-border/60 focus-visible:ring-primary/50"
                />
                {searchInput && (
                  <button
                    onClick={() => setSearchInput("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Sync button — only when Gmail connected */}
            {gmailConnected === true && (
              <Button
                size="sm"
                onClick={handleSync}
                disabled={syncing || loading}
                className="gap-1.5 text-xs h-8 flex-shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">{syncing ? "Syncing…" : "Sync"}</span>
              </Button>
            )}

            {/* Theme + User avatar */}
            <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
              <ThemeToggle />
              <CustomUserButton />
            </div>
          </div>
        </div>

        {/* Sync progress / result strip */}
        {(syncProgress || syncStats || syncError) && (
          <div
            className={`border-t ${syncError ? "border-red-500/20 bg-red-500/5" : "border-border bg-secondary/20"}`}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 space-y-1.5">
              {syncError ? (
                <span className="text-xs text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {syncError}
                </span>
              ) : syncProgress ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin text-primary" />
                      <span className="text-foreground font-medium">
                        {syncProgress.current}/{syncProgress.total}
                      </span>
                      <span className="truncate max-w-xs">{syncProgress.title}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {Math.round((syncProgress.current / syncProgress.total) * 100)}%
                    </span>
                  </div>
                  <div className="h-0.5 w-full bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                    />
                  </div>
                </>
              ) : syncStats ? (
                <div className="flex items-center gap-5">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-foreground font-medium">{syncStats.processedCount}</span> new
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-foreground font-medium">{syncStats.skippedCount}</span> skipped
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-foreground font-medium">{syncStats.deletedCount}</span> removed
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </header>

      {/* ── Onboarding (Gmail not yet connected) ─────────────────────────── */}
      {gmailConnected === false && (
        <main className="min-h-[calc(100vh-57px)] flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-md">
            <div className="rounded-2xl border border-border bg-card p-8 shadow-xl shadow-black/20 space-y-7">
              <div className="text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                  <Mail className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold tracking-tight">Your AI newsletter digest</h1>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                    Pidgin connects to your Gmail, reads every newsletter you&apos;re subscribed to, and gives you a clean AI summary — plus ready-to-publish LinkedIn and X posts.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">How it works</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/40">
                    <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium">Create your account</p>
                      <p className="text-[11px] text-muted-foreground">Done — you&apos;re signed in</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <Mail className="w-2.5 h-2.5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-primary">Connect your Gmail</p>
                      <p className="text-[11px] text-muted-foreground">Grant read-only access — takes 30 seconds</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg opacity-40">
                    <div className="w-5 h-5 rounded-full border border-border flex items-center justify-center flex-shrink-0">
                      <Zap className="w-2.5 h-2.5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs font-medium">Sync &amp; read your digest</p>
                      <p className="text-[11px] text-muted-foreground">AI summaries appear in seconds</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <a href="/api/auth/google" className="block">
                  <Button className="w-full gap-2 h-10 text-sm font-medium">
                    <Mail className="w-4 h-4" />
                    Connect Gmail
                    <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-60" />
                  </Button>
                </a>
                <p className="text-center text-[11px] text-muted-foreground leading-relaxed">
                  Read-only access. We never send, delete, or modify your email.
                  <br />Your data stays private and is only used to generate your digest.
                </p>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* ── Dashboard (Gmail connected or loading) ────────────────────────── */}
      {gmailConnected !== false && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* ── Metrics ────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <MetricTile
              label="Total newsletters"
              value={metrics.total}
              icon={<LayoutGrid className="w-4 h-4 text-muted-foreground" />}
              sub="last 3 months"
            />
            <MetricTile
              label="LinkedIn posts"
              value={metrics.liReady}
              icon={<Linkedin className="w-4 h-4 text-[#0A66C2]" />}
              sub="ready to publish"
            />
            <MetricTile
              label="Twitter/X posts"
              value={metrics.twReady}
              icon={<Twitter className="w-4 h-4 text-[#1D9BF0]" />}
              sub="ready to publish"
            />
            <MetricTile
              label="Unique sources"
              value={metrics.sources}
              icon={<Mail className="w-4 h-4 text-muted-foreground" />}
            />
            <MetricTile
              label="Bookmarked"
              value={metrics.bookmarkedCount}
              icon={<Bookmark className="w-4 h-4 text-amber-400" />}
            />
          </div>

          {/* ── Filters ────────────────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat;
                const count = cat === "All" ? summaries.length : categoryCounts[cat] ?? 0;
                if (cat !== "All" && count === 0) return null;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                      isActive
                        ? cat === "All"
                          ? "bg-primary text-white border-primary"
                          : `${getCategoryStyle(cat)} border opacity-100`
                        : "bg-secondary/40 text-muted-foreground border-border hover:border-border/80 hover:text-foreground"
                    }`}
                  >
                    {cat}
                    <span className={`text-[10px] ${isActive ? "opacity-80" : "opacity-50"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={activeSource}
                onChange={(e) => setActiveSource(e.target.value)}
                className="h-7 rounded-md border border-border bg-secondary/40 px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              >
                <option value="All">All sources</option>
                {uniqueSources.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                className="h-7 rounded-md border border-border bg-secondary/40 px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 3 months</option>
                <option value="all">All time</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="h-7 rounded-md border border-border bg-secondary/40 px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="source">By source</option>
                <option value="category">By category</option>
              </select>

              <button
                onClick={() => setBookmarkedOnly((v) => !v)}
                className={`h-7 inline-flex items-center gap-1.5 px-2.5 rounded-md border text-xs transition-colors ${
                  bookmarkedOnly
                    ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                    : "bg-secondary/40 text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                <Bookmark className="w-3 h-3" />
                Bookmarked
              </button>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="h-7 inline-flex items-center gap-1 px-2 rounded-md text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3 h-3" />
                  Clear
                </button>
              )}

              {!loading && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {filteredSummaries.length === summaries.length
                    ? `${summaries.length} newsletter${summaries.length !== 1 ? "s" : ""}`
                    : `${filteredSummaries.length} of ${summaries.length}`}
                </span>
              )}
            </div>
          </div>

          {/* ── Content ────────────────────────────────────────────────────── */}
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 rounded-lg border border-border bg-card animate-pulse" />
              ))}
            </div>
          ) : summaries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center mb-4">
                <Mail className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No newsletters yet</p>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
                Click <span className="font-medium text-foreground">Sync</span> to fetch
                and summarize your Gmail newsletters. New items will appear here.
              </p>
              <Button size="sm" onClick={handleSync} disabled={syncing} className="mt-5 gap-2">
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                Sync now
              </Button>
            </div>
          ) : filteredSummaries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-4">
                <Search className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No results</p>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-xs">
                Try a different search term or adjust your filters.
              </p>
              <button
                onClick={clearFilters}
                className="mt-4 text-xs text-primary hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
              {filteredSummaries.map((summary) => (
                <NewsletterCard
                  key={summary.id}
                  summary={summary}
                  isExpanded={expandedIds.has(summary.id)}
                  isBookmarked={bookmarked.has(summary.id)}
                  generatedPosts={generatedPosts}
                  generating={generating}
                  copying={copying}
                  onToggleExpand={handleToggleExpand}
                  onToggleBookmark={handleToggleBookmark}
                  onGenerate={handleGenerate}
                  onCopy={handleCopy}
                  onBlock={handleBlock}
                />
              ))}
            </div>
          )}
        </main>
      )}
    </div>
  );
}
