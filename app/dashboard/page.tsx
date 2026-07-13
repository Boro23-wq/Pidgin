"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { usePostHog } from "posthog-js/react";
import confetti from "canvas-confetti";
import {
  Search,
  RefreshCw,
  ArrowDownToLine,
  Download,
  PenLine,
  Linkedin,
  Copy,
  CheckCircle2,
  Loader2,
  Bookmark,
  BookmarkCheck,
  Ban,
  ExternalLink,
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Mail,
  MailOpen,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Inbox,
  ThumbsDown,
  ThumbsUp,
  Share2,
  Unplug,
  AlertTriangle,
  MessageSquare,
  CheckCheck,
  TrendingUp,
  BookOpen,
} from "lucide-react";

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.738l7.737-8.817-8.157-10.683H8.06l4.265 5.633L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/theme-toggle";
import { CustomUserButton } from "@/components/custom-user-button";
import { OnboardingFlow } from "@/components/onboarding-flow";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Spinner } from "@/components/ui/spinner";
import { apiPost } from "@/lib/api-fetch";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Summary {
  id: string;
  created_at: string;
  processed_date: string;
  newsletter_title: string;
  simple_explanation: string;
  summary: string;
  key_points: string[];
  linkedin_post: string;
  twitter_post: string;
  source_email: string;
  source_email_id: string;
  source_url: string;
  category: string;
  topic_key: string | null;
  why_it_matters: string | null;
  what_to_do: string | null;
  significance: string | null;
  is_bookmarked: boolean;
  is_read: boolean;
}

interface TopicTrend {
  weeksSeenCount: number;
  occurrencesCount: number;
  lastTitle: string | null;
}

interface EmailPreview {
  id: string;
  subject: string;
  from: string;
  fromName: string;
  fromEmail: string;
  domain: string;
  receivedAt: string;
  flagged?: boolean;
}

interface SyncStats {
  processedCount: number;
  skippedCount: number;
  deletedCount: number;
  nothingNew?: boolean;
  firstScan?: boolean;
}

interface SyncProgress {
  current: number;
  total: number;
  title: string;
}

type ScanResponse = {
  error?: string;
  code?: string;
  newsletters?: EmailPreview[];
  isFirstSync?: boolean;
};

type Platform = "linkedin" | "twitter";
type SortOption = "newest" | "oldest" | "source" | "category";
type DateFilter = "7d" | "all";

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const label = options.find((o) => o.value === value)?.label ?? value;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-7 flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 pl-2 pr-2 text-xs text-foreground whitespace-nowrap flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-inset focus:border-primary/60"
      >
        {label}
        <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 inline-flex flex-col rounded-md border border-border bg-popover shadow-lg py-1">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`text-left px-3 py-1.5 text-xs whitespace-nowrap hover:bg-secondary/60 transition-colors ${value === o.value ? "text-primary font-medium" : "text-foreground"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
  "AI & ML":
    "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/35 dark:border-indigo-500/25",
  Tech: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/35 dark:border-blue-500/25",
  Science:
    "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/35 dark:border-cyan-500/25",
  Business:
    "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/35 dark:border-amber-500/25",
  Finance:
    "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/35 dark:border-green-500/25",
  Politics:
    "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/35 dark:border-red-500/25",
  Health:
    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/35 dark:border-emerald-500/25",
  Startups:
    "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/35 dark:border-purple-500/25",
  Other:
    "bg-zinc-500/15 text-zinc-500 dark:text-zinc-400 border-zinc-500/35 dark:border-zinc-500/25",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function readJsonResponse<T>(res: Response): Promise<T | null> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;

  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

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

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
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

// Compact source attribution for a topic card — up to 2 sender names, then a
// "+N" overflow rather than listing every newsletter that covered the story.
function sourceLabel(group: TopicGroup): string {
  const names = Array.from(
    new Set(group.articles.map((a) => extractSenderName(a.source_email))),
  );
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}

// Heuristic: returns true for emails that are clearly NOT newsletters
function shouldFlagEmail(n: EmailPreview): boolean {
  // Trust server-side Claude Haiku classification when available
  if (n.flagged !== undefined) return n.flagged;

  // Fallback regex — runs only when server didn't classify (timeout / error)
  const from = (n.from + " " + n.fromEmail + " " + n.domain).toLowerCase();
  const subject = n.subject.toLowerCase();

  // Sender-based
  if (/no.?reply|donotreply|do.not.reply/.test(from)) return true;
  if (
    /workday|greenhouse\.io|lever\.co|ashbyhq|smartrecruiters|icims|taleo|myworkday/.test(
      from,
    )
  )
    return true;
  if (
    /slack\.com|github\.com|gitlab\.com|atlassian\.net|notion\.so|linear\.app|asana\.com|trello\.com|figma\.com/.test(
      from,
    )
  )
    return true;
  if (
    /bestbuy|best.?buy|walmart|target\.com|amazon\.com|homedepot|kohls|macys/.test(
      from,
    )
  )
    return true;
  if (
    /topresume|resumelab|ziprecruiter|monster\.com|indeed\.com|glassdoor|adzuna|handshake/.test(
      from,
    )
  )
    return true;
  if (/inkind|eventtickets|ticketmaster|eventbrite|seatgeek|stubhub/.test(from))
    return true;
  if (/airtable|notion\.so|monday\.com|clickup|basecamp|asana\.com/.test(from))
    return true;
  if (
    /pacha|1oak|lavo|marquee|tao|omnia|hakkasan|drai|xe|nightclub|venue/.test(
      from,
    )
  )
    return true;

  // Subject-based
  if (
    /application.*received|applied.*position|your application|job alert|interview.*scheduled|application for .*(engineer|developer|manager|analyst|designer)/.test(
      subject,
    )
  )
    return true;
  if (
    /resume review|free resume|your resume|career coach|dream job|great fit with|could be a (great )?fit/.test(
      subject,
    )
  )
    return true;
  if (
    /\d+%\s*(off|bonus|discount)|weekend only|flash sale|save big|just what your inbox|getting started|haven.?t used/.test(
      subject,
    )
  )
    return true;
  if (
    /verify your|confirm your email|password reset|security alert|sign.?in attempt|unusual.*activity/.test(
      subject,
    )
  )
    return true;
  if (
    /order confirm|your receipt|your invoice|payment confirm|shipping confirm|delivery confirm/.test(
      subject,
    )
  )
    return true;
  if (
    /tickets? (for|to)|tours? coming|coming to your area|tonight at|celebrate .*(pride|nye|halloween)|party guide/.test(
      subject,
    )
  )
    return true;
  if (
    /you.?re invited|join us (tonight|this|for)|rsvp|save the date/.test(
      subject,
    )
  )
    return true;

  return false;
}

const SCAN_SENTENCES = [
  "Looking for newsletters…",
  "Sorting signal from noise…",
  "Flagging the job alerts (you're welcome)…",
  "Finding what's actually worth reading…",
  "Separating newsletters from the clutter…",
  "Almost there, hold tight…",
];

function getCategoryStyle(cat: string) {
  return CAT_STYLE[cat] ?? CAT_STYLE["Other"];
}

function xShareUrl(text: string) {
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function dateSectionLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "TODAY";
  if (d.toDateString() === yesterday.toDateString()) return "YESTERDAY";
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function dateFilterCutoff(filter: DateFilter): Date | null {
  if (filter === "all") return null;
  const days = { "7d": 7, "30d": 30, "90d": 90 }[filter];
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

// ---------------------------------------------------------------------------
// Sync button
// ---------------------------------------------------------------------------
function SyncButton({
  onScan,
  scanning,
  disabled,
}: {
  onScan: () => void;
  scanning: boolean;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onScan}
      disabled={disabled || scanning}
      className="flex-shrink-0 h-9 px-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 text-sm font-medium transition-all shadow-sm shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {scanning ? (
        <Spinner />
      ) : (
        <ArrowDownToLine className="w-4 h-4 flex-shrink-0" />
      )}
      <span>{scanning ? "Scanning…" : "Sync inbox"}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Premium import progress overlay
// ---------------------------------------------------------------------------
const SECS_PER_BATCH = 65;
const IMPORT_BATCH_SIZE = 3;

function SyncOverlay({
  scanning,
  importing,
  progress,
  stats,
  error,
  errorCode,
  onDismiss,
  onCancel,
}: {
  scanning: boolean;
  importing: boolean;
  progress: SyncProgress | null;
  stats: SyncStats | null;
  error: string | null;
  errorCode?: string | null;
  onDismiss: () => void;
  onCancel?: () => void;
}) {
  const [sentenceIdx, setSentenceIdx] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!scanning) {
      setSentenceIdx(0);
      return;
    }
    const t = setInterval(
      () => setSentenceIdx((i) => (i + 1) % SCAN_SENTENCES.length),
      2600,
    );
    return () => clearInterval(t);
  }, [scanning]);

  useEffect(() => {
    if (importing && !startTimeRef.current) startTimeRef.current = Date.now();
    if (!importing) startTimeRef.current = null;
  }, [importing]);

  const show = scanning || importing || !!stats || !!error;
  if (!show) return null;

  const pct = progress
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  // ETA: remaining batches × avg seconds per batch
  const remaining = progress ? progress.total - progress.current : 0;
  const batchesLeft = Math.ceil(remaining / IMPORT_BATCH_SIZE);
  const etaSecs = batchesLeft * SECS_PER_BATCH;
  const etaLabel =
    progress && progress.current === 0 && etaSecs > 0
      ? `~${Math.round(etaSecs / 60)} min`
      : etaSecs > 90
        ? `~${Math.round(etaSecs / 60)} min left`
        : etaSecs > 10
          ? `~${etaSecs}s left`
          : null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={stats || error ? onDismiss : undefined}
      />
      <motion.div
        className="relative z-10 w-full max-w-[300px] rounded-2xl border border-border bg-card px-6 py-6"
        initial={{ scale: 0.96, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 4 }}
        transition={{ type: "spring", damping: 28, stiffness: 380 }}
      >
        {error ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              <p className="text-sm font-medium">Something went wrong</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed pl-[18px]">
              {error}
            </p>
            <div className="flex items-center gap-4 pl-[18px]">
              {errorCode === "reconnect_required" && (
                <button
                  onClick={() => {
                    window.location.href = "/api/auth/google";
                  }}
                  className="text-xs text-primary font-semibold"
                >
                  Reconnect Gmail
                </button>
              )}
              <button
                onClick={onDismiss}
                className={`text-xs font-medium ${errorCode === "reconnect_required" ? "text-muted-foreground" : "text-primary"}`}
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : stats ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2.5">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 20,
                  delay: 0.05,
                }}
                className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"
              />
              <p className="text-sm font-medium">
                {stats.nothingNew
                  ? "You're all caught up"
                  : stats.processedCount > 0
                    ? `${stats.processedCount} ${stats.processedCount === 1 ? "story" : "stories"} added`
                    : "All done"}
              </p>
            </div>
            {stats.nothingNew ? (
              <p className="text-xs text-muted-foreground pl-[18px]">
                {stats.firstScan
                  ? "No newsletters found in the last 7 days"
                  : "No newsletters arrived yet today"}
              </p>
            ) : stats.skippedCount > 0 ? (
              <p className="text-xs text-muted-foreground pl-[18px]">
                {stats.skippedCount} already in your digest
              </p>
            ) : null}
            <div className="pl-[18px]">
              <button
                onClick={onDismiss}
                className="text-xs text-primary font-medium"
              >
                {stats.nothingNew ? "Dismiss" : "View stories"}
              </button>
            </div>
          </motion.div>
        ) : scanning ? (
          /* ── Scan phase ── */
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Scanning your inbox</p>
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                >
                  Cancel
                </button>
              )}
            </div>
            {/* shimmer email rows */}
            <div className="space-y-2">
              {([80, 62, 72] as const).map((widthPct, i) => (
                <div
                  key={i}
                  className="h-[3px] rounded-full bg-foreground/[0.08] overflow-hidden"
                  style={{ width: `${widthPct}%` }}
                >
                  <motion.div
                    className="h-full w-full bg-foreground/20"
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{
                      duration: 1.8,
                      delay: i * 0.35,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="overflow-hidden" style={{ minHeight: "2rem" }}>
              <AnimatePresence mode="wait">
                <motion.p
                  key={sentenceIdx}
                  className="text-xs text-muted-foreground leading-relaxed"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                >
                  {SCAN_SENTENCES[sentenceIdx]}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        ) : (
          /* ── Import phase ── */
          <div className="space-y-5">
            {/* header */}
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium">
                  Importing
                </p>
                <p className="text-xl font-semibold tabular-nums">
                  {progress ? (
                    <>
                      <span className="text-primary">{progress.current}</span>{" "}
                      of {progress.total}
                    </>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
              {etaLabel && (
                <motion.span
                  key={etaLabel}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[10px] text-muted-foreground mt-1 tabular-nums flex-shrink-0"
                >
                  {etaLabel}
                </motion.span>
              )}
            </div>

            {/* step dots — one per newsletter */}
            {progress && progress.total > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {Array.from({ length: progress.total }, (_, i) => (
                  <motion.span
                    key={i}
                    className={`w-2 h-2 rounded-full block ${
                      i < progress.current
                        ? "bg-primary"
                        : "bg-foreground/[0.18]"
                    }`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      delay: i * 0.04,
                      type: "spring",
                      stiffness: 400,
                      damping: 20,
                    }}
                  />
                ))}
              </div>
            )}

            {/* progress bar */}
            {progress && (
              <div className="space-y-2">
                <div className="h-[3px] w-full bg-foreground/[0.18] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full relative overflow-hidden"
                    style={{ background: "hsl(var(--primary))" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  >
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background:
                          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)",
                      }}
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{
                        duration: 1.6,
                        repeat: Infinity,
                        ease: "easeInOut",
                        repeatDelay: 0.4,
                      }}
                    />
                  </motion.div>
                </div>
                <p className="text-[10px] text-muted-foreground tabular-nums">
                  {pct}%
                </p>
              </div>
            )}

            {/* current newsletter being processed */}
            {progress?.title && (
              <AnimatePresence mode="wait">
                <motion.p
                  key={progress.title}
                  className="text-xs text-muted-foreground leading-relaxed"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.22 }}
                >
                  {progress.title}
                </motion.p>
              </AnimatePresence>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Post-sync feedback toast
// ---------------------------------------------------------------------------
function FeedbackToast({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"prompt" | "text" | "thanks">("prompt");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (rating?: "up" | "down", msg?: string) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/feedback/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: rating ?? null, message: msg ?? null }),
      });
    } catch {
      /* fail silently */
    }
    setPhase("thanks");
    setTimeout(onDone, 1800);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.97 }}
      transition={{ type: "spring", damping: 28, stiffness: 380 }}
      className="fixed bottom-5 right-5 z-50 w-[300px] rounded-2xl border border-border bg-card shadow-2xl shadow-black/20 px-4 py-4"
    >
      {phase === "thanks" ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-2 py-1"
        >
          <CheckCheck className="w-4 h-4 text-emerald-500" />
          <p className="text-sm font-medium">Thanks for the feedback</p>
        </motion.div>
      ) : phase === "text" ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Tell us more
          </p>
          <textarea
            autoFocus
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What could be better?"
            rows={3}
            className="w-full rounded-xl bg-secondary/50 border border-border/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary/60"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => submit(undefined, message)}
              disabled={!message.trim() || submitting}
              className="flex-1 h-8 rounded-lg bg-primary text-white text-xs font-semibold disabled:opacity-40 hover:brightness-110 transition-all"
            >
              Send
            </button>
            <button
              onClick={onDone}
              className="h-8 px-3 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold leading-snug">
              How&apos;s your digest looking?
            </p>
            <button
              onClick={onDone}
              className="text-muted-foreground/50 hover:text-muted-foreground transition-colors mt-0.5 flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => submit("up")}
              className="flex-1 h-9 rounded-xl bg-secondary/60 hover:bg-emerald-500/15 hover:text-emerald-500 border border-border/50 hover:border-emerald-500/30 text-xs font-medium transition-all flex items-center justify-center gap-1.5"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              Loving it
            </button>
            <button
              onClick={() => submit("down")}
              className="flex-1 h-9 rounded-xl bg-secondary/60 hover:bg-red-500/15 hover:text-red-400 border border-border/50 hover:border-red-500/30 text-xs font-medium transition-all flex items-center justify-center gap-1.5"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
              Needs work
            </button>
          </div>
          <button
            onClick={() => setPhase("text")}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center flex items-center justify-center gap-1.5"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Say more...
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Share-publish failure toast
//
// The share link is copied to the clipboard inside the click gesture (browsers
// reject clipboard writes after an await), so the copy can succeed while the
// request that actually makes the summary public fails. The user is then
// holding a link that 404s for whoever they send it to, and nothing else in
// the UI would tell them. Deliberately not auto-dismissed: this needs an
// action, not a glance.
// ---------------------------------------------------------------------------
function ShareErrorToast({
  onRetry,
  onDismiss,
}: {
  onRetry: () => Promise<boolean>;
  onDismiss: () => void;
}) {
  const [retrying, setRetrying] = useState(false);
  const [failedAgain, setFailedAgain] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    setFailedAgain(false);
    const ok = await onRetry();
    setRetrying(false);
    if (ok) onDismiss();
    else setFailedAgain(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.97 }}
      transition={{ type: "spring", damping: 28, stiffness: 380 }}
      role="alert"
      className="fixed bottom-5 right-5 z-50 w-[300px] rounded-2xl border border-red-500/30 bg-card shadow-2xl shadow-black/20 px-4 py-4"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            <p className="text-sm font-semibold leading-snug">
              Link isn&apos;t live yet
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="text-muted-foreground/50 hover:text-muted-foreground transition-colors mt-0.5 flex-shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          The link was copied, but publishing this story failed. Anyone you send
          it to will see a Not Found page.
        </p>
        {failedAgain && (
          <p className="text-xs text-red-400 leading-relaxed">
            Still failing — check your connection.
          </p>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="flex-1 h-9 rounded-xl bg-primary text-white text-xs font-semibold hover:brightness-110 transition-all disabled:opacity-70 flex items-center justify-center gap-1.5"
          >
            {retrying && <Spinner className="w-3 h-3 border" />}
            {retrying ? "Publishing…" : "Try again"}
          </button>
          <button
            onClick={onDismiss}
            className="h-9 px-3 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Digest opt-in toast (shown after first ever sync)
// ---------------------------------------------------------------------------
function DigestOptInToast({
  onEnabled,
  onDismiss,
}: {
  onEnabled: () => void;
  onDismiss: () => void;
}) {
  const [enabling, setEnabling] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const toastRef = useRef<HTMLDivElement>(null);

  const handleEnable = async () => {
    setEnabling(true);
    try {
      await fetch("/api/digest/enable", { method: "POST" });
    } catch {
      // best-effort — if this fails, the toast will just reappear next load
    }
    setEnabling(false);
    setSubscribed(true);
  };

  // Fire confetti once, when the success state first mounts, then auto-close
  // after the user has had a moment to read the confirmation.
  useEffect(() => {
    if (!subscribed) return;

    // Burst from the toast's actual centre. A hardcoded origin guessed wrong
    // on wide viewports — the toast is pinned bottom-right, so its centre
    // drifts further right the wider the window, and the confetti landed to
    // its left. canvas-confetti's origin is normalized to the window (0–1).
    const rect = toastRef.current?.getBoundingClientRect();
    const origin = rect
      ? {
          x: (rect.left + rect.width / 2) / window.innerWidth,
          y: (rect.top + rect.height / 2) / window.innerHeight,
        }
      : { x: 0.5, y: 0.5 };

    confetti({
      particleCount: 30,
      spread: 50,
      startVelocity: 22,
      scalar: 0.7,
      ticks: 150,
      origin,
    });
    const t = setTimeout(onEnabled, 3200);
    return () => clearTimeout(t);
  }, [subscribed, onEnabled]);

  return (
    <motion.div
      ref={toastRef}
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.97 }}
      transition={{ type: "spring", damping: 28, stiffness: 380 }}
      className="fixed bottom-5 right-5 z-50 w-[300px] rounded-2xl border border-border bg-card shadow-2xl shadow-black/20 px-4 py-4"
    >
      {subscribed ? (
        <div className="space-y-1.5 text-center py-1">
          <div className="text-2xl leading-none mb-1">🎉</div>
          <p className="text-sm font-semibold leading-snug">
            You&apos;re subscribed!
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            We&apos;ll help you focus on what matters most — starting with
            tomorrow&apos;s brief.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold leading-snug">
              Get this in your inbox daily?
            </p>
            <button
              onClick={onDismiss}
              className="text-muted-foreground/50 hover:text-muted-foreground transition-colors mt-0.5 flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            A curated brief of your most important stories, every morning — no
            setup needed.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleEnable}
              disabled={enabling}
              className="flex-1 h-9 rounded-xl bg-primary text-white text-xs font-semibold hover:brightness-110 transition-all disabled:opacity-70"
            >
              {enabling ? "Turning on…" : "Turn on"}
            </button>
            <button
              onClick={onDismiss}
              className="h-9 px-3 rounded-xl text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Newsletter selection modal
// ---------------------------------------------------------------------------
function NewsletterSelectionModal({
  newsletters,
  isFirstSync,
  selectedIds,
  blockedDomains,
  onToggleSelect,
  onToggleAll,
  onBlockDomain,
  onImport,
  onClose,
}: {
  newsletters: EmailPreview[];
  isFirstSync: boolean;
  selectedIds: Set<string>;
  blockedDomains: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
  onBlockDomain: (domain: string) => void;
  onImport: () => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"newsletters" | "flagged">(
    "newsletters",
  );
  const [unflagged, setUnflagged] = useState<Set<string>>(new Set());

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Split into main vs flagged (auto-flagged minus user-unflagged)
  const autoFlaggedIds = useMemo(() => {
    const s = new Set<string>();
    newsletters.forEach((n) => {
      if (shouldFlagEmail(n)) s.add(n.id);
    });
    return s;
  }, [newsletters]);

  const mainEmails = newsletters.filter(
    (n) => !autoFlaggedIds.has(n.id) || unflagged.has(n.id),
  );
  const flaggedEmails = newsletters.filter(
    (n) => autoFlaggedIds.has(n.id) && !unflagged.has(n.id),
  );
  const activeList = activeTab === "newsletters" ? mainEmails : flaggedEmails;

  const visible = mainEmails.filter((n) => !blockedDomains.has(n.domain));
  const filtered = query
    ? activeList.filter(
        (n) =>
          n.fromName.toLowerCase().includes(query.toLowerCase()) ||
          n.subject.toLowerCase().includes(query.toLowerCase()),
      )
    : activeList;
  const allSelected =
    visible.length > 0 && visible.every((n) => selectedIds.has(n.id));
  const selectedCount = [...selectedIds].filter((id) =>
    visible.some((n) => n.id === id),
  ).length;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet / card */}
      <motion.div
        className="relative z-10 w-full sm:max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl shadow-black/40 overflow-hidden flex flex-col h-[85vh] sm:h-[80vh]"
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "30%", opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">
              {newsletters.length === 0
                ? "No new newsletters"
                : `Found ${newsletters.length} newsletter${newsletters.length !== 1 ? "s" : ""}${isFirstSync ? " today" : ""}`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {newsletters.length > 0
                ? "Tap to select. Block senders you don't want."
                : isFirstSync
                  ? "No newsletters landed in your inbox today. Check back tomorrow."
                  : "All caught up — nothing new since your last sync."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors mt-0.5 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {newsletters.length > 0 ? (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Tabs */}
            <div className="flex border-b border-border/40 bg-secondary/10">
              {(["newsletters", "flagged"] as const).map((tab) => {
                const count =
                  tab === "newsletters"
                    ? mainEmails.length
                    : flaggedEmails.length;
                const active = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      setQuery("");
                    }}
                    className={`flex-1 py-2.5 text-xs font-medium transition-colors relative flex items-center justify-center gap-1.5 ${
                      active
                        ? "text-foreground"
                        : "text-muted-foreground/60 hover:text-muted-foreground"
                    }`}
                  >
                    {tab === "newsletters" ? "Newsletters" : "Flagged"}
                    {count > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold tabular-nums ${
                          active
                            ? tab === "flagged"
                              ? "bg-amber-500/15 text-amber-400"
                              : "bg-primary/12 text-primary"
                            : "bg-secondary text-muted-foreground/50"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                    {active && (
                      <motion.div
                        layoutId="modal-tab-indicator"
                        className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-primary"
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 35,
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="px-4 pt-3 pb-2.5 border-b border-border/30">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40 pointer-events-none" />
                <input
                  type="text"
                  placeholder={
                    activeTab === "newsletters"
                      ? "Search newsletters…"
                      : "Search flagged…"
                  }
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-8 rounded-lg bg-secondary/50 border border-border/50 text-xs placeholder:text-muted-foreground/35 focus:outline-none focus:border-primary/40 transition-colors"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Select-all / count bar — only on newsletters tab */}
            {activeTab === "newsletters" && (
              <div className="px-5 py-2 border-b border-border/25 flex items-center justify-between">
                <button
                  onClick={onToggleAll}
                  className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {allSelected ? "Deselect all" : "Select all"}
                </button>
                <span className="text-[11px] text-muted-foreground/40 tabular-nums">
                  {selectedCount} of {visible.length} selected
                </span>
              </div>
            )}

            {/* Flagged tab hint */}
            {activeTab === "flagged" && flaggedEmails.length > 0 && (
              <div className="px-5 py-2 border-b border-border/25 flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground/50 leading-relaxed">
                  These look like notifications or automated emails. Add any to
                  the list if Claude got it wrong.
                </span>
              </div>
            )}

            {/* List */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground/50">
                  {query
                    ? `No results for "${query}"`
                    : activeTab === "flagged"
                      ? "Nothing flagged — inbox looks clean 🎉"
                      : "No newsletters found"}
                </div>
              ) : (
                filtered.map((n) => {
                  const isBlocked = blockedDomains.has(n.domain);
                  const isFlaggedTab = activeTab === "flagged";
                  const isSelected = selectedIds.has(n.id) && !isBlocked;
                  return (
                    <div
                      key={n.id}
                      onClick={() =>
                        !isBlocked && !isFlaggedTab && onToggleSelect(n.id)
                      }
                      className={`relative py-3 px-4 border-b border-border/20 flex items-center gap-3 select-none transition-all duration-150 ${
                        isBlocked
                          ? "opacity-25 cursor-default"
                          : isFlaggedTab
                            ? "cursor-default"
                            : "cursor-pointer"
                      } ${
                        !isFlaggedTab && !isSelected && !isBlocked
                          ? "opacity-50 hover:opacity-75"
                          : ""
                      }`}
                    >
                      {/* Selection dot (newsletters tab only) */}
                      {!isFlaggedTab && !isBlocked && (
                        <div
                          className={`w-2 h-2 rounded-full flex-shrink-0 transition-all duration-150 ${
                            isSelected
                              ? "bg-primary"
                              : "border border-muted-foreground/30"
                          }`}
                        />
                      )}
                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium truncate transition-colors ${
                            isBlocked
                              ? "line-through text-muted-foreground"
                              : isSelected
                                ? "text-foreground"
                                : "text-foreground/75"
                          }`}
                        >
                          {n.fromName}
                        </p>
                        <p className="text-xs text-muted-foreground/50 truncate mt-0.5">
                          {n.subject}
                        </p>
                      </div>

                      {/* Time */}
                      <span className="text-[11px] text-muted-foreground/30 flex-shrink-0 tabular-nums">
                        {formatTime(n.receivedAt)}
                      </span>

                      {isFlaggedTab ? (
                        /* Unflag button */
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setUnflagged((prev) => new Set([...prev, n.id]));
                            onToggleSelect(n.id);
                          }}
                          title="Move to newsletters list"
                          className="text-[10px] font-medium text-primary/70 hover:text-primary transition-colors flex-shrink-0 px-2 py-0.5 rounded border border-primary/20 hover:border-primary/50 hover:bg-primary/5"
                        >
                          Add to list
                        </button>
                      ) : (
                        /* Block button */
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onBlockDomain(n.domain);
                          }}
                          title={
                            isBlocked ? "Blocked" : "Block this sender forever"
                          }
                          className={`p-1 rounded transition-colors flex-shrink-0 ${
                            isBlocked
                              ? "text-red-400"
                              : "text-muted-foreground/20 hover:text-red-400"
                          }`}
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer CTA */}
            <div className="px-5 py-4 border-t border-border">
              <button
                onClick={onImport}
                disabled={selectedCount === 0}
                className="w-full h-10 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40"
                style={{
                  background:
                    selectedCount > 0
                      ? "linear-gradient(135deg, hsl(199 89% 42%), hsl(221 83% 53%))"
                      : "hsl(var(--secondary))",
                  color:
                    selectedCount > 0
                      ? "white"
                      : "hsl(var(--muted-foreground))",
                }}
              >
                {selectedCount > 0 ? (
                  <span className="flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" />
                    Import {selectedCount} selected
                  </span>
                ) : (
                  "Select at least one"
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="px-5 py-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
              <Inbox className="w-7 h-7 text-muted-foreground" />
            </div>
            <button onClick={onClose} className="mt-4 text-xs text-primary">
              Close
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
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
    <div className="rounded-xl border border-border bg-card px-4 py-4 flex items-center gap-3 h-full">
      <div className="w-9 h-9 rounded-lg bg-secondary/60 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-bold leading-none tracking-tight">
          {value}
        </p>
        <p className="text-sm text-muted-foreground mt-1">{label}</p>
        <p className="text-[10px] text-muted-foreground/80 mt-0.5 truncate">
          {sub ?? " "}
        </p>
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {isLi ? (
            <Linkedin className="w-3.5 h-3.5 text-[#0A66C2]" />
          ) : (
            <XIcon className="w-3 h-3 text-foreground" />
          )}
          <span className="text-xs font-medium text-muted-foreground">
            {isLi ? "LinkedIn" : "X"}
          </span>
        </div>

        {post && (
          <div className="flex items-center gap-0.5">
            {!isLi && (
              <a
                href={xShareUrl(post)}
                target="_blank"
                rel="noopener noreferrer"
                title="Share on X"
                className="p-1 rounded transition-colors text-muted-foreground/60 hover:text-foreground"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={() => onCopy(post, `${summaryId}-${platform}`)}
              title={isCopied ? "Copied!" : "Copy"}
              className={`p-1 rounded transition-colors ${isCopied ? "text-green-400" : "text-muted-foreground/60 hover:text-foreground"}`}
            >
              {isCopied ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={() => onGenerate(summaryId, platform)}
              title="Regenerate"
              disabled={isGenerating}
              className="p-1 rounded transition-colors text-muted-foreground/60 hover:text-foreground disabled:opacity-40"
            >
              {isGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        )}
      </div>

      {post ? (
        <>
          <p className="text-xs leading-relaxed text-foreground/80 whitespace-pre-wrap break-words">
            {post}
          </p>
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
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <PenLine className="w-3.5 h-3.5" />
              Draft
            </>
          )}
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Topic grouping — the brief is organized around what changed (the topic),
// not who told you about it (the sender).
// ---------------------------------------------------------------------------
interface TopicGroup {
  topicKey: string;
  headline: string;
  latestDate: string;
  date: string; // YYYY-MM-DD of the most recent article's received date
  articles: Summary[];
  categories: string[];
}

function groupSummariesByTopic(summaries: Summary[]): TopicGroup[] {
  const map = new Map<string, TopicGroup>();
  for (const s of summaries) {
    // Stories Claude couldn't cluster into a topic each get their own group
    // rather than being dropped or lumped together.
    const key = s.topic_key || `story-${s.id}`;
    const existing = map.get(key);
    if (existing) {
      existing.articles.push(s);
      if (s.created_at > existing.latestDate) {
        existing.latestDate = s.created_at;
        existing.headline = s.newsletter_title;
      }
      const cat = s.category || "Other";
      if (!existing.categories.includes(cat)) existing.categories.push(cat);
    } else {
      map.set(key, {
        topicKey: key,
        headline: s.newsletter_title,
        articles: [s],
        latestDate: s.created_at,
        date: s.processed_date,
        categories: s.category ? [s.category] : [],
      });
    }
  }
  // Preserves the order of `summaries` (a topic's position = wherever its
  // first article appeared in the input). Callers pass in already-sorted
  // summaries, so this naturally respects whatever sort the user picked —
  // it must NOT force its own date sort here, or every sort option other
  // than "newest" would silently have no effect on group order.
  return Array.from(map.values());
}

const SIGNIFICANCE_WEIGHT: Record<string, number> = {
  major: 10,
  notable: 4,
  minor: 0,
};

// Composite "how important is this" score, combining three signals:
// corroboration (multiple sources covering the same story), recurrence
// (trend memory — has this come up before), and Claude's own significance
// judgment. Used to decide what surfaces in "Top stories" vs "Trending" vs
// the flat everything-else list.
function topicImportanceScore(group: TopicGroup, trend?: TopicTrend): number {
  const topSignificance = group.articles.reduce((max, a) => {
    const w = SIGNIFICANCE_WEIGHT[a.significance ?? "notable"] ?? 4;
    return Math.max(max, w);
  }, 0);
  const corroboration = Math.min(group.articles.length, 5) * 2; // up to 10
  // weeks_seen_count starts at 1 on first sighting, so only weeks BEYOND the
  // first count as true recurrence — otherwise every brand-new topic would
  // get a free +3 before it has actually recurred.
  const extraWeeksSeen = Math.max((trend?.weeksSeenCount ?? 1) - 1, 0);
  const recurrence = Math.min(extraWeeksSeen, 5) * 3; // up to 15
  return topSignificance + corroboration + recurrence;
}

function TopicCard({
  group,
  trend,
  isRead,
  onOpen,
}: {
  group: TopicGroup;
  trend?: TopicTrend;
  isRead: (id: string) => boolean;
  onOpen: () => void;
}) {
  const isRecurring = (trend?.weeksSeenCount ?? 0) >= 2;
  const allRead = group.articles.every((a) => isRead(a.id));
  return (
    <button
      onClick={onOpen}
      className="w-full text-left bg-card rounded-lg border border-border hover:border-primary/30 hover:shadow-sm transition-all duration-150 group overflow-hidden"
    >
      <div className="px-4 py-3.5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{group.headline}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <p className="text-xs text-muted-foreground/60 flex-shrink-0">
              {group.articles.length} update
              {group.articles.length !== 1 ? "s" : ""} ·{" "}
              {timeAgo(group.latestDate)} · {sourceLabel(group)}
            </p>
            {group.categories.map((cat) => (
              <span
                key={cat}
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${getCategoryStyle(cat)}`}
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
        <span title={allRead ? "Seen" : "New"} className="flex-shrink-0">
          {allRead ? (
            <EyeOff className="w-3.5 h-3.5 text-muted-foreground/40" />
          ) : (
            <Eye className="w-3.5 h-3.5 text-primary/70" />
          )}
        </span>
        <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
      </div>
      {(isRecurring || group.articles.length > 1) && (
        <div className="px-4 pb-3 flex flex-wrap gap-1">
          {group.articles.length > 1 && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
              {group.articles.length} sources agree
            </span>
          )}
          {isRecurring && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border border-amber-500/30 bg-amber-500/10 text-amber-400">
              {trend!.weeksSeenCount === 2
                ? "2nd"
                : trend!.weeksSeenCount === 3
                  ? "3rd"
                  : `${trend!.weeksSeenCount}th`}{" "}
              week running
            </span>
          )}
        </div>
      )}
    </button>
  );
}

// Picks the article within a topic group whose fields ("why it matters" /
// "what to do") best represent the group in the hero treatment — highest
// Claude-judged significance wins, ties broken by most recent.
function primaryArticle(group: TopicGroup): Summary {
  return group.articles.reduce((best, a) => {
    const bw = SIGNIFICANCE_WEIGHT[best.significance ?? "notable"] ?? 4;
    const aw = SIGNIFICANCE_WEIGHT[a.significance ?? "notable"] ?? 4;
    if (aw !== bw) return aw > bw ? a : best;
    return a.created_at > best.created_at ? a : best;
  }, group.articles[0]);
}

// Hero treatment for the single highest-scoring story of the day — gives the
// brief one clear "here's the one thing" moment instead of opening straight
// into a ranked list. Renders above the rest of "Top stories".
function TopStoryHero({
  group,
  trend,
  onOpen,
}: {
  group: TopicGroup;
  trend?: TopicTrend;
  onOpen: () => void;
}) {
  const isRecurring = (trend?.weeksSeenCount ?? 0) >= 2;
  const article = primaryArticle(group);
  return (
    <button
      onClick={onOpen}
      className="w-full text-left bg-gradient-to-br from-primary/10 via-card to-card rounded-2xl border border-primary/30 hover:border-primary/50 hover:shadow-md transition-all duration-150 group overflow-hidden px-5 py-5 sm:px-6"
    >
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-widest bg-primary text-primary-foreground">
          Today&apos;s biggest story
        </span>
        {group.articles.length > 1 && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
            {group.articles.length} sources agree
          </span>
        )}
        {isRecurring && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border border-amber-500/30 bg-amber-500/10 text-amber-400">
            {trend!.weeksSeenCount === 2
              ? "2nd"
              : trend!.weeksSeenCount === 3
                ? "3rd"
                : `${trend!.weeksSeenCount}th`}{" "}
            week running
          </span>
        )}
      </div>
      <p className="text-lg font-bold tracking-tight leading-snug mb-2">
        {group.headline}
      </p>
      {article.why_it_matters && (
        <p className="text-sm text-foreground/80 leading-relaxed line-clamp-2 max-w-2xl">
          {article.why_it_matters}
        </p>
      )}
      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary mt-3 group-hover:gap-2 transition-all">
        Read the full story <ChevronRight className="w-3.5 h-3.5" />
      </span>
    </button>
  );
}

// A clickable section header (label + divider line(s)) that expands/collapses
// its own body with a height/opacity animation — shared by every section of
// the brief (Top stories, Trending, Everything else, and each date group).
function CollapsibleSection({
  label,
  labelClassName,
  dividerBefore,
  showDivider = true,
  collapsed,
  onToggle,
  children,
}: {
  label: string;
  labelClassName: string;
  dividerBefore?: boolean;
  showDivider?: boolean;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-0.5 group/section"
      >
        {dividerBefore && showDivider && (
          <div className="flex-1 h-px bg-border/40" />
        )}
        <span
          className={`text-[11px] font-semibold uppercase tracking-widest flex-shrink-0 transition-colors ${labelClassName}`}
        >
          {label}
        </span>
        <motion.span
          animate={{ rotate: collapsed ? -90 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="flex-shrink-0 text-muted-foreground/30 group-hover/section:text-muted-foreground/70 transition-colors"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </motion.span>
        {showDivider && <div className="flex-1 h-px bg-border/40" />}
      </button>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Mobile: single column. Desktop: split into two columns. Shared by every
// section of the brief (top stories, trending, everything-else-by-date).
function TopicCardGrid({
  groups,
  trends,
  isRead,
  onOpen,
}: {
  groups: TopicGroup[];
  trends: Record<string, TopicTrend>;
  isRead: (id: string) => boolean;
  onOpen: (g: TopicGroup) => void;
}) {
  const left = groups.filter((_, i) => i % 2 === 0);
  const right = groups.filter((_, i) => i % 2 !== 0);
  return (
    <>
      <div className="flex flex-col gap-3 lg:hidden">
        {groups.map((g) => (
          <TopicCard
            key={g.topicKey}
            group={g}
            trend={trends[g.topicKey]}
            isRead={isRead}
            onOpen={() => onOpen(g)}
          />
        ))}
      </div>
      <div className="hidden lg:flex gap-3 items-start">
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {left.map((g) => (
            <TopicCard
              key={g.topicKey}
              group={g}
              trend={trends[g.topicKey]}
              isRead={isRead}
              onOpen={() => onOpen(g)}
            />
          ))}
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {right.map((g) => (
            <TopicCard
              key={g.topicKey}
              group={g}
              trend={trends[g.topicKey]}
              isRead={isRead}
              onOpen={() => onOpen(g)}
            />
          ))}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Dismissed emails panel
// ---------------------------------------------------------------------------
interface DismissedEmail {
  email_id: string;
  from_name: string | null;
  from_email: string | null;
  subject: string | null;
  dismissed_at: string | null;
}

function DismissedEmailsPanel({
  onClose,
  onCountChange,
}: {
  onClose: () => void;
  onCountChange: (n: number) => void;
}) {
  const [emails, setEmails] = useState<DismissedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<Set<string>>(new Set());

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    fetch("/api/dismiss")
      .then((r) => r.json())
      .then((d) => setEmails(d.emails ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleRestore = async (emailId: string) => {
    setRestoring((prev) => new Set(prev).add(emailId));
    await fetch(`/api/dismiss?emailId=${encodeURIComponent(emailId)}`, {
      method: "DELETE",
    }).catch(() => {});
    setEmails((prev) => {
      const next = prev.filter((e) => e.email_id !== emailId);
      onCountChange(next.length);
      return next;
    });
    setRestoring((prev) => {
      const s = new Set(prev);
      s.delete(emailId);
      return s;
    });
  };

  return (
    <motion.div
      key="dismissed-panel"
      className="fixed inset-0 z-50 flex"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="w-full max-w-sm bg-background border-l border-border flex flex-col h-full shadow-2xl"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Dismissed emails
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Restore to see them in future scans
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <CheckCheck className="w-8 h-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-foreground">
                No dismissed emails
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Emails Claude flags as non-newsletters appear here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {emails.map((e) => (
                <li
                  key={e.email_id}
                  className="flex items-start gap-3 px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {e.from_name ?? e.from_email ?? "Unknown sender"}
                    </p>
                    {e.subject && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {e.subject}
                      </p>
                    )}
                    {!e.from_name && !e.from_email && (
                      <p className="text-xs text-muted-foreground/40 mt-0.5">
                        No preview available
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRestore(e.email_id)}
                    disabled={restoring.has(e.email_id)}
                    className="flex-shrink-0 text-[11px] font-medium text-primary hover:text-sky-300 disabled:opacity-40 transition-colors"
                  >
                    {restoring.has(e.email_id) ? "Restoring…" : "Restore"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Topic panel (right drawer)
// ---------------------------------------------------------------------------
function TopicPanel({
  topicKey,
  summaries,
  trend,
  onClose,
  isBookmarked,
  isRead,
  isFlagged,
  generatedPosts,
  generating,
  copying,
  onToggleBookmark,
  onToggleRead,
  onGenerate,
  onCopy,
  onBlock,
  onShare,
  onFlag,
}: {
  topicKey: string;
  summaries: Summary[];
  trend?: TopicTrend;
  onClose: () => void;
  isBookmarked: (id: string) => boolean;
  isRead: (id: string) => boolean;
  isFlagged: (id: string) => boolean;
  generatedPosts: Record<string, { linkedin?: string; twitter?: string }>;
  generating: Record<string, boolean>;
  copying: string | null;
  onToggleBookmark: (id: string) => void;
  onToggleRead: (id: string) => void;
  onGenerate: (id: string, p: Platform) => void;
  onCopy: (text: string, key: string) => void;
  onBlock: (id: string) => void;
  onShare: (id: string) => void;
  onFlag: (id: string) => void;
}) {
  const articles = summaries.filter(
    (s) => (s.topic_key || `story-${s.id}`) === topicKey,
  );
  const headline = articles[0]?.newsletter_title ?? "";
  const isRecurring = (trend?.weeksSeenCount ?? 0) >= 2;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] bg-background border-l border-border shadow-2xl flex flex-col"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <p className="text-sm font-semibold">{headline}</p>
            <p className="text-xs text-muted-foreground">
              {articles.length} update{articles.length !== 1 ? "s" : ""}
              {isRecurring
                ? ` · ${trend!.weeksSeenCount === 2 ? "2nd" : trend!.weeksSeenCount === 3 ? "3rd" : `${trend!.weeksSeenCount}th`} week running`
                : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {articles.map((s, i) => (
            <NewsletterCard
              key={s.id}
              summary={s}
              isFirst={i === 0}
              isBookmarked={isBookmarked(s.id)}
              isRead={isRead(s.id)}
              isFlagged={isFlagged(s.id)}
              generatedPosts={generatedPosts}
              generating={generating}
              copying={copying}
              onToggleBookmark={onToggleBookmark}
              onToggleRead={onToggleRead}
              onGenerate={onGenerate}
              onCopy={onCopy}
              onBlock={onBlock}
              onShare={onShare}
              onFlag={onFlag}
            />
          ))}
        </div>
      </motion.div>
    </>
  );
}

function NewsletterCard({
  summary,
  isFirst = true,
  isBookmarked,
  isRead,
  isFlagged,
  generatedPosts,
  generating,
  copying,
  onToggleBookmark,
  onToggleRead,
  onGenerate,
  onCopy,
  onBlock,
  onShare,
  onFlag,
}: {
  summary: Summary;
  isFirst?: boolean;
  isBookmarked: boolean;
  isRead: boolean;
  isFlagged: boolean;
  generatedPosts: Record<string, { linkedin?: string; twitter?: string }>;
  generating: Record<string, boolean>;
  copying: string | null;
  onToggleBookmark: (id: string) => void;
  onToggleRead: (id: string) => void;
  onGenerate: (id: string, p: Platform) => void;
  onCopy: (text: string, key: string) => void;
  onBlock: (id: string) => void;
  onShare: (id: string) => void;
  onFlag: (id: string) => void;
}) {
  const [socialOpen, setSocialOpen] = useState(true);
  const posts = generatedPosts[summary.id] ?? {};
  const cat = summary.category || "Other";
  const catStyle = getCategoryStyle(cat);
  const senderName = extractSenderName(summary.source_email);
  const senderDomain = extractSenderDomain(summary.source_email);
  const sourceHref =
    summary.source_url || (senderDomain ? `https://${senderDomain}` : null);

  return (
    <article className={isFirst ? "" : "mt-5 pt-5 border-t border-border"}>
      {/* Row 1: badge + quick action icons */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${catStyle}`}
        >
          {cat}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleRead(summary.id);
            }}
            title={isRead ? "Mark as unread" : "Mark as read"}
            className={`p-1 rounded transition-colors ${isRead ? "text-muted-foreground/60 hover:text-muted-foreground" : "text-primary/70 hover:text-primary"}`}
          >
            {isRead ? (
              <EyeOff className="w-3.5 h-3.5" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={() => onBlock(summary.id)}
            title="Block this sender"
            className="p-1 rounded transition-colors text-muted-foreground/60 hover:text-red-400"
          >
            <Ban className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onToggleBookmark(summary.id)}
            className={`p-1 rounded flex-shrink-0 transition-colors ${isBookmarked ? "text-amber-400 hover:text-amber-300" : "text-muted-foreground/60 hover:text-muted-foreground"}`}
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

      {/* Row 2: sender · timestamp */}
      <div className="pt-2.5 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <Mail className="w-3 h-3" />
          {senderName}
          {!isRead && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-primary ml-1"
              aria-hidden
            />
          )}
        </span>
        <span className="text-[10px] text-muted-foreground/40">
          {timeAgo(summary.created_at)}
        </span>
      </div>

      {/* Title */}
      <h2 className="pt-2 pb-2 text-sm font-semibold leading-snug text-foreground">
        {summary.newsletter_title}
      </h2>

      {/* Action icons below title — LinkedIn, X, share */}
      <div className="pb-3 flex items-center gap-0.5 justify-end">
        <button
          onClick={() => onGenerate(summary.id, "linkedin")}
          title={
            posts.linkedin || summary.linkedin_post
              ? "LinkedIn post ready"
              : "Draft LinkedIn post"
          }
          className={`p-1 rounded transition-colors ${posts.linkedin || summary.linkedin_post ? "text-[#0A66C2]" : "text-muted-foreground/60 hover:text-[#0A66C2]/70"}`}
        >
          <Linkedin className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onGenerate(summary.id, "twitter")}
          title={
            posts.twitter || summary.twitter_post
              ? "X post ready"
              : "Draft X post"
          }
          className={`p-1 rounded transition-colors ${posts.twitter || summary.twitter_post ? "text-foreground/70" : "text-muted-foreground/60 hover:text-foreground/80"}`}
        >
          <XIcon className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onShare(summary.id)}
          title="Copy share link"
          className={`p-1 rounded transition-colors ${copying === `share-${summary.id}` ? "text-primary" : "text-muted-foreground/60 hover:text-primary/80"}`}
        >
          {copying === `share-${summary.id}` ? (
            <CheckCircle2 className="w-3.5 h-3.5" />
          ) : (
            <Share2 className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      <div className="space-y-4">
        {summary.summary && (
          <p className="text-sm text-foreground leading-relaxed">
            {summary.summary}
          </p>
        )}

        {summary.key_points?.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
              What changed
            </p>
            <ul className="space-y-2">
              {summary.key_points.map((point, i) => (
                <li key={i} className="flex gap-2.5 text-sm">
                  <span className="text-primary mt-0.5 flex-shrink-0 text-xs">
                    ▸
                  </span>
                  <span className="text-foreground/85">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {summary.why_it_matters && (
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
              Why it matters
            </p>
            <p className="text-sm text-foreground/85 leading-relaxed">
              {summary.why_it_matters}
            </p>
          </div>
        )}

        {summary.what_to_do && (
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
              What to do
            </p>
            <p className="text-sm text-foreground/85 leading-relaxed">
              {summary.what_to_do}
            </p>
          </div>
        )}

        {summary.simple_explanation && (
          <p className="text-xs text-foreground/70 leading-relaxed border-l-2 border-border pl-3">
            {summary.simple_explanation}
          </p>
        )}

        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-[10px] text-muted-foreground">
            {formatDate(summary.created_at)}
          </p>
          <div className="flex items-center gap-3">
            {sourceHref && (
              <a
                href={sourceHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                Read article
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={() => onFlag(summary.id)}
              title={isFlagged ? "Flagged as inaccurate" : "Flag as inaccurate"}
              className={`inline-flex items-center gap-1 text-xs transition-colors ${isFlagged ? "text-red-500" : "text-muted-foreground/70 hover:text-red-600"}`}
            >
              <ThumbsDown className="w-3.5 h-3.5" />
              {isFlagged ? "Flagged" : "Inaccurate?"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 bg-secondary/20 rounded-lg px-3 py-3 space-y-3">
        <button
          onClick={() => setSocialOpen((o) => !o)}
          className="flex items-center justify-between w-full group"
        >
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            What to share
          </p>
          <ChevronDown
            className={`w-3.5 h-3.5 text-muted-foreground/50 transition-transform duration-200 ${socialOpen ? "rotate-180" : ""}`}
          />
        </button>
        {socialOpen && (
          <div className="flex flex-col sm:flex-row gap-3 items-start">
            <div className="w-full sm:flex-1">
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
            </div>
            <div className="w-full sm:flex-1">
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
        )}
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Dashboard page
// ---------------------------------------------------------------------------
export default function Dashboard() {
  const { isLoaded } = useUser();
  const ph = usePostHog();

  // ── Data ──────────────────────────────────────────────────────────────────
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [summariesLoadError, setSummariesLoadError] = useState(false);
  const [trends, setTrends] = useState<Record<string, TopicTrend>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false); // importing via SSE
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [scanning, setScanning] = useState(false); // scan phase
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncErrorCode, setSyncErrorCode] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);
  // Summary id whose share link was copied but never published.
  const [shareError, setShareError] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showDigestOptIn, setShowDigestOptIn] = useState(false);

  // ── Scan / selection modal state ──────────────────────────────────────────
  const [scanResult, setScanResult] = useState<EmailPreview[] | null>(null);
  const [isFirstScan, setIsFirstScan] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [blockedInModal, setBlockedInModal] = useState<Set<string>>(new Set());

  // ── Per-card state ────────────────────────────────────────────────────────
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const [read, setRead] = useState<Set<string>>(new Set());
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
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
  const [dateFilter, setDateFilter] = useState<DateFilter>("7d");
  const [panelTopic, setPanelTopic] = useState<string | null>(null);
  const [connectingGmail, setConnectingGmail] = useState(false);

  // Opening a topic panel shows its stories' content immediately and marks
  // them read — there's no separate collapse/expand step to click through.
  const openTopicPanel = useCallback(
    (topicKey: string, articleIds: string[]) => {
      setPanelTopic(topicKey);
      const newlyRead = articleIds.filter((id) => !read.has(id));
      if (newlyRead.length > 0) {
        setRead((prev) => new Set([...prev, ...newlyRead]));
        newlyRead.forEach((id) => {
          const s = summaries.find((x) => x.id === id);
          ph?.capture("article_expanded", {
            category: s?.category,
            source: s?.source_email,
          });
          // Marking-as-read on expand is low stakes; don't yank the user to
          // /sign-in mid-scroll for it, just don't pretend it persisted.
          void apiPost("/api/update-summary", { id, is_read: true }).then(
            (res) => {
              if (!res.ok)
                setRead((cur) => {
                  const back = new Set(cur);
                  back.delete(id);
                  return back;
                });
            },
          );
        });
      }
    },
    [read, summaries, ph],
  );
  const [showDismissedPanel, setShowDismissedPanel] = useState(false);
  const [dismissedCount, setDismissedCount] = useState(0);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedAnimating, setAdvancedAnimating] = useState(false);
  const [digestState, setDigestState] = useState<
    "idle" | "loading" | "sent" | "empty" | "error"
  >("idle");
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  useEffect(() => setPageInput(String(page)), [page]);
  const PER_PAGE = 20;
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(),
  );
  const toggleSection = useCallback((key: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const searchRef = useRef<HTMLInputElement>(null);
  const scanAbortRef = useRef<AbortController | null>(null);

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
    const t = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!summaries.length) return;
    setBookmarked(
      new Set(summaries.filter((s) => s.is_bookmarked).map((s) => s.id)),
    );
    setRead(new Set(summaries.filter((s) => s.is_read).map((s) => s.id)));
    setFlagged(
      new Set(
        summaries
          .filter((s) => (s as { is_flagged?: boolean }).is_flagged)
          .map((s) => s.id),
      ),
    );
  }, [summaries]);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchSummaries = useCallback(async () => {
    try {
      const res = await fetch("/api/summaries", { cache: "no-store" });
      // A non-2xx response (e.g. a transient 401 while a brand-new session
      // is still settling) still parses as valid JSON — { error: "..." } —
      // which would otherwise silently coerce to an empty summaries array
      // via the `?? []` fallback below, indistinguishable from "this user
      // genuinely has zero stories." That previously sent users straight to
      // the onboarding/scan screen even right after a successful import.
      // Bail out without touching `summaries` state at all so a transient
      // failure can't stomp real data with a false empty state.
      if (!res.ok) {
        console.error("[fetchSummaries] failed:", res.status);
        setSummariesLoadError(true);
        return;
      }
      const data = await res.json();
      const rawSummaries: Summary[] = Array.isArray(data)
        ? data
        : (data.summaries ?? []);
      // Supabase returns timestamps without a timezone suffix — append Z so
      // JavaScript parses them as UTC instead of local time.
      const normalized = rawSummaries.map((s) => ({
        ...s,
        created_at:
          s.created_at &&
          !s.created_at.endsWith("Z") &&
          !s.created_at.includes("+")
            ? s.created_at + "Z"
            : s.created_at,
      }));
      setSummariesLoadError(false);
      setSummaries(normalized);
      setTrends(Array.isArray(data) ? {} : (data.trends ?? {}));
    } catch (err) {
      console.error("[fetchSummaries] failed:", err);
      setSummariesLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummaries().then(() => {
      // After summaries load, check if user has opted in to digest.
      // If not (including "Maybe later" dismissals), re-show the toast.
      fetch("/api/digest/enable")
        .then((r) => r.json())
        .then((data) => {
          if (!data.digestEnabled && data.hasSummaries) {
            setTimeout(() => setShowDigestOptIn(true), 1500);
          }
        })
        .catch(() => {});
    });
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((d) => {
        setGmailConnected(d.connected);
        if (d.lastSyncedAt)
          setLastSynced(
            new Date(
              d.lastSyncedAt + (d.lastSyncedAt.endsWith("Z") ? "" : "Z"),
            ),
          );
      })
      .catch(() => setGmailConnected(false));
    fetch("/api/dismiss")
      .then((r) => r.json())
      .then((d) => setDismissedCount((d.emails ?? []).length))
      .catch(() => {});
  }, [fetchSummaries]);

  // Surfaces the Gmail OAuth callback's redirect result (?error=... /
  // ?gmail=connected) via the same sync-error overlay used elsewhere, since
  // nothing previously read these query params at all — a failed or
  // partially-granted connection landed the user back here with no visible
  // feedback whatsoever. Strips the param so a refresh doesn't re-trigger it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error");
    if (oauthError === "gmail_scope_missing") {
      setSyncError(
        "Gmail wasn't fully connected — the Gmail permission wasn't granted during sign-in. Please reconnect and make sure to approve Gmail access.",
      );
      setSyncErrorCode("reconnect_required");
    } else if (oauthError === "oauth_failed") {
      setSyncError("Connecting Gmail didn't go through. Please try again.");
      setSyncErrorCode(null);
    }
    if (oauthError || params.get("gmail")) {
      params.delete("error");
      params.delete("gmail");
      const rest = params.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${rest ? `?${rest}` : ""}`,
      );
    }
  }, []);

  // ── Scan phase (opens selection modal) ────────────────────────────────────
  const handleSendDigest = async () => {
    setDigestState("loading");
    try {
      const res = await fetch("/api/digest", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        console.error("[digest]", data.error);
        setDigestState("error");
        setTimeout(() => setDigestState("idle"), 3500);
        return;
      }
      const next = data.sent ? "sent" : "empty";
      // digest_sent is now captured server-side (app/api/digest/route.ts),
      // so it fires consistently whether or not this dev-only button is the
      // one that triggered the send.
      setDigestState(next);
      setTimeout(() => setDigestState("idle"), 3500);
    } catch (e) {
      console.error("[digest]", e);
      setDigestState("error");
      setTimeout(() => setDigestState("idle"), 3500);
    }
  };

  const handleScan = async () => {
    const controller = new AbortController();
    scanAbortRef.current = controller;

    setScanning(true);
    setSyncError(null);
    setSyncErrorCode(null);
    setSyncStats(null);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        signal: controller.signal,
      });
      const data = await readJsonResponse<ScanResponse>(res);

      if (!res.ok) {
        setSyncError(data?.error ?? `Scan failed with status ${res.status}`);
        setSyncErrorCode(data?.code ?? null);
        return;
      }

      if (!data) {
        setSyncError(
          "Scan failed because the server returned an empty response.",
        );
        return;
      }

      if (data.error) {
        setSyncError(data.error);
        setSyncErrorCode(data.code ?? null);
        return;
      }

      const newsletters: EmailPreview[] = data.newsletters ?? [];
      setIsFirstScan(data.isFirstSync ?? false);

      if (newsletters.length === 0) {
        setSyncStats({
          processedCount: 0,
          skippedCount: 0,
          deletedCount: 0,
          nothingNew: true,
          firstScan: data.isFirstSync ?? false,
        });
        return;
      }

      setScanResult(newsletters);
      setSelectedIds(
        new Set(
          newsletters.filter((n) => !shouldFlagEmail(n)).map((n) => n.id),
        ),
      );
      setBlockedInModal(new Set());
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setSyncError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
      scanAbortRef.current = null;
    }
  };

  // ── Import phase (SSE stream for selected emails) ─────────────────────────
  const handleImport = async (emailIds: string[]) => {
    const isFirstEver = summaries.length === 0;
    // Dismiss only flagged emails — they were never newsletters.
    // Deselected newsletter-tab items are kept so they reappear on the next scan.
    const unselected = (scanResult ?? [])
      .filter((n) => shouldFlagEmail(n) && !emailIds.includes(n.id))
      .map((n) => ({
        id: n.id,
        fromName: n.fromName,
        fromEmail: n.fromEmail,
        subject: n.subject,
      }));
    if (unselected.length) {
      fetch("/api/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: unselected }),
      })
        .then(() => fetch("/api/dismiss"))
        .then((r) => r.json())
        .then((d) => setDismissedCount((d.emails ?? []).length))
        .catch(() => {});
    }

    setScanResult(null);

    // Fire block requests for any domains the user blocked in the modal
    blockedInModal.forEach((domain) => {
      fetch("/api/block-sender", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      }).catch(() => {});
    });

    if (emailIds.length === 0) return;

    setSyncing(true);
    setSyncError(null);
    setSyncErrorCode(null);
    setSyncProgress(null);

    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailIds }),
      });
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
              setSyncProgress({
                current: 0,
                total: data.total,
                title: "Starting…",
              });
            } else if (data.type === "progress") {
              setSyncProgress({
                current: data.current,
                total: data.total,
                title: data.title,
              });
            } else if (data.type === "complete") {
              const processedCount = data.processedCount ?? 0;
              setSyncStats({
                processedCount,
                skippedCount: data.skippedCount ?? 0,
                deletedCount: data.deletedCount ?? 0,
              });
              ph?.capture("newsletter_synced", {
                count: processedCount,
                skipped: data.skippedCount ?? 0,
              });
              setSyncProgress(null);
              await fetchSummaries();
              if (processedCount > 0) {
                if (isFirstEver) {
                  setTimeout(() => setShowDigestOptIn(true), 1500);
                } else {
                  setTimeout(() => setShowFeedback(true), 3000);
                }
              }
            } else if (data.type === "error") {
              setSyncError(data.message);
              setSyncErrorCode(data.code ?? null);
            }
          } catch {
            // skip malformed SSE line
          }
        }
      }
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setSyncing(false);
      setSyncProgress(null);
      setLastSynced(new Date());
    }
  };

  // ── Modal actions ─────────────────────────────────────────────────────────
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleToggleAll = () => {
    if (!scanResult) return;
    const visible = scanResult.filter(
      (n) => !shouldFlagEmail(n) && !blockedInModal.has(n.domain),
    );
    const allSelected = visible.every((n) => selectedIds.has(n.id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visible.forEach((n) => next.delete(n.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visible.forEach((n) => next.add(n.id));
        return next;
      });
    }
  };

  const handleBlockInModal = (domain: string) => {
    setBlockedInModal((prev) => new Set([...prev, domain]));
    // Deselect all emails from this domain
    if (scanResult) {
      const domainIds = scanResult
        .filter((n) => n.domain === domain)
        .map((n) => n.id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        domainIds.forEach((id) => next.delete(id));
        return next;
      });
    }
  };

  // ── Card actions ──────────────────────────────────────────────────────────

  // Every bookmark/read toggle is optimistic. Previously they were also
  // fire-and-forget (`.catch(() => {})`), so a rejected write left the UI
  // asserting something the database never recorded — most commonly after the
  // Clerk session expired, where the middleware answers with a redirect to
  // /sign-in and fetch's followed 200 made the failure invisible. apiPost
  // reports that case as `unauthenticated` rather than success.
  const persistSummary = useCallback(
    async (
      id: string,
      updates: Record<string, boolean>,
      revert: () => void,
    ): Promise<void> => {
      const res = await apiPost("/api/update-summary", { id, ...updates });
      if (res.ok) return;

      revert();
      // Nothing else on this page will work either — send them to re-auth
      // rather than let them keep clicking into a dead session.
      if (res.reason === "unauthenticated") window.location.href = "/sign-in";
    },
    [],
  );

  const handleToggleRead = useCallback(
    (id: string) => {
      setRead((prev) => {
        const next = new Set(prev);
        const nowRead = !next.has(id);
        nowRead ? next.add(id) : next.delete(id);
        void persistSummary(id, { is_read: nowRead }, () =>
          setRead((cur) => {
            const back = new Set(cur);
            nowRead ? back.delete(id) : back.add(id);
            return back;
          }),
        );
        return next;
      });
    },
    [persistSummary],
  );

  const handleToggleBookmark = useCallback(
    (id: string) => {
      setBookmarked((prev) => {
        const next = new Set(prev);
        const newVal = !next.has(id);
        newVal ? next.add(id) : next.delete(id);
        if (newVal) {
          const s = summaries.find((x) => x.id === id);
          ph?.capture("article_bookmarked", {
            source: s?.source_email,
            category: s?.category,
          });
        }
        void persistSummary(id, { is_bookmarked: newVal }, () =>
          setBookmarked((cur) => {
            const back = new Set(cur);
            newVal ? back.delete(id) : back.add(id);
            return back;
          }),
        );
        return next;
      });
    },
    [summaries, ph, persistSummary],
  );

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
        const s = summaries.find((x) => x.id === summaryId);
        ph?.capture("social_post_generated", {
          platform,
          source: s?.source_email,
        });
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

  // Flips is_public so /share/[id] will serve the row. Extracted so the
  // error toast's Retry can re-run exactly the request that failed.
  const publishSummary = useCallback(async (id: string): Promise<boolean> => {
    const res = await apiPost<{ ok?: boolean }>("/api/update-summary", {
      id,
      is_public: true,
    });
    return res.ok && res.data?.ok === true;
  }, []);

  // Summaries are private until shared — /share/[id] only serves rows with
  // is_public set. Copy the link immediately (clipboard writes must happen in
  // the click's user gesture, not after an await), then publish.
  //
  // The copy and the publish can therefore disagree: if publishing fails the
  // user is holding a link that 404s for whoever they send it to. Surface that
  // rather than let them find out from the recipient.
  const handleShare = useCallback(
    async (id: string) => {
      const url = `${window.location.origin}/share/${id}`;
      navigator.clipboard.writeText(url).catch(() => {});
      setCopying(`share-${id}`);
      setTimeout(() => setCopying(null), 2000);
      ph?.capture("article_shared");

      if (!(await publishSummary(id))) {
        setCopying(null);
        setShareError(id);
      }
    },
    [ph, publishSummary],
  );

  // Revokes the grant with Google server-side, not just locally — the point is
  // that Pidgin actually loses inbox access, not that it stops asking.
  const handleDisconnect = useCallback(async () => {
    setDisconnecting(true);
    setDisconnectError(null);
    try {
      const res = await fetch("/api/auth/google", { method: "DELETE" });
      if (!res.ok) throw new Error("disconnect failed");
      ph?.capture("gmail_disconnected");
      setGmailConnected(false);
      setConfirmDisconnect(false);
    } catch {
      // Keep the dialog open and say so inline, rather than dismissing it and
      // leaving the user unsure whether Gmail is still connected.
      setDisconnectError("Could not disconnect Gmail. Please try again.");
    } finally {
      setDisconnecting(false);
    }
  }, [ph]);

  const handleFlag = useCallback(
    (id: string) => {
      setFlagged((prev) => {
        const next = new Set(prev);
        const flagging = !next.has(id);
        flagging ? next.add(id) : next.delete(id);
        if (flagging) ph?.capture("article_flagged");
        fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ summaryId: id, reason: "inaccurate" }),
        }).catch(() => {});
        return next;
      });
    },
    [ph],
  );

  // ── Derived data ──────────────────────────────────────────────────────────
  const uniqueSources = useMemo(
    () =>
      Array.from(
        new Set(summaries.map((s) => extractSenderName(s.source_email))),
      ).sort(),
    [summaries],
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
          extractSenderName(s.source_email).toLowerCase().includes(q),
      );
    }

    if (activeCategory !== "All") {
      result = result.filter((s) => (s.category || "Other") === activeCategory);
    }

    if (activeSource !== "All") {
      result = result.filter(
        (s) => extractSenderName(s.source_email) === activeSource,
      );
    }

    const cutoff = dateFilterCutoff(dateFilter);
    if (cutoff) {
      result = result.filter((s) => new Date(s.created_at) >= cutoff);
    }

    if (bookmarkedOnly) {
      result = result.filter((s) => bookmarked.has(s.id));
    }

    if (unreadOnly) {
      result = result.filter((s) => !read.has(s.id));
    }

    return [...result].sort((a, b) => {
      if (sortBy === "oldest")
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      if (sortBy === "source")
        return extractSenderName(a.source_email).localeCompare(
          extractSenderName(b.source_email),
        );
      if (sortBy === "category")
        return (a.category || "Other").localeCompare(b.category || "Other");
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, [
    summaries,
    searchQuery,
    activeCategory,
    activeSource,
    dateFilter,
    bookmarkedOnly,
    unreadOnly,
    sortBy,
    bookmarked,
    read,
  ]);

  const topicGroups = useMemo(() => {
    const groups = groupSummariesByTopic(filteredSummaries);
    // "Morning surprise": when sorted by recency, pin recurring topics
    // (trend memory) near the top rather than letting them get buried
    // chronologically among one-off stories.
    if (sortBy !== "newest") return groups;
    return [...groups].sort((a, b) => {
      const aRecurring = (trends[a.topicKey]?.weeksSeenCount ?? 0) >= 2;
      const bRecurring = (trends[b.topicKey]?.weeksSeenCount ?? 0) >= 2;
      if (aRecurring !== bRecurring) return aRecurring ? -1 : 1;
      return b.date > a.date ? 1 : b.date < a.date ? -1 : 0;
    });
  }, [filteredSummaries, sortBy, trends]);

  // Splits topicGroups into a curated "brief" shape — Top stories / Trending
  // / everything else — instead of one flat ranked list. Counts are flexible
  // (not a fixed 3/1/N): a quiet day may have 0 top stories, a big day may
  // have several. Only applies in the default recency sort; other explicit
  // sort choices (by source/category/oldest) show the plain flat list.
  const { topStories, trendingOnly, remainingGroups } = useMemo(() => {
    if (sortBy !== "newest") {
      return {
        topStories: [] as TopicGroup[],
        trendingOnly: [] as TopicGroup[],
        remainingGroups: topicGroups,
      };
    }

    const scored = topicGroups.map((group) => ({
      group,
      score: topicImportanceScore(group, trends[group.topicKey]),
      recurring: (trends[group.topicKey]?.weeksSeenCount ?? 0) >= 2,
    }));

    const top = [...scored]
      .sort((a, b) => b.score - a.score)
      .filter((s) => s.score >= 8)
      .slice(0, 8)
      .map((s) => s.group);
    const topKeys = new Set(top.map((g) => g.topicKey));

    const trending = scored
      .filter((s) => s.recurring && !topKeys.has(s.group.topicKey))
      .map((s) => s.group);
    const trendingKeys = new Set(trending.map((g) => g.topicKey));

    const remaining = topicGroups.filter(
      (g) => !topKeys.has(g.topicKey) && !trendingKeys.has(g.topicKey),
    );

    return {
      topStories: top,
      trendingOnly: trending,
      remainingGroups: remaining,
    };
  }, [topicGroups, trends, sortBy]);

  const unreadCount = useMemo(
    () => summaries.filter((s) => !read.has(s.id)).length,
    [summaries, read],
  );

  const metrics = useMemo(() => {
    const liReady = summaries.filter(
      (s) => s.linkedin_post || generatedPosts[s.id]?.linkedin,
    ).length;
    const twReady = summaries.filter(
      (s) => s.twitter_post || generatedPosts[s.id]?.twitter,
    ).length;
    // Distinct topics currently recurring across weeks — reinforces the
    // brief's positioning (what keeps coming back) instead of a static
    // newsletter-sender inventory count.
    const trendingTopics = new Set(
      summaries
        .map((s) => s.topic_key)
        .filter(
          (k): k is string =>
            k != null && (trends[k]?.weeksSeenCount ?? 0) >= 2,
        ),
    );
    return {
      total: summaries.length,
      liReady,
      twReady,
      trending: trendingTopics.size,
      bookmarkedCount: bookmarked.size,
    };
  }, [summaries, generatedPosts, bookmarked, trends]);

  const hasActiveFilters =
    searchQuery ||
    activeCategory !== "All" ||
    activeSource !== "All" ||
    dateFilter !== "7d" ||
    sortBy !== "newest" ||
    bookmarkedOnly ||
    unreadOnly;

  const clearFilters = () => {
    setSearchInput("");
    setSearchQuery("");
    setActiveCategory("All");
    setActiveSource("All");
    setDateFilter("7d");
    setSortBy("newest");
    setBookmarkedOnly(false);
    setUnreadOnly(false);
    setShowAdvanced(false);
    setPage(1);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (!isLoaded) return <div className="min-h-screen bg-background" />;

  // Disconnecting Gmail stops new syncs; it doesn't destroy what's already
  // been collected. So "no Gmail" alone shouldn't send someone back to the
  // onboarding screen and hide a dashboard full of their own summaries — only
  // "no Gmail and nothing to show" should. Someone who disconnected keeps
  // reading their archive behind a reconnect banner.
  //
  // Gated on !loading so the decision isn't made before summaries have
  // arrived, which would flash onboarding at a returning disconnected user.
  const hasHistory = summaries.length > 0;
  const isDisconnected = gmailConnected === false;
  const showOnboarding = isDisconnected && !loading && !hasHistory;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Selection modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {scanResult !== null && (
          <NewsletterSelectionModal
            key="selection-modal"
            newsletters={scanResult}
            isFirstSync={isFirstScan}
            selectedIds={selectedIds}
            blockedDomains={blockedInModal}
            onToggleSelect={handleToggleSelect}
            onToggleAll={handleToggleAll}
            onBlockDomain={handleBlockInModal}
            onImport={() => {
              const ids = [...selectedIds].filter(
                (id) =>
                  !scanResult.find(
                    (n) => n.id === id && blockedInModal.has(n.domain),
                  ),
              );
              handleImport(ids);
            }}
            onClose={() => setScanResult(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Sync / import overlay ────────────────────────────────────────── */}
      <AnimatePresence>
        {(scanning || syncing || !!syncStats || !!syncError) &&
          scanResult === null && (
            <SyncOverlay
              key="sync-overlay"
              scanning={scanning}
              importing={syncing}
              progress={syncProgress}
              stats={syncStats}
              error={syncError}
              errorCode={syncErrorCode}
              onDismiss={() => {
                setSyncStats(null);
                setSyncError(null);
                setSyncErrorCode(null);
              }}
              onCancel={() => {
                scanAbortRef.current?.abort();
              }}
            />
          )}
      </AnimatePresence>

      {/* ── Feedback toast ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showFeedback && (
          <FeedbackToast
            key="feedback-toast"
            onDone={() => setShowFeedback(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Digest opt-in toast (first sync only) ──────────────────────────── */}
      <AnimatePresence>
        {showDigestOptIn && (
          <DigestOptInToast
            key="digest-optin-toast"
            onEnabled={() => setShowDigestOptIn(false)}
            onDismiss={() => setShowDigestOptIn(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Dismissed emails panel ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showDismissedPanel && (
          <DismissedEmailsPanel
            key="dismissed-panel"
            onClose={() => setShowDismissedPanel(false)}
            onCountChange={setDismissedCount}
          />
        )}
      </AnimatePresence>

      {/* ── Topic panel ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {panelTopic && (
          <TopicPanel
            key="topic-panel"
            topicKey={panelTopic}
            summaries={summaries}
            trend={trends[panelTopic]}
            onClose={() => setPanelTopic(null)}
            isBookmarked={(id) => bookmarked.has(id)}
            isRead={(id) => read.has(id)}
            isFlagged={(id: string) => flagged.has(id)}
            generatedPosts={generatedPosts}
            generating={generating}
            copying={copying}
            onToggleBookmark={handleToggleBookmark}
            onToggleRead={handleToggleRead}
            onGenerate={handleGenerate}
            onCopy={handleCopy}
            onBlock={handleBlock}
            onShare={handleShare}
            onFlag={handleFlag}
          />
        )}
      </AnimatePresence>

      {/* ── Disconnect confirmation ────────────────────────────────────────── */}
      <AnimatePresence>
        {confirmDisconnect && (
          <ConfirmDialog
            key="confirm-disconnect"
            destructive
            title="Disconnect Gmail?"
            confirmLabel="Disconnect"
            busyLabel="Disconnecting…"
            icon={<Unplug className="w-4 h-4" />}
            busy={disconnecting}
            onCancel={() => setConfirmDisconnect(false)}
            onConfirm={handleDisconnect}
            body={
              <>
                <p>
                  Pidgin will immediately lose access to your inbox, and no new
                  stories will sync.
                </p>
                <p className="mt-1.5">
                  Your saved summaries stay in your dashboard. You can reconnect
                  at any time.
                </p>
                {disconnectError && (
                  <p className="mt-2.5 text-red-400 font-medium">
                    {disconnectError}
                  </p>
                )}
              </>
            }
          />
        )}
      </AnimatePresence>

      {/* ── Share publish failure ──────────────────────────────────────────── */}
      <AnimatePresence>
        {shareError && (
          <ShareErrorToast
            key="share-error"
            onRetry={() => publishSummary(shareError)}
            onDismiss={() => setShareError(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pidgin-main.png" alt="Pidgin" className="w-7 h-7" />
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <CustomUserButton />
            </div>
          </div>
        </div>
      </header>

      {/* ── Onboarding (Gmail never connected, nothing to show) ──────────── */}
      {showOnboarding && (
        <main className="min-h-[calc(100vh-57px)] flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-md">
            <div className="rounded-2xl border border-border bg-card p-8 shadow-xl shadow-black/20 space-y-7">
              <div className="text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                  <Mail className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold tracking-tight">
                    Here&apos;s what changed while you were building.
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                    Pidgin reads your newsletters and ranks what actually
                    matters — a daily brief of what changed, why it matters, and
                    what to do about it.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
                  How it works
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/40">
                    <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium">Create your account</p>
                      <p className="text-[11px] text-muted-foreground">
                        Done — you&apos;re signed in
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <Mail className="w-2.5 h-2.5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-primary">
                        Connect your Gmail
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Grant read-only access — takes 30 seconds
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg opacity-40">
                    <div className="w-5 h-5 rounded-full border border-border flex items-center justify-center flex-shrink-0">
                      <Inbox className="w-2.5 h-2.5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs font-medium">Pick &amp; import</p>
                      <p className="text-[11px] text-muted-foreground">
                        Choose which newsletters to bring in
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  className="w-full gap-2 h-10 text-sm font-medium"
                  disabled={connectingGmail}
                  onClick={() => {
                    setConnectingGmail(true);
                    window.location.href = "/api/auth/google";
                  }}
                >
                  {connectingGmail ? (
                    <>
                      <Spinner />
                      Connecting…
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Connect Gmail
                      <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-60" />
                    </>
                  )}
                </Button>
                <p className="text-center text-[11px] text-muted-foreground leading-relaxed">
                  Read-only access. We never send, delete, or modify your email.
                  <br />
                  Your data stays private and is only used to generate your
                  brief.
                </p>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* ── Dashboard (connected, loading, or disconnected-with-history) ──── */}
      {!showOnboarding && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 space-y-6">
          {/* Only reachable after an explicit disconnect — the archive is
              still readable, but nothing new will arrive until they reconnect. */}
          {isDisconnected && hasHistory && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Unplug className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <p className="text-sm text-foreground/80">
                  Gmail is disconnected. Your saved summaries are still here.
                  Reconnect to sync new stories.
                </p>
              </div>
              <Button
                size="sm"
                disabled={connectingGmail}
                onClick={() => {
                  setConnectingGmail(true);
                  window.location.href = "/api/auth/google";
                }}
                className="gap-1.5 h-8"
              >
                {connectingGmail ? (
                  <>
                    <Spinner className="w-3.5 h-3.5 border" /> Connecting…
                  </>
                ) : (
                  <>
                    <Mail className="w-3.5 h-3.5" /> Reconnect Gmail
                  </>
                )}
              </Button>
            </div>
          )}

          {/* ── Hero greeting ──────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative flex flex-wrap items-end justify-between gap-4 pt-4 pb-2"
          >
            {/* subtle glow orb */}
            <div
              className="absolute -top-4 -left-8 w-72 h-40 rounded-full pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at top left, hsl(var(--primary)/0.12), transparent 70%)",
                filter: "blur(32px)",
              }}
              aria-hidden
            />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                {getGreeting()}, pidginite.
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                {unreadCount > 0
                  ? `${unreadCount} unread · ${metrics.total} stor${metrics.total !== 1 ? "ies" : "y"} in your brief`
                  : metrics.total > 0
                    ? `All caught up · ${metrics.total} article${metrics.total !== 1 ? "s" : ""} in your digest`
                    : "Your inbox is empty — sync to get started."}
              </p>
              {lastSynced && (
                <p className="text-xs text-muted-foreground/40 mt-1">
                  Last synced{" "}
                  {lastSynced.toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
            {gmailConnected === true && (
              <div className="flex items-center gap-2">
                {/* Dev-only debugging tool — manual "send digest now" doesn't
                    fit the product's automatic-delivery pitch, kept for
                    testing but hidden from real users. */}
                {summaries.length > 0 &&
                  process.env.NODE_ENV === "development" && (
                    <button
                      onClick={handleSendDigest}
                      disabled={digestState === "loading"}
                      title="Email me today's digest"
                      className={`h-9 px-3.5 rounded-full border text-sm font-medium flex items-center gap-1.5 transition-all ${
                        digestState === "sent"
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                          : digestState === "error"
                            ? "border-red-500/40 bg-red-500/10 text-red-400"
                            : digestState === "empty"
                              ? "border-border bg-secondary/40 text-muted-foreground"
                              : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground hover:border-border/80"
                      }`}
                    >
                      {digestState === "loading" ? (
                        <>
                          <Spinner className="w-3.5 h-3.5 border" /> Sending…
                        </>
                      ) : digestState === "sent" ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Digest sent
                        </>
                      ) : digestState === "error" ? (
                        <>Failed — check console</>
                      ) : digestState === "empty" ? (
                        <>Nothing major today</>
                      ) : (
                        <>
                          <Mail className="w-3.5 h-3.5" /> Send digest
                        </>
                      )}
                    </button>
                  )}
                {/* Hidden until there's at least one story — before that,
                    OnboardingFlow owns the "start a scan" call-to-action, so
                    this would otherwise render as a second, redundant sync
                    button in the empty/first-time state. */}
                {summaries.length > 0 && (
                  <SyncButton
                    onScan={handleScan}
                    scanning={scanning}
                    disabled={loading || syncing}
                  />
                )}
                <button
                  onClick={() => {
                    setDisconnectError(null);
                    setConfirmDisconnect(true);
                  }}
                  title="Disconnect Gmail"
                  className="h-9 px-3.5 rounded-full border border-border bg-secondary/40 text-sm font-medium text-muted-foreground flex items-center gap-1.5 transition-all hover:text-red-400 hover:border-red-500/40"
                >
                  <Unplug className="w-3.5 h-3.5" />
                  Disconnect
                </button>
              </div>
            )}
          </motion.div>

          {/* ── Metrics ────────────────────────────────────────────────────── */}
          {summaries.length > 0 && (
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-stretch"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
            >
              {[
                <MetricTile
                  key="unread"
                  label="Unread"
                  value={unreadCount}
                  icon={<MailOpen className="w-4 h-4 text-primary" />}
                  sub={`of ${metrics.total} total`}
                />,
                <MetricTile
                  key="li"
                  label="LinkedIn posts"
                  value={metrics.liReady}
                  icon={<Linkedin className="w-4 h-4 text-[#0A66C2]" />}
                  sub="ready to publish"
                />,
                <MetricTile
                  key="x"
                  label="X posts"
                  value={metrics.twReady}
                  icon={<XIcon className="w-4 h-4 text-foreground" />}
                  sub="ready to publish"
                />,
                <MetricTile
                  key="trending"
                  label="Trending"
                  value={metrics.trending}
                  icon={<TrendingUp className="w-4 h-4 text-amber-400" />}
                  sub="topics recurring"
                />,
                <MetricTile
                  key="bm"
                  label="Bookmarked"
                  value={metrics.bookmarkedCount}
                  icon={<Bookmark className="w-4 h-4 text-amber-400" />}
                />,
              ].map((tile) => (
                <motion.div
                  key={tile.key}
                  className="h-full"
                  variants={{
                    hidden: { opacity: 0, y: 8 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.3, ease: "easeOut" },
                    },
                  }}
                >
                  {tile}
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* ── Filters ────────────────────────────────────────────────────── */}
          {summaries.length > 0 && (
            <div className="space-y-1.5">
              {/* Primary row: chips + icon controls */}
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5 overflow-x-auto flex-1 scrollbar-hide -mx-0.5 px-0.5 pb-0.5">
                  {CATEGORIES.map((cat) => {
                    const isActive = activeCategory === cat;
                    const count =
                      cat === "All"
                        ? summaries.length
                        : (categoryCounts[cat] ?? 0);
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
                        <span
                          className={`text-[10px] ${isActive ? "opacity-80" : "opacity-50"}`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Icon-only controls */}
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button
                    onClick={() => setUnreadOnly((v) => !v)}
                    title="Unread only"
                    className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                      unreadOnly
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground/50 hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    <MailOpen className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setBookmarkedOnly((v) => !v)}
                    title="Bookmarked only"
                    className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                      bookmarkedOnly
                        ? "bg-amber-500/15 text-amber-400"
                        : "text-muted-foreground/50 hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setShowAdvanced((v) => !v)}
                    title="More filters"
                    className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                      showAdvanced ||
                      activeSource !== "All" ||
                      dateFilter !== "7d" ||
                      sortBy !== "newest"
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground/50 hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </button>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      title="Clear all filters"
                      className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-secondary transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Advanced row — collapsible */}
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18, ease: "easeInOut" }}
                    onAnimationStart={() => setAdvancedAnimating(true)}
                    onAnimationComplete={() => setAdvancedAnimating(false)}
                    className={
                      advancedAnimating ? "overflow-hidden" : "overflow-visible"
                    }
                  >
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                        <Input
                          ref={searchRef}
                          value={searchInput}
                          onChange={(e) => setSearchInput(e.target.value)}
                          placeholder="Search…"
                          className="pl-6 pr-6 h-7 w-36 lg:w-52 text-xs bg-secondary/30 border-border/60 focus-visible:ring-1 focus-visible:ring-primary/60 focus-visible:ring-inset focus-visible:border-primary/60"
                        />
                        {searchInput && (
                          <button
                            onClick={() => setSearchInput("")}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <FilterSelect
                        value={activeSource}
                        onChange={setActiveSource}
                        options={[
                          { value: "All", label: "All sources" },
                          ...uniqueSources.map((s) => ({ value: s, label: s })),
                        ]}
                      />

                      <FilterSelect
                        value={dateFilter}
                        onChange={(v) => setDateFilter(v as DateFilter)}
                        options={[
                          { value: "7d", label: "Last 7 days" },
                          { value: "all", label: "All time" },
                        ]}
                      />

                      <FilterSelect
                        value={sortBy}
                        onChange={(v) => setSortBy(v as SortOption)}
                        options={[
                          { value: "newest", label: "Newest first" },
                          { value: "oldest", label: "Oldest first" },
                          { value: "source", label: "By source" },
                          { value: "category", label: "By category" },
                        ]}
                      />

                      {dismissedCount > 0 && (
                        <button
                          onClick={() => setShowDismissedPanel(true)}
                          className="h-7 flex items-center gap-1.5 px-2.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors border border-border/40"
                        >
                          <EyeOff className="w-3 h-3" />
                          Dismissed ({dismissedCount})
                        </button>
                      )}

                      {!loading && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          {topicGroups.length}{" "}
                          {topicGroups.length !== 1 ? "stories" : "story"}
                        </span>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ── Content ────────────────────────────────────────────────────── */}
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded-lg border border-border bg-card animate-pulse"
                />
              ))}
            </div>
          ) : summariesLoadError ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-4">
                <RefreshCw className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium mb-1">
                Couldn&apos;t load your brief
              </p>
              <p className="text-xs text-muted-foreground mb-4 max-w-xs">
                Something went wrong loading your stories — this doesn&apos;t
                mean you have none, we just couldn&apos;t check right now.
              </p>
              <button
                onClick={() => {
                  setLoading(true);
                  fetchSummaries();
                }}
                className="text-xs text-primary font-medium"
              >
                Try again
              </button>
            </div>
          ) : summaries.length === 0 && gmailConnected !== null ? (
            <OnboardingFlow
              gmailConnected={gmailConnected}
              onStartScan={handleScan}
              scanning={scanning}
            />
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
                className="mt-4 text-xs text-primary"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            (() => {
              const showSections =
                sortBy === "newest" &&
                (topStories.length > 0 || trendingOnly.length > 0);
              const baseForPagination = showSections
                ? remainingGroups
                : topicGroups;

              const totalPages = Math.ceil(baseForPagination.length / PER_PAGE);
              const paged = baseForPagination.slice(
                (page - 1) * PER_PAGE,
                page * PER_PAGE,
              );

              // Date headers ("TODAY"/"YESTERDAY") only make sense when
              // groups are chronologically ordered. For any other sort
              // (oldest first, by source, by category), the chosen order
              // isn't date-contiguous, so show one flat list instead of
              // fragmenting it into scattered mini date-sections.
              const useDateGrouping = sortBy === "newest";
              const dateGroups: { label: string; groups: TopicGroup[] }[] =
                useDateGrouping ? [] : [{ label: "", groups: paged }];
              if (useDateGrouping) {
                paged.forEach((g) => {
                  const label = dateSectionLabel(g.latestDate);
                  const last = dateGroups[dateGroups.length - 1];
                  if (last?.label === label) last.groups.push(g);
                  else dateGroups.push({ label, groups: [g] });
                });
              }

              const openPanel = (g: TopicGroup) =>
                openTopicPanel(
                  g.topicKey,
                  g.articles.map((a) => a.id),
                );

              return (
                <div className="space-y-6">
                  {showSections && topStories.length > 0 && (
                    <CollapsibleSection
                      label="Top stories"
                      labelClassName="text-primary"
                      collapsed={collapsedSections.has("top-stories")}
                      onToggle={() => toggleSection("top-stories")}
                    >
                      <TopStoryHero
                        group={topStories[0]}
                        trend={trends[topStories[0].topicKey]}
                        onOpen={() => openPanel(topStories[0])}
                      />
                      {topStories.length > 1 && (
                        <TopicCardGrid
                          groups={topStories.slice(1)}
                          trends={trends}
                          isRead={(id) => read.has(id)}
                          onOpen={openPanel}
                        />
                      )}
                    </CollapsibleSection>
                  )}

                  {showSections && trendingOnly.length > 0 && (
                    <CollapsibleSection
                      label="Trending"
                      labelClassName="text-amber-400"
                      collapsed={collapsedSections.has("trending")}
                      onToggle={() => toggleSection("trending")}
                    >
                      <TopicCardGrid
                        groups={trendingOnly}
                        trends={trends}
                        isRead={(id) => read.has(id)}
                        onOpen={openPanel}
                      />
                    </CollapsibleSection>
                  )}

                  {showSections && baseForPagination.length > 0 ? (
                    <CollapsibleSection
                      label="Everything else"
                      labelClassName="text-muted-foreground/50"
                      dividerBefore
                      collapsed={collapsedSections.has("everything-else")}
                      onToggle={() => toggleSection("everything-else")}
                    >
                      {dateGroups.map((dateGroup, i) =>
                        dateGroup.label ? (
                          <CollapsibleSection
                            key={dateGroup.label}
                            label={dateGroup.label}
                            labelClassName="text-muted-foreground/50"
                            showDivider={false}
                            collapsed={collapsedSections.has(
                              `date:${dateGroup.label}`,
                            )}
                            onToggle={() =>
                              toggleSection(`date:${dateGroup.label}`)
                            }
                          >
                            <TopicCardGrid
                              groups={dateGroup.groups}
                              trends={trends}
                              isRead={(id) => read.has(id)}
                              onOpen={openPanel}
                            />
                          </CollapsibleSection>
                        ) : (
                          <TopicCardGrid
                            key={i}
                            groups={dateGroup.groups}
                            trends={trends}
                            isRead={(id) => read.has(id)}
                            onOpen={openPanel}
                          />
                        ),
                      )}
                    </CollapsibleSection>
                  ) : (
                    dateGroups.map((dateGroup, i) => (
                      <TopicCardGrid
                        key={dateGroup.label || i}
                        groups={dateGroup.groups}
                        trends={trends}
                        isRead={(id) => read.has(id)}
                        onOpen={openPanel}
                      />
                    ))
                  )}
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-2 pb-4">
                      <button
                        disabled={page === 1}
                        onClick={() => {
                          setPage((p) => p - 1);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        aria-label="Previous page"
                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:border-border transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={pageInput}
                          onChange={(e) =>
                            setPageInput(e.target.value.replace(/[^0-9]/g, ""))
                          }
                          onBlur={() => setPageInput(String(page))}
                          onKeyDown={(e) => {
                            if (e.key !== "Enter") return;
                            const target = Math.min(
                              Math.max(parseInt(pageInput, 10) || 1, 1),
                              totalPages,
                            );
                            setPage(target);
                            setPageInput(String(target));
                            window.scrollTo({ top: 0, behavior: "smooth" });
                            e.currentTarget.blur();
                          }}
                          className="h-8 w-9 rounded-lg border border-border/60 bg-transparent text-center tabular-nums text-foreground focus:outline-none focus:border-primary/50"
                        />
                        <span className="tabular-nums">of {totalPages}</span>
                      </div>
                      <button
                        disabled={page === totalPages}
                        onClick={() => {
                          setPage((p) => p + 1);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        aria-label="Next page"
                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:border-border transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </main>
      )}
    </div>
  );
}
