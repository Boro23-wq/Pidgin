"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { usePostHog } from "posthog-js/react";
import {
  Search,
  RefreshCw,
  ArrowDownToLine,
  Download,
  Sparkles,
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
  ChevronUp,
  ChevronRight,
  Mail,
  MailOpen,
  Eye,
  EyeOff,
  SlidersHorizontal,
  LayoutGrid,
  Inbox,
  ThumbsDown,
  ThumbsUp,
  Share2,
  MessageSquare,
  CheckCheck,
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DigestSource {
  source_email: string;
  priority: number;
  enabled: boolean;
}

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
  is_bookmarked: boolean;
  is_read: boolean;
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
}

interface SyncProgress {
  current: number;
  total: number;
  title: string;
}

type ScanResponse = {
  error?: string;
  newsletters?: EmailPreview[];
  isFirstSync?: boolean;
};

type Platform = "linkedin" | "twitter";
type SortOption = "newest" | "oldest" | "source" | "category";
type DateFilter = "7d" | "all";

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
        <span className="w-4 h-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin flex-shrink-0" />
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
  onDismiss,
  onCancel,
}: {
  scanning: boolean;
  importing: boolean;
  progress: SyncProgress | null;
  stats: SyncStats | null;
  error: string | null;
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
            <button
              onClick={onDismiss}
              className="pl-[18px] text-xs text-primary font-medium"
            >
              Dismiss
            </button>
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
                No newsletters arrived yet today
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
              How's your digest looking?
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
// Digest opt-in toast (shown after first ever sync)
// ---------------------------------------------------------------------------
function DigestOptInToast({
  onSetup,
  onDismiss,
}: {
  onSetup: () => void;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.97 }}
      transition={{ type: "spring", damping: 28, stiffness: 380 }}
      className="fixed bottom-5 right-5 z-50 w-[300px] rounded-2xl border border-border bg-card shadow-2xl shadow-black/20 px-4 py-4"
    >
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
          Set up your daily digest — pick which newsletters to include and in
          what order.
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={onSetup}
            className="flex-1 h-9 rounded-xl bg-primary text-white text-xs font-semibold hover:brightness-110 transition-all"
          >
            Set up digest
          </button>
          <button
            onClick={onDismiss}
            className="h-9 px-3 rounded-xl text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Not now
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Digest setup modal
// ---------------------------------------------------------------------------
const MAX_DIGEST_SOURCES = 7;

function DigestSetupModal({
  onClose,
  onEnabled,
}: {
  onClose: () => void;
  onEnabled: () => void;
}) {
  const [sources, setSources] = useState<DigestSource[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    fetch("/api/digest/sources")
      .then((r) => r.json())
      .then((data) => {
        // Clamp: if saved state has more than MAX enabled (e.g. cap was raised/lowered),
        // disable everything past the limit so the UI starts in a valid state.
        let count = 0;
        const clamped = (data.sources ?? []).map((s: DigestSource) => {
          if (s.enabled && count < MAX_DIGEST_SOURCES) { count++; return s; }
          if (s.enabled) return { ...s, enabled: false };
          return s;
        });
        setSources(clamped);
      })
      .catch(() => setError("Failed to load your newsletters."))
      .finally(() => setLoadingData(false));
  }, []);

  const enabledCount = sources.filter((s) => s.enabled).length;

  const toggleEnabled = (email: string) => {
    setSources((prev) =>
      prev.map((s) => {
        if (s.source_email !== email) return s;
        if (!s.enabled && enabledCount >= MAX_DIGEST_SOURCES) return s;
        return { ...s, enabled: !s.enabled };
      }),
    );
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setSources((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next.map((s, i) => ({ ...s, priority: i }));
    });
  };

  const moveDown = (index: number) => {
    setSources((prev) => {
      if (index === prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next.map((s, i) => ({ ...s, priority: i }));
    });
  };

  const handleSave = async () => {
    if (enabledCount === 0 || saving) return;
    if (enabledCount > MAX_DIGEST_SOURCES) {
      setError(`Please select no more than ${MAX_DIGEST_SOURCES} sources.`);
      return;
    }
    setSaving(true);
    try {
      const res1 = await fetch("/api/digest/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources }),
      });
      if (!res1.ok) throw new Error("Failed to save");
      const res2 = await fetch("/api/digest/enable", { method: "POST" });
      if (!res2.ok) throw new Error("Failed to enable");
      onEnabled();
    } catch {
      setError("Something went wrong. Try again.");
      setSaving(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        className="relative z-10 w-full sm:max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl shadow-black/40 overflow-hidden flex flex-col max-h-[80vh]"
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "30%", opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3 flex-shrink-0">
          <div>
            <p className="text-sm font-semibold">Set up your daily digest</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose up to {MAX_DIGEST_SOURCES} sources and set their order in
              the email.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors mt-0.5 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {loadingData ? (
            <div className="flex items-center justify-center py-12">
              <span className="w-5 h-5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            </div>
          ) : error ? (
            <div className="px-5 py-6 text-sm text-red-400">{error}</div>
          ) : sources.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              No newsletters found. Sync your inbox first.
            </div>
          ) : (
            <>
              <div className="px-5 pt-3 pb-1 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest">
                  Sources
                </span>
                <span
                  className={`text-[11px] font-medium ${enabledCount >= MAX_DIGEST_SOURCES ? "text-amber-400" : "text-muted-foreground/60"}`}
                >
                  {enabledCount} / {MAX_DIGEST_SOURCES}
                </span>
              </div>
              <div className="divide-y divide-border">
                {sources.map((source, index) => (
                  <motion.div
                    key={source.source_email}
                    layout
                    transition={{ type: "spring", damping: 30, stiffness: 300 }}
                    className={`flex items-center gap-3 px-5 py-3 transition-opacity ${source.enabled ? "" : "opacity-45"}`}
                  >
                    <button
                      onClick={() => toggleEnabled(source.source_email)}
                      className={`w-4.5 h-4.5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                        source.enabled
                          ? "bg-primary border-primary"
                          : !source.enabled &&
                              enabledCount >= MAX_DIGEST_SOURCES
                            ? "border-border cursor-not-allowed"
                            : "border-border hover:border-primary/60"
                      }`}
                      style={{ width: 18, height: 18 }}
                    >
                      {source.enabled && (
                        <svg
                          className="w-2.5 h-2.5 text-white"
                          fill="none"
                          viewBox="0 0 12 12"
                        >
                          <path
                            d="M2 6l3 3 5-5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {extractSenderName(source.source_email)}
                      </p>
                      <p className="text-[11px] text-muted-foreground/50">
                        #{index + 1} in digest
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        className="p-1 rounded text-muted-foreground/40 hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveDown(index)}
                        disabled={index === sources.length - 1}
                        className="p-1 rounded text-muted-foreground/40 hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
              <p className="px-5 pb-4 pt-2 text-[11px] text-muted-foreground/40">
                Unchecked sources still appear in the app — just not in your
                email.
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        {!loadingData && sources.length > 0 && (
          <div className="px-5 py-4 border-t border-border flex items-center gap-3 flex-shrink-0">
            <button
              onClick={handleSave}
              disabled={enabledCount === 0 || saving}
              className="flex-1 h-10 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-40 hover:brightness-110 transition-all flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />{" "}
                  Saving…
                </>
              ) : (
                "Enable daily digest"
              )}
            </button>
            <button
              onClick={onClose}
              className="h-10 px-4 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Maybe later
            </button>
          </div>
        )}
      </motion.div>
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
        className="relative z-10 w-full sm:max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl shadow-black/40 overflow-hidden flex flex-col h-[60vh]"
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
                <>
                  <CheckCircle2 className="w-3 h-3 text-green-400" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copy
                </>
              )}
            </Button>
            {!isLi && (
              <a
                href={xShareUrl(post)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[11px] px-2 gap-1"
                >
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
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3" />
              Generate
            </>
          )}
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Newsletter grouping
// ---------------------------------------------------------------------------
interface SourceGroup {
  sourceEmail: string;
  senderName: string;
  latestDate: string;
  date: string; // YYYY-MM-DD of the email's actual received date
  articles: Summary[];
  categories: string[];
}

function groupSummariesBySource(summaries: Summary[]): SourceGroup[] {
  const map = new Map<string, SourceGroup>();
  for (const s of summaries) {
    // Key by (source + email issue) so each newsletter edition is its own card
    const key = `${s.source_email}::${s.source_email_id}`;
    const existing = map.get(key);
    if (existing) {
      existing.articles.push(s);
      if (s.created_at > existing.latestDate)
        existing.latestDate = s.created_at;
      const cat = s.category || "Other";
      if (!existing.categories.includes(cat)) existing.categories.push(cat);
    } else {
      map.set(key, {
        sourceEmail: s.source_email,
        senderName: extractSenderName(s.source_email),
        articles: [s],
        latestDate: s.created_at,
        date: s.processed_date,
        categories: s.category ? [s.category] : [],
      });
    }
  }
  // Sort most-recent edition first
  return Array.from(map.values()).sort((a, b) =>
    b.date > a.date ? 1 : b.date < a.date ? -1 : 0,
  );
}

function NewsletterSourceCard({
  group,
  onOpen,
}: {
  group: SourceGroup;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      className="w-full text-left bg-card rounded-lg border border-border hover:border-primary/30 hover:shadow-sm transition-all duration-150 group overflow-hidden"
    >
      <div className="px-4 py-3.5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
          <Mail className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{group.senderName}</p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">
            {group.articles.length} article
            {group.articles.length !== 1 ? "s" : ""} ·{" "}
            {timeAgo(group.latestDate)}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
      </div>
      {group.categories.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1">
          {group.categories.map((cat) => (
            <span
              key={cat}
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${getCategoryStyle(cat)}`}
            >
              {cat}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Source panel (right drawer)
// ---------------------------------------------------------------------------
function SourcePanel({
  sourceEmail,
  sourceEmailId,
  summaries,
  onClose,
  isExpanded,
  isBookmarked,
  isRead,
  isFlagged,
  generatedPosts,
  generating,
  copying,
  onToggleExpand,
  onToggleBookmark,
  onToggleRead,
  onGenerate,
  onCopy,
  onBlock,
  onShare,
  onFlag,
}: {
  sourceEmail: string;
  sourceEmailId: string;
  summaries: Summary[];
  onClose: () => void;
  isExpanded: (id: string) => boolean;
  isBookmarked: (id: string) => boolean;
  isRead: (id: string) => boolean;
  isFlagged: (id: string) => boolean;
  generatedPosts: Record<string, { linkedin?: string; twitter?: string }>;
  generating: Record<string, boolean>;
  copying: string | null;
  onToggleExpand: (id: string) => void;
  onToggleBookmark: (id: string) => void;
  onToggleRead: (id: string) => void;
  onGenerate: (id: string, p: Platform) => void;
  onCopy: (text: string, key: string) => void;
  onBlock: (id: string) => void;
  onShare: (id: string) => void;
  onFlag: (id: string) => void;
}) {
  const articles = summaries.filter(
    (s) =>
      s.source_email === sourceEmail && s.source_email_id === sourceEmailId,
  );
  const senderName = extractSenderName(sourceEmail);

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
            <p className="text-sm font-semibold">{senderName}</p>
            <p className="text-xs text-muted-foreground">
              {articles.length} article{articles.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {articles.map((s) => (
            <NewsletterCard
              key={s.id}
              summary={s}
              isExpanded={isExpanded(s.id)}
              isBookmarked={isBookmarked(s.id)}
              isRead={isRead(s.id)}
              isFlagged={isFlagged(s.id)}
              generatedPosts={generatedPosts}
              generating={generating}
              copying={copying}
              onToggleExpand={onToggleExpand}
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
  isExpanded,
  isBookmarked,
  isRead,
  isFlagged,
  generatedPosts,
  generating,
  copying,
  onToggleExpand,
  onToggleBookmark,
  onToggleRead,
  onGenerate,
  onCopy,
  onBlock,
  onShare,
  onFlag,
  noOuterBorder = false,
  onOpenSource,
}: {
  summary: Summary;
  isExpanded: boolean;
  isBookmarked: boolean;
  isRead: boolean;
  isFlagged: boolean;
  generatedPosts: Record<string, { linkedin?: string; twitter?: string }>;
  generating: Record<string, boolean>;
  copying: string | null;
  onToggleExpand: (id: string) => void;
  onToggleBookmark: (id: string) => void;
  onToggleRead: (id: string) => void;
  onGenerate: (id: string, p: Platform) => void;
  onCopy: (text: string, key: string) => void;
  onBlock: (id: string) => void;
  onShare: (id: string) => void;
  onFlag: (id: string) => void;
  noOuterBorder?: boolean;
  onOpenSource?: (sourceEmail: string) => void;
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
    <article
      className={`bg-card overflow-hidden transition-all duration-150 ${
        noOuterBorder
          ? ""
          : `rounded-xl border ${isExpanded ? "border-border/80 ring-1 ring-primary/20" : "border-border hover:border-primary/20 min-h-24"}`
      } ${!isRead && !isExpanded && !noOuterBorder ? "border-l-[3px] border-l-primary/60" : ""}`}
    >
      {/* Row 1: badge + quick action icons */}
      <div className="px-4 sm:px-5 pt-3.5 flex items-center justify-between gap-2">
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
      <div className="px-4 sm:px-5 pt-2.5 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <Mail className="w-3 h-3" />
          {senderName}
        </span>
        <span className="text-[10px] text-muted-foreground/40">
          {timeAgo(summary.created_at)}
        </span>
      </div>

      {/* Title */}
      <button
        className="w-full text-left px-4 sm:px-5 pt-2 pb-2 flex items-start justify-between gap-3 group"
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

      {/* Action icons below title — LinkedIn, X, share */}
      <div className="px-4 sm:px-5 pb-3 flex items-center gap-0.5 justify-end">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isExpanded) onToggleExpand(summary.id);
            onGenerate(summary.id, "linkedin");
          }}
          title={
            posts.linkedin || summary.linkedin_post
              ? "LinkedIn post ready"
              : "Generate LinkedIn post"
          }
          className={`p-1 rounded transition-colors ${posts.linkedin || summary.linkedin_post ? "text-[#0A66C2]" : "text-muted-foreground/60 hover:text-[#0A66C2]/70"}`}
        >
          <Linkedin className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isExpanded) onToggleExpand(summary.id);
            onGenerate(summary.id, "twitter");
          }}
          title={
            posts.twitter || summary.twitter_post
              ? "X post ready"
              : "Generate X post"
          }
          className={`p-1 rounded transition-colors ${posts.twitter || summary.twitter_post ? "text-foreground/70" : "text-muted-foreground/60 hover:text-foreground/80"}`}
        >
          <XIcon className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onShare(summary.id);
          }}
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

      {isExpanded && (
        <div className="border-t border-border">
          <div className="px-4 sm:px-5 py-4 space-y-4">
            {summary.summary && (
              <p className="text-sm text-foreground leading-relaxed">
                {summary.summary}
              </p>
            )}

            {summary.key_points?.length > 0 && (
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
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <button
                  onClick={() => onFlag(summary.id)}
                  title={
                    isFlagged ? "Flagged as inaccurate" : "Flag as inaccurate"
                  }
                  className={`inline-flex items-center gap-1 text-xs transition-colors ${isFlagged ? "text-red-500" : "text-muted-foreground/70 hover:text-red-600"}`}
                >
                  <ThumbsDown className="w-3 h-3" />
                  {isFlagged ? "Flagged" : "Inaccurate?"}
                </button>
              </div>
            </div>

            {onOpenSource && (
              <button
                onClick={() => onOpenSource(summary.source_email)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary/80 hover:text-primary transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                View all from {senderName}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="px-4 sm:px-5 py-4 bg-secondary/20 border-t border-border space-y-3">
            <button
              onClick={() => setSocialOpen((o) => !o)}
              className="flex items-center justify-between w-full group"
            >
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Social Posts
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
        </div>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Dashboard page
// ---------------------------------------------------------------------------
export default function Dashboard() {
  const { isLoaded, user } = useUser();
  const ph = usePostHog();

  // ── Data ──────────────────────────────────────────────────────────────────
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false); // importing via SSE
  const [scanning, setScanning] = useState(false); // scan phase
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showDigestOptIn, setShowDigestOptIn] = useState(false);
  const [showDigestSetup, setShowDigestSetup] = useState(false);

  // ── Scan / selection modal state ──────────────────────────────────────────
  const [scanResult, setScanResult] = useState<EmailPreview[] | null>(null);
  const [isFirstScan, setIsFirstScan] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [blockedInModal, setBlockedInModal] = useState<Set<string>>(new Set());

  // ── Per-card state ────────────────────────────────────────────────────────
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
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
  const [panelSource, setPanelSource] = useState<{
    email: string;
    emailId: string;
  } | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [digestState, setDigestState] = useState<
    "idle" | "loading" | "sent" | "empty" | "error"
  >("idle");
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

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
      const data = await res.json();
      setSummaries(Array.isArray(data) ? data : []);
    } catch {
      setSummaries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummaries().then(() => {
      // After summaries load, check if user has opted in to digest.
      // If not (including "Maybe later" dismissals), re-show the toast.
      fetch("/api/digest/sources")
        .then((r) => r.json())
        .then((data) => {
          if (!data.digestEnabled && (data.sources ?? []).length > 0) {
            setTimeout(() => setShowDigestOptIn(true), 1500);
          }
        })
        .catch(() => {});
    });
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((d) => {
        setGmailConnected(d.connected);
      })
      .catch(() => setGmailConnected(false));
  }, [fetchSummaries]);

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
      if (data.sent) ph?.capture("digest_sent", { article_count: data.count });
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
    setSyncStats(null);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        signal: controller.signal,
      });
      const data = await readJsonResponse<ScanResponse>(res);

      if (!res.ok) {
        setSyncError(data?.error ?? `Scan failed with status ${res.status}`);
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
      .map((n) => n.id);
    if (unselected.length) {
      fetch("/api/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailIds: unselected }),
      }).catch(() => {});
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
  const handleToggleExpand = useCallback(
    (id: string) => {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        const opening = !next.has(id);
        opening ? next.add(id) : next.delete(id);
        if (opening) {
          const s = summaries.find((x) => x.id === id);
          ph?.capture("article_expanded", {
            category: s?.category,
            source: s?.source_email,
          });
        }
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
    [read, summaries, ph],
  );

  const handleToggleRead = useCallback((id: string) => {
    setRead((prev) => {
      const next = new Set(prev);
      const nowRead = !next.has(id);
      nowRead ? next.add(id) : next.delete(id);
      fetch("/api/update-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_read: nowRead }),
      }).catch(() => {});
      return next;
    });
  }, []);

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
        fetch("/api/update-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, is_bookmarked: newVal }),
        }).catch(() => {});
        return next;
      });
    },
    [summaries, ph],
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

  const handleShare = useCallback(
    (id: string) => {
      const url = `${window.location.origin}/share/${id}`;
      navigator.clipboard.writeText(url).catch(() => {});
      setCopying(`share-${id}`);
      setTimeout(() => setCopying(null), 2000);
      ph?.capture("article_shared");
    },
    [ph],
  );

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

  const sourceGroups = useMemo(
    () => groupSummariesBySource(filteredSummaries),
    [filteredSummaries],
  );

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
    return {
      total: summaries.length,
      liReady,
      twReady,
      sources: uniqueSources.length,
      bookmarkedCount: bookmarked.size,
    };
  }, [summaries, generatedPosts, uniqueSources, bookmarked]);

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Digest setup modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showDigestSetup && (
          <DigestSetupModal
            key="digest-setup-modal"
            onClose={() => setShowDigestSetup(false)}
            onEnabled={() => setShowDigestSetup(false)}
          />
        )}
      </AnimatePresence>

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
              onDismiss={() => {
                setSyncStats(null);
                setSyncError(null);
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
            onSetup={() => {
              setShowDigestOptIn(false);
              setShowDigestSetup(true);
            }}
            onDismiss={() => setShowDigestOptIn(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Source panel ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {panelSource && (
          <SourcePanel
            key="source-panel"
            sourceEmail={panelSource.email}
            sourceEmailId={panelSource.emailId}
            summaries={summaries}
            onClose={() => setPanelSource(null)}
            isExpanded={(id) => expandedIds.has(id)}
            isBookmarked={(id) => bookmarked.has(id)}
            isRead={(id) => read.has(id)}
            isFlagged={(id: string) => flagged.has(id)}
            generatedPosts={generatedPosts}
            generating={generating}
            copying={copying}
            onToggleExpand={handleToggleExpand}
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
                  <h1 className="text-xl font-semibold tracking-tight">
                    Your newsletters, already read.
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                    Pidgin scans your Gmail, summarizes every newsletter with
                    AI, and drafts LinkedIn posts — so you stay informed without
                    the inbox chaos.
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
                <a href="/api/auth/google" className="block">
                  <Button className="w-full gap-2 h-10 text-sm font-medium">
                    <Mail className="w-4 h-4" />
                    Connect Gmail
                    <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-60" />
                  </Button>
                </a>
                <p className="text-center text-[11px] text-muted-foreground leading-relaxed">
                  Read-only access. We never send, delete, or modify your email.
                  <br />
                  Your data stays private and is only used to generate your
                  digest.
                </p>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* ── Dashboard (Gmail connected or loading) ────────────────────────── */}
      {gmailConnected !== false && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 space-y-6">
          {/* ── Hero greeting ──────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative flex flex-wrap items-end justify-between gap-4 pt-10 pb-2"
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
                  ? `${unreadCount} unread article${unreadCount !== 1 ? "s" : ""} · ${metrics.sources} source${metrics.sources !== 1 ? "s" : ""}`
                  : metrics.total > 0
                    ? `All caught up · ${metrics.total} article${metrics.total !== 1 ? "s" : ""} in your digest`
                    : "Your inbox is empty — sync to get started."}
              </p>
            </div>
            {gmailConnected === true && (
              <div className="flex items-center gap-2">
                {summaries.length > 0 && (
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
                        <span className="w-3.5 h-3.5 rounded-full border border-current border-t-transparent animate-spin" />{" "}
                        Sending…
                      </>
                    ) : digestState === "sent" ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Digest sent
                      </>
                    ) : digestState === "error" ? (
                      <>Failed — check console</>
                    ) : digestState === "empty" ? (
                      <>No articles today</>
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5" /> Send digest
                      </>
                    )}
                  </button>
                )}
                <SyncButton
                  onScan={handleScan}
                  scanning={scanning}
                  disabled={loading || syncing}
                />
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
                  key="sources"
                  label="Unique sources"
                  value={metrics.sources}
                  icon={<Mail className="w-4 h-4 text-muted-foreground" />}
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
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                        <Input
                          ref={searchRef}
                          value={searchInput}
                          onChange={(e) => setSearchInput(e.target.value)}
                          placeholder="Search…"
                          className="pl-6 pr-6 h-7 w-36 text-xs bg-secondary/30 border-border/60 focus-visible:ring-primary/40"
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

                      <select
                        value={activeSource}
                        onChange={(e) => setActiveSource(e.target.value)}
                        className="h-7 rounded-md border border-border bg-secondary/40 px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                      >
                        <option value="All">All sources</option>
                        {uniqueSources.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>

                      <select
                        value={dateFilter}
                        onChange={(e) =>
                          setDateFilter(e.target.value as DateFilter)
                        }
                        className="h-7 rounded-md border border-border bg-secondary/40 px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                      >
                        <option value="7d">Last 7 days</option>
                        <option value="all">All time</option>
                      </select>

                      <select
                        value={sortBy}
                        onChange={(e) =>
                          setSortBy(e.target.value as SortOption)
                        }
                        className="h-7 rounded-md border border-border bg-secondary/40 px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                      >
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                        <option value="source">By source</option>
                        <option value="category">By category</option>
                      </select>

                      {!loading && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          {sourceGroups.length === uniqueSources.length
                            ? `${uniqueSources.length} newsletter${uniqueSources.length !== 1 ? "s" : ""}`
                            : `${sourceGroups.length} of ${uniqueSources.length} newsletters`}
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
              const totalPages = Math.ceil(sourceGroups.length / PER_PAGE);
              const paged = sourceGroups.slice(
                (page - 1) * PER_PAGE,
                page * PER_PAGE,
              );

              // Group paged source cards by their latest article date
              const dateGroups: { label: string; groups: SourceGroup[] }[] = [];
              paged.forEach((g) => {
                const label = dateSectionLabel(g.date + "T12:00:00");
                const last = dateGroups[dateGroups.length - 1];
                if (last?.label === label) last.groups.push(g);
                else dateGroups.push({ label, groups: [g] });
              });

              return (
                <div className="space-y-6">
                  {dateGroups.map((dateGroup) => {
                    const left = dateGroup.groups.filter((_, i) => i % 2 === 0);
                    const right = dateGroup.groups.filter(
                      (_, i) => i % 2 !== 0,
                    );
                    return (
                      <div key={dateGroup.label} className="space-y-3">
                        {/* Date section header */}
                        <div className="flex items-center gap-3 px-0.5">
                          <span className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-widest flex-shrink-0">
                            {dateGroup.label}
                          </span>
                          <div className="flex-1 h-px bg-border/40" />
                        </div>
                        {/* Mobile: single column */}
                        <div className="flex flex-col gap-3 lg:hidden">
                          {dateGroup.groups.map((g) => (
                            <NewsletterSourceCard
                              key={`${g.sourceEmail}::${g.articles[0]?.source_email_id ?? g.date}`}
                              group={g}
                              onOpen={() =>
                                setPanelSource({
                                  email: g.sourceEmail,
                                  emailId: g.articles[0]?.source_email_id ?? "",
                                })
                              }
                            />
                          ))}
                        </div>
                        {/* Desktop: two columns */}
                        <div className="hidden lg:flex gap-3 items-start">
                          <div className="flex-1 min-w-0 flex flex-col gap-3">
                            {left.map((g) => (
                              <NewsletterSourceCard
                                key={`${g.sourceEmail}::${g.articles[0]?.source_email_id ?? g.date}`}
                                group={g}
                                onOpen={() =>
                                  setPanelSource({
                                    email: g.sourceEmail,
                                    emailId:
                                      g.articles[0]?.source_email_id ?? "",
                                  })
                                }
                              />
                            ))}
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col gap-3">
                            {right.map((g) => (
                              <NewsletterSourceCard
                                key={`${g.sourceEmail}::${g.articles[0]?.source_email_id ?? g.date}`}
                                group={g}
                                onOpen={() =>
                                  setPanelSource({
                                    email: g.sourceEmail,
                                    emailId:
                                      g.articles[0]?.source_email_id ?? "",
                                  })
                                }
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 pt-2 pb-4">
                      <button
                        disabled={page === 1}
                        onClick={() => {
                          setPage((p) => p - 1);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="h-8 px-3 text-xs rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:border-border transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        ← Prev
                      </button>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {page} / {totalPages}
                      </span>
                      <button
                        disabled={page === totalPages}
                        onClick={() => {
                          setPage((p) => p + 1);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="h-8 px-3 text-xs rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:border-border transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Next →
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
