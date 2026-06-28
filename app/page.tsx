"use client";

import React, { useEffect, useState } from "react";
import {
  Ban,
  Check,
  ChevronDown,
  Linkedin,
  Mail,
  RefreshCw,
  Search,
  Sparkles,
  Twitter,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/theme-toggle";

// ---------------------------------------------------------------------------
// Floating particles
// ---------------------------------------------------------------------------
const PARTICLES = [
  {
    x: "8%",
    size: "2px",
    duration: "22s",
    delay: "0s",
    drift: "18px",
    alpha: "0.45",
  },
  {
    x: "16%",
    size: "3px",
    duration: "18s",
    delay: "3s",
    drift: "-20px",
    alpha: "0.3",
  },
  {
    x: "25%",
    size: "2px",
    duration: "25s",
    delay: "7s",
    drift: "14px",
    alpha: "0.4",
  },
  {
    x: "33%",
    size: "4px",
    duration: "20s",
    delay: "1s",
    drift: "-16px",
    alpha: "0.25",
  },
  {
    x: "42%",
    size: "2px",
    duration: "28s",
    delay: "9s",
    drift: "22px",
    alpha: "0.35",
  },
  {
    x: "50%",
    size: "3px",
    duration: "16s",
    delay: "4s",
    drift: "-12px",
    alpha: "0.4",
  },
  {
    x: "58%",
    size: "2px",
    duration: "23s",
    delay: "12s",
    drift: "18px",
    alpha: "0.3",
  },
  {
    x: "67%",
    size: "4px",
    duration: "19s",
    delay: "2s",
    drift: "-24px",
    alpha: "0.25",
  },
  {
    x: "75%",
    size: "2px",
    duration: "26s",
    delay: "6s",
    drift: "16px",
    alpha: "0.4",
  },
  {
    x: "83%",
    size: "3px",
    duration: "21s",
    delay: "10s",
    drift: "-18px",
    alpha: "0.35",
  },
  {
    x: "91%",
    size: "2px",
    duration: "17s",
    delay: "5s",
    drift: "12px",
    alpha: "0.3",
  },
  {
    x: "12%",
    size: "3px",
    duration: "24s",
    delay: "14s",
    drift: "-14px",
    alpha: "0.25",
  },
  {
    x: "70%",
    size: "2px",
    duration: "27s",
    delay: "8s",
    drift: "20px",
    alpha: "0.35",
  },
  {
    x: "44%",
    size: "3px",
    duration: "15s",
    delay: "16s",
    drift: "-10px",
    alpha: "0.3",
  },
];

function FloatingParticles() {
  return (
    <>
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="particle"
          style={
            {
              "--x": p.x,
              "--size": p.size,
              "--duration": p.duration,
              "--delay": p.delay,
              "--drift-x": p.drift,
              "--alpha": p.alpha,
            } as React.CSSProperties
          }
        />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Animation helpers
// ---------------------------------------------------------------------------
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};
const stagger = (delay = 0.08) => ({
  hidden: {},
  visible: { transition: { staggerChildren: delay } },
});

// ---------------------------------------------------------------------------
// How it works — illustrated step cards (auto-looping)
// ---------------------------------------------------------------------------

function ConnectIllustration() {
  const [phase, setPhase] = useState<"idle" | "loading" | "done">("idle");

  useEffect(() => {
    const ts: ReturnType<typeof setTimeout>[] = [];
    const add = (fn: () => void, ms: number) => {
      const t = setTimeout(fn, ms);
      ts.push(t);
      return t;
    };
    function loop(offset = 0) {
      add(() => setPhase("idle"), offset);
      add(() => setPhase("loading"), offset + 1400);
      add(() => setPhase("done"), offset + 2500);
      add(() => loop(), offset + 5200);
    }
    loop(900);
    return () => ts.forEach(clearTimeout);
  }, []);

  return (
    <div className="mt-5 rounded-lg border border-border/40 bg-background/60 p-3 space-y-2 text-left">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shrink-0">
          <span
            className="text-white font-black leading-none"
            style={{ fontSize: 8 }}
          >
            G
          </span>
        </div>
        <span className="text-[11px] font-medium">Gmail OAuth</span>
        <AnimatePresence>
          {phase === "done" && (
            <motion.span
              key="badge"
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="ml-auto text-[10px] text-emerald-500 font-medium flex items-center gap-0.5"
            >
              <Check className="w-3 h-3" /> Connected
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-1">
        {[
          { label: "Read emails", ok: true },
          { label: "Send emails", ok: false },
          { label: "Delete emails", ok: false },
        ].map(({ label, ok }) => (
          <div key={label} className="flex items-center gap-1.5">
            {ok ? (
              <Check className="w-3 h-3 text-emerald-500 shrink-0" />
            ) : (
              <X className="w-3 h-3 text-muted-foreground/25 shrink-0" />
            )}
            <span
              className={`text-[10px] ${ok ? "text-foreground/65" : "text-muted-foreground/25 line-through"}`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      <motion.div
        animate={{
          backgroundColor:
            phase === "done" ? "hsl(142 71% 45%)" : "hsl(var(--primary))",
        }}
        transition={{ duration: 0.28 }}
        className="h-6 rounded flex items-center justify-center"
      >
        <AnimatePresence mode="wait">
          {phase === "idle" && (
            <motion.span
              key="i"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="text-white text-[10px] font-medium"
            >
              Connect Gmail
            </motion.span>
          )}
          {phase === "loading" && (
            <motion.span
              key="l"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="text-white/80 text-[10px] flex items-center gap-1.5"
            >
              <span className="w-2.5 h-2.5 rounded-full border border-white/40 border-t-white animate-spin inline-block" />
              Authorizing
            </motion.span>
          )}
          {phase === "done" && (
            <motion.span
              key="d"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="text-white text-[10px] font-medium flex items-center gap-1"
            >
              <Check className="w-3 h-3" /> Access granted
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function AIReadsIllustration() {
  const [count, setCount] = useState(0);
  const bullets = [
    "OpenAI cuts inference costs 40%",
    "Improves multi-step reasoning",
    "Available via API immediately",
  ];

  useEffect(() => {
    const ts: ReturnType<typeof setTimeout>[] = [];
    const add = (fn: () => void, ms: number) => {
      const t = setTimeout(fn, ms);
      ts.push(t);
    };
    function loop(offset = 0) {
      add(() => setCount(0), offset);
      add(() => setCount(1), offset + 600);
      add(() => setCount(2), offset + 1200);
      add(() => setCount(3), offset + 1800);
      add(() => loop(), offset + 4600);
    }
    loop(700);
    return () => ts.forEach(clearTimeout);
  }, []);

  return (
    <div className="mt-5 rounded-lg border border-border/40 bg-background/60 p-3 text-left">
      <div className="flex items-center gap-2 pb-2 mb-2 border-b border-border/30">
        <div className="w-5 h-5 rounded bg-amber-400/15 flex items-center justify-center shrink-0">
          <Mail className="w-3 h-3 text-amber-500" />
        </div>
        <span className="text-[10px] text-muted-foreground">Morning Brew</span>
        <div className="ml-auto flex items-center gap-1 bg-primary/10 rounded px-1.5 py-0.5">
          <Sparkles className="w-2.5 h-2.5 text-primary" />
          <span className="text-[9px] text-primary font-medium">AI</span>
        </div>
      </div>
      <p className="text-[9px] text-muted-foreground/50 uppercase tracking-widest font-semibold mb-2">
        Key points
      </p>
      <div className="space-y-1.5 min-h-[54px]">
        {bullets.map((pt, i) => (
          <AnimatePresence key={pt}>
            {count > i && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
                className="flex items-start gap-1.5"
              >
                <div className="w-1 h-1 rounded-full bg-primary mt-[5px] shrink-0" />
                <span className="text-[10px] text-foreground/65 leading-snug">
                  {pt}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        ))}
      </div>
    </div>
  );
}

function PostsIllustration() {
  const lines = [
    "Just read: OpenAI cut costs by 40% —",
    "finally makes production AI viable",
    "at real scale. Worth sharing. 🧵",
  ];
  const [shown, setShown] = useState(0);
  const [actions, setActions] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ts: ReturnType<typeof setTimeout>[] = [];
    const add = (fn: () => void, ms: number) => {
      const t = setTimeout(fn, ms);
      ts.push(t);
    };
    function loop(offset = 0) {
      add(() => {
        setShown(0);
        setActions(false);
        setCopied(false);
      }, offset);
      add(() => setShown(1), offset + 500);
      add(() => setShown(2), offset + 1100);
      add(() => setShown(3), offset + 1700);
      add(() => setActions(true), offset + 2100);
      add(() => setCopied(true), offset + 3400);
      add(() => loop(), offset + 5800);
    }
    loop(600);
    return () => ts.forEach(clearTimeout);
  }, []);

  return (
    <div className="mt-5 rounded-lg border border-border/40 bg-background/60 p-3 text-left">
      <div className="flex items-center gap-1.5 mb-2">
        <Linkedin className="w-3.5 h-3.5 text-[#0077B5]" />
        <span className="text-[10px] font-semibold text-foreground/65">
          LinkedIn
        </span>
        {actions && (
          <motion.div
            animate={
              copied
                ? { backgroundColor: "hsl(142 71% 45%)" }
                : { backgroundColor: "hsl(var(--primary))" }
            }
            transition={{ duration: 0.25 }}
            className="ml-auto flex items-center gap-1 px-2 h-4.5 rounded text-white text-[9px] font-medium"
            style={{ padding: "1px 8px" }}
          >
            {copied && <Check className="w-2.5 h-2.5" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </motion.div>
        )}
      </div>
      <div className="space-y-0.5 min-h-[42px]">
        {lines.map((line, i) => (
          <AnimatePresence key={line}>
            {shown > i && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="text-[10px] text-foreground/65 leading-relaxed"
              >
                {line}
              </motion.p>
            )}
          </AnimatePresence>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Everything you need — feature mini-illustrations (hover-triggered)
// ---------------------------------------------------------------------------

function InboxIllustration({ active }: { active: boolean }) {
  const rows = [
    { name: "Morning Brew", real: true },
    { name: "TLDR Newsletter", real: true },
    { name: "Job Alert: SWE @ Acme", real: false },
  ];
  return (
    <div className="pt-3 border-t border-border/25 space-y-1 mt-3">
      {rows.map((row) => (
        <motion.div
          key={row.name}
          animate={
            !row.real && active ? { opacity: 0, x: 12 } : { opacity: 1, x: 0 }
          }
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={`flex items-center gap-2 h-5 px-1.5 rounded transition-colors duration-300 ${active && row.real ? "border-l-2 border-primary/50 bg-primary/5 pl-1" : ""}`}
        >
          <div
            className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors duration-300 ${row.real ? (active ? "bg-primary" : "bg-primary/40") : "bg-muted-foreground/20"}`}
          />
          <span
            className={`text-[10px] truncate ${row.real ? "text-foreground/60" : "text-muted-foreground/30 line-through"}`}
          >
            {row.name}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function SummaryIllustration({ active }: { active: boolean }) {
  const points = [
    "Cost reduction confirmed",
    "API live immediately",
    "No quality loss",
  ];
  return (
    <div className="pt-3 border-t border-border/25 min-h-[54px] mt-3">
      <AnimatePresence mode="wait">
        {!active ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-1.5"
          >
            {[65, 85, 50].map((w, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full bg-muted-foreground/15"
                style={{ width: `${w}%` }}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="bullets"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-1.5"
          >
            {points.map((pt, i) => (
              <motion.div
                key={pt}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.09, duration: 0.22 }}
                className="flex items-start gap-1.5"
              >
                <div className="w-1 h-1 rounded-full bg-primary mt-[5px] shrink-0" />
                <span className="text-[10px] text-foreground/65 leading-tight">
                  {pt}
                </span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SocialIllustration({ active }: { active: boolean }) {
  const platforms = [
    {
      icon: <Linkedin className="w-3 h-3" />,
      label: "LinkedIn",
      color: "text-[#0077B5]",
      ring: "border-[#0077B5]/25 bg-[#0077B5]/8",
    },
    {
      icon: <Twitter className="w-3 h-3" />,
      label: "Twitter",
      color: "text-sky-400",
      ring: "border-sky-400/25 bg-sky-400/8",
    },
  ];
  return (
    <div className="pt-3 border-t border-border/25 flex gap-2 mt-3">
      {platforms.map(({ icon, label, color, ring }, i) => (
        <motion.div
          key={label}
          animate={
            active
              ? { scale: 1, opacity: 1, y: 0 }
              : { scale: 0.9, opacity: 0.4, y: 3 }
          }
          transition={{
            delay: i * 0.07,
            duration: 0.22,
            type: "spring",
            stiffness: 420,
            damping: 20,
          }}
          className={`flex items-center gap-1.5 px-2.5 h-6 rounded-md border ${ring} ${color}`}
        >
          {icon}
          <span className="text-[10px] font-medium">{label}</span>
          <AnimatePresence>
            {active && (
              <motion.span
                key="chk"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{
                  delay: i * 0.07 + 0.12,
                  type: "spring",
                  stiffness: 500,
                }}
              >
                <Check className="w-2.5 h-2.5" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}

function SearchIllustration({ active }: { active: boolean }) {
  const query = "openai cost";
  const [chars, setChars] = useState(0);
  const [result, setResult] = useState(false);

  useEffect(() => {
    if (!active) {
      setChars(0);
      setResult(false);
      return;
    }
    const ts: ReturnType<typeof setTimeout>[] = [];
    query.split("").forEach((_, i) => {
      const t = setTimeout(() => setChars(i + 1), i * 55);
      ts.push(t);
    });
    const t = setTimeout(() => setResult(true), query.length * 55 + 180);
    ts.push(t);
    return () => ts.forEach(clearTimeout);
  }, [active]);

  return (
    <div className="pt-3 border-t border-border/25 space-y-1.5 mt-3">
      <div className="flex items-center gap-1.5 h-6 rounded-md bg-background border border-border/60 px-2">
        <Search className="w-2.5 h-2.5 text-muted-foreground/40 shrink-0" />
        <span className="text-[10px] text-foreground/60 flex-1 min-w-0 flex items-center">
          {query.slice(0, chars)}
          {active && chars < query.length && (
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="inline-block w-px h-[9px] bg-primary/70 ml-px"
            />
          )}
        </span>
      </div>
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-md bg-primary/6 border border-primary/15 px-2 py-1.5"
          >
            <p className="text-[9px] font-medium text-foreground/70">
              OpenAI cuts costs by 40%
            </p>
            <p className="text-[9px] text-muted-foreground/45">
              Morning Brew · 2d ago
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BlockIllustration({ active }: { active: boolean }) {
  return (
    <div className="pt-3 border-t border-border/25 mt-3">
      <div className="relative overflow-hidden h-7 rounded-md">
        <motion.div
          animate={active ? { opacity: 0, x: -12 } : { opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 flex items-center gap-2 px-2 bg-secondary/40 rounded-md"
        >
          <Mail className="w-3 h-3 text-muted-foreground/40 shrink-0" />
          <span className="text-[10px] text-foreground/50">
            promo@company.com
          </span>
          <motion.div
            animate={active ? { opacity: 0 } : { opacity: 1 }}
            className="ml-auto flex items-center gap-1 text-muted-foreground/30"
          >
            <Ban className="w-3 h-3" />
          </motion.div>
        </motion.div>
        <AnimatePresence>
          {active && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.2 }}
              className="absolute inset-0 flex items-center justify-center gap-1.5 text-muted-foreground/45"
            >
              <Ban className="w-3 h-3 text-red-400/60" />
              <span className="text-[10px]">Sender blocked</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SyncIllustration({ active }: { active: boolean }) {
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    if (!active) {
      setSpinning(false);
      return;
    }
    setSpinning(true);
    const t = setTimeout(() => setSpinning(false), 700);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <div className="pt-3 border-t border-border/25 flex items-center gap-2 mt-3">
      <motion.div
        animate={{ rotate: spinning ? 360 : 0 }}
        transition={{ duration: 0.7, ease: "easeInOut" }}
      >
        <RefreshCw className="w-3.5 h-3.5 text-muted-foreground/40" />
      </motion.div>
      <span className="text-[10px] text-muted-foreground/40">
        {active ? "Syncing…" : "Last synced 2h ago"}
      </span>
      <AnimatePresence>
        {active && !spinning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7, x: -4 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
            className="ml-auto px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] font-semibold"
          >
            +3 new
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Feature card with managed hover state
function FeatureCard({
  icon,
  title,
  desc,
  illustration,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  illustration: (active: boolean) => React.ReactNode;
}) {
  const [active, setActive] = useState(false);
  return (
    <motion.div
      variants={fadeUp}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      className="group relative rounded-xl border border-border/60 bg-card/60 p-5 flex flex-col cursor-default overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2.5">
        {icon}
      </div>
      <h3 className="text-sm font-semibold mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
      {illustration(active)}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Landing page
// ---------------------------------------------------------------------------
function LandingPage() {
  const router = useRouter();

  const steps = [
    {
      n: "01",
      title: "Connect Gmail",
      body: "Authorize read-only access in 30 seconds. We never send, delete, or modify anything.",
      illustration: <ConnectIllustration />,
    },
    {
      n: "02",
      title: "AI reads every issue so you don't have to",
      body: "Pidgin filters out noise and uses Claude to distill each newsletter into key points — no skimming.",
      illustration: <AIReadsIllustration />,
    },
    {
      n: "03",
      title: "Get your briefing + post drafts, daily",
      body: "A digest email every evening plus one-click LinkedIn & X drafts, ready to copy and share.",
      illustration: <PostsIllustration />,
    },
  ];

  const features: {
    icon: React.ReactNode;
    title: string;
    desc: string;
    illustration: (active: boolean) => React.ReactNode;
  }[] = [
    {
      icon: <Mail className="w-4 h-4" />,
      title: "No more newsletter guilt",
      desc: "Filters out job alerts, bank emails, and event invites. Only real newsletters make it through.",
      illustration: (a) => <InboxIllustration active={a} />,
    },
    {
      icon: <Sparkles className="w-4 h-4" />,
      title: "Key points in 10 seconds per issue",
      desc: "Claude distills each newsletter into bullet points and a plain-English summary — no skimming needed.",
      illustration: (a) => <SummaryIllustration active={a} />,
    },
    {
      icon: <Linkedin className="w-4 h-4" />,
      title: "Stay visible without writing from scratch",
      desc: "One-click LinkedIn and X drafts generated from every newsletter. Stay consistent without the effort.",
      illustration: (a) => <SocialIllustration active={a} />,
    },
    {
      icon: <Search className="w-4 h-4" />,
      title: "Search & bookmark",
      desc: "Full-text search across all summaries. Bookmark issues to revisit when you actually have time.",
      illustration: (a) => <SearchIllustration active={a} />,
    },
    {
      icon: <Ban className="w-4 h-4" />,
      title: "Block the noise",
      desc: "Mute any sender with one click — they never show up in your digest again.",
      illustration: (a) => <BlockIllustration active={a} />,
    },
    {
      icon: <RefreshCw className="w-4 h-4" />,
      title: "On-demand sync",
      desc: "Sync whenever you want. Pidgin fetches the latest from Gmail in seconds.",
      illustration: (a) => <SyncIllustration active={a} />,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ── Ambient background ──────────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-48 -left-48 w-[600px] h-[600px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, hsl(199 89% 48% / 0.06) 0%, transparent 65%)",
          }}
        />
        <div
          className="absolute top-[30%] right-[-20%] w-[500px] h-[500px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, hsl(250 80% 60% / 0.04) 0%, transparent 65%)",
          }}
        />
        <div
          className="absolute -bottom-48 left-[20%] w-[480px] h-[480px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, hsl(199 89% 48% / 0.05) 0%, transparent 65%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage:
              "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <FloatingParticles />
      </div>

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="sticky top-0 z-40 border-b border-border/50 bg-background/75 backdrop-blur-xl"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/pidgin-main.png" alt="Pidgin" className="w-8 h-8" />
            </div>
            <div className="flex items-center gap-1.5">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-primary hover:bg-transparent"
                onClick={() => router.push("/sign-in")}
              >
                Sign in
              </Button>
              <Button
                size="sm"
                className="text-xs gap-1.5"
                onClick={() => router.push("/waitlist")}
              >
                Join alpha
                <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-14 text-center">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger(0.09)}
          className="flex flex-col items-center"
        >
          <motion.div variants={fadeUp}>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/25 bg-primary/8 text-primary text-xs font-medium mb-6">
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-primary"
              />
              Now in alpha · invite only
            </div>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-5xl sm:text-6xl lg:text-[5.5rem] font-bold tracking-tight leading-[1.07] mb-5"
          >
            You subscribed to
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(199 89% 72%) 100%)",
              }}
            >
              15 newsletters.
            </span>
            <br />
            You&apos;ve read 2.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed"
          >
            Pidgin turns your newsletter backlog into a daily briefing — key
            points, social posts ready to share, zero skimming. Built for
            founders who are already too busy.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="flex items-center justify-center gap-3 flex-wrap"
          >
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push("/waitlist")}
              className="relative inline-flex items-center gap-2 px-7 h-11 rounded-lg bg-primary text-white text-sm font-medium overflow-hidden transition-opacity hover:opacity-90"
            >
              <span className="relative z-10 flex items-center gap-2">
                Request access
                <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
              </span>
              <motion.span
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12"
                animate={{ x: ["-100%", "200%"] }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  repeatDelay: 2.5,
                  ease: "easeInOut",
                }}
              />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push("/sign-in")}
              className="inline-flex items-center gap-2 px-7 h-11 rounded-lg border border-border/70 bg-card/50 text-sm font-medium text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors duration-200"
            >
              Sign in
            </motion.button>
          </motion.div>

          <motion.p
            variants={fadeUp}
            className="mt-4 text-xs text-muted-foreground/40"
          >
            30-second setup · Gmail read-only · Free during alpha
          </motion.p>
        </motion.div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────────── */}
      <section className="border-t border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="text-center text-xs font-semibold tracking-widest text-muted-foreground/60 uppercase mb-10"
          >
            How it works
          </motion.h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {steps.map(({ n, title, body, illustration }, i) => (
              <motion.div
                key={n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.1 }}
                className="group rounded-xl border border-border/60 bg-card/50 p-5 flex flex-col overflow-hidden relative"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="text-xs font-mono text-muted-foreground/35 mb-3">
                  {n}
                </span>
                <h3 className="text-sm font-semibold mb-1.5">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {body}
                </p>
                {illustration}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Everything you need ─────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="text-center mb-8"
        >
          <h2 className="text-xs font-semibold tracking-widest text-muted-foreground/60 uppercase mb-3">
            Everything you need
          </h2>
          <p className="text-2xl sm:text-3xl font-bold tracking-tight">
            Built for founders who are{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(199 89% 70%) 100%)",
              }}
            >
              already too busy.
            </span>
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={stagger(0.06)}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
        >
          {features.map((f) => (
            <FeatureCard
              key={f.title}
              icon={f.icon}
              title={f.title}
              desc={f.desc}
              illustration={f.illustration}
            />
          ))}
        </motion.div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────────── */}
      <section className="border-t border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="text-center mb-10"
          >
            <h2 className="text-xs font-semibold tracking-widest text-muted-foreground/60 uppercase mb-3">
              Pricing
            </h2>
            <p className="text-2xl sm:text-3xl font-bold tracking-tight">
              Simple,{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(199 89% 70%) 100%)",
                }}
              >
                no surprises.
              </span>
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {/* Alpha / Beta card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45 }}
              className="relative rounded-xl border-2 border-primary/40 bg-card/60 p-6 flex flex-col"
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-primary text-white text-[10px] font-semibold tracking-wide">
                  <motion.span
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-1.5 h-1.5 rounded-full bg-white"
                  />
                  Alpha · Limited seats
                </span>
              </div>
              <p className="text-xs text-muted-foreground/60 uppercase tracking-widest font-semibold mb-1 mt-2">Alpha</p>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold">Free</span>
                <span className="text-sm text-muted-foreground/50">while seats last</span>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {[
                  "Up to 20 newsletter sources",
                  "Daily digest email",
                  "AI summaries + key points",
                  "LinkedIn & X post drafts",
                  "Shareable summary cards",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground/70">
                    <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push("/waitlist")}
                className="w-full h-10 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Join the alpha →
              </motion.button>
              <p className="text-[10px] text-muted-foreground/35 text-center mt-3">
                Free during alpha. 60 days notice before any paid tier goes live.
              </p>
            </motion.div>

            {/* Pro card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.1 }}
              className="rounded-xl border border-border/50 bg-card/40 p-6 flex flex-col opacity-70"
            >
              <p className="text-xs text-muted-foreground/60 uppercase tracking-widest font-semibold mb-1">Pro</p>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold">$12</span>
                <span className="text-sm text-muted-foreground/50">/mo</span>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {[
                  "Unlimited newsletter sources",
                  "Priority Gmail sync",
                  "Custom digest time",
                  "Everything in alpha",
                  "Early access to new features",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground/50">
                    <Check className="w-3.5 h-3.5 text-muted-foreground/40 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                disabled
                className="w-full h-10 rounded-lg border border-border/60 text-sm font-medium text-muted-foreground/40 cursor-not-allowed"
              >
                Coming soon
              </button>
              <p className="text-[10px] text-muted-foreground/30 text-center mt-3">
                Launching after alpha. Join now to lock in early pricing.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ──────────────────────────────────────────────────────── */}
      <section className="border-t border-border/50">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center"
        >
          <p className="text-xs font-semibold tracking-widest text-muted-foreground/50 uppercase mb-4">
            Ready to start?
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3 leading-tight">
            Your competitors are reading this stuff.{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(199 89% 72%) 100%)",
              }}
            >
              You can skim it in 30 seconds.
            </span>
          </h2>
          <p className="text-muted-foreground text-sm mb-7">
            Free during alpha. Just bring your Gmail.
          </p>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/waitlist")}
            className="relative inline-flex items-center gap-2 px-8 h-11 rounded-lg bg-primary text-white text-sm font-medium overflow-hidden transition-opacity hover:opacity-90"
          >
            <span className="relative z-10 flex items-center gap-2">
              Join the alpha
              <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
            </span>
            <motion.span
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12"
              animate={{ x: ["-100%", "200%"] }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                repeatDelay: 2.5,
                ease: "easeInOut",
              }}
            />
          </motion.button>
        </motion.div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/pidgin-main.png" alt="Pidgin" className="w-6 h-6" />
            </div>
            <span className="text-xs text-muted-foreground/60 tracking-wide">
              Pidgin
            </span>
          </div>
          <p className="text-xs text-muted-foreground/35">
            Read-only Gmail · No spam · No data sold
          </p>
        </div>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Home — redirect signed-in users to /dashboard
// ---------------------------------------------------------------------------
export default function Home() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace("/dashboard");
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) return <div className="min-h-screen bg-background" />;
  if (isSignedIn) return null;
  return <LandingPage />;
}
