"use client";

import React, { useEffect } from "react";
import {
  Ban,
  ChevronDown,
  Linkedin,
  Mail,
  RefreshCw,
  Search,
  Sparkles,
  Twitter,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/theme-toggle";

// ---------------------------------------------------------------------------
// Floating particles (background animation)
// ---------------------------------------------------------------------------
const PARTICLES = [
  { x: "8%",  size: "2px",  duration: "22s", delay: "0s",    drift: "18px",  alpha: "0.45" },
  { x: "16%", size: "3px",  duration: "18s", delay: "3s",    drift: "-20px", alpha: "0.3"  },
  { x: "25%", size: "2px",  duration: "25s", delay: "7s",    drift: "14px",  alpha: "0.4"  },
  { x: "33%", size: "4px",  duration: "20s", delay: "1s",    drift: "-16px", alpha: "0.25" },
  { x: "42%", size: "2px",  duration: "28s", delay: "9s",    drift: "22px",  alpha: "0.35" },
  { x: "50%", size: "3px",  duration: "16s", delay: "4s",    drift: "-12px", alpha: "0.4"  },
  { x: "58%", size: "2px",  duration: "23s", delay: "12s",   drift: "18px",  alpha: "0.3"  },
  { x: "67%", size: "4px",  duration: "19s", delay: "2s",    drift: "-24px", alpha: "0.25" },
  { x: "75%", size: "2px",  duration: "26s", delay: "6s",    drift: "16px",  alpha: "0.4"  },
  { x: "83%", size: "3px",  duration: "21s", delay: "10s",   drift: "-18px", alpha: "0.35" },
  { x: "91%", size: "2px",  duration: "17s", delay: "5s",    drift: "12px",  alpha: "0.3"  },
  { x: "12%", size: "3px",  duration: "24s", delay: "14s",   drift: "-14px", alpha: "0.25" },
  { x: "70%", size: "2px",  duration: "27s", delay: "8s",    drift: "20px",  alpha: "0.35" },
  { x: "44%", size: "3px",  duration: "15s", delay: "16s",   drift: "-10px", alpha: "0.3"  },
];

function FloatingParticles() {
  return (
    <>
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="particle"
          style={{
            "--x": p.x,
            "--size": p.size,
            "--duration": p.duration,
            "--delay": p.delay,
            "--drift-x": p.drift,
            "--alpha": p.alpha,
          } as React.CSSProperties}
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
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const stagger = (delay = 0.08) => ({
  hidden: {},
  visible: { transition: { staggerChildren: delay } },
});

// ---------------------------------------------------------------------------
// Landing page
// ---------------------------------------------------------------------------
function LandingPage() {
  const router = useRouter();

  const features = [
    {
      icon: <Mail className="w-4 h-4" />,
      title: "Newsletter-only inbox",
      desc: "Filters out job alerts, bank emails, and event invites. Only real newsletters pass through.",
    },
    {
      icon: <Sparkles className="w-4 h-4" />,
      title: "AI summaries",
      desc: "Claude distills each issue into key points and a plain-English digest — no skimming needed.",
    },
    {
      icon: <Linkedin className="w-4 h-4" />,
      title: "Social posts ready",
      desc: "One-click LinkedIn and Twitter drafts generated from every newsletter, ready to copy.",
    },
    {
      icon: <Search className="w-4 h-4" />,
      title: "Search & bookmark",
      desc: "Full-text search across all summaries. Bookmark issues to revisit when you need them.",
    },
    {
      icon: <Ban className="w-4 h-4" />,
      title: "Block senders",
      desc: "Mute any sender with one click — they never show up in your digest again.",
    },
    {
      icon: <RefreshCw className="w-4 h-4" />,
      title: "On-demand sync",
      desc: "Sync whenever you want. Pidgin fetches the latest from your Gmail in seconds.",
    },
  ];

  const steps = [
    { n: "01", title: "Connect Gmail", body: "Authorize read-only access in 30 seconds. We never send or modify anything." },
    { n: "02", title: "AI reads for you", body: "Pidgin filters noise and uses Claude to distill every newsletter into key points." },
    { n: "03", title: "Posts are ready", body: "One-click LinkedIn & Twitter drafts from any summary — copy and share instantly." },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── Ambient background ─────────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-48 -left-48 w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, hsl(199 89% 48% / 0.06) 0%, transparent 65%)" }}
        />
        <div
          className="absolute top-[30%] right-[-20%] w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, hsl(250 80% 60% / 0.04) 0%, transparent 65%)" }}
        />
        <div
          className="absolute -bottom-48 left-[20%] w-[480px] h-[480px] rounded-full"
          style={{ background: "radial-gradient(circle, hsl(199 89% 48% / 0.05) 0%, transparent 65%)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage: "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <FloatingParticles />
      </div>

      {/* ── Nav ────────────────────────────────────────────────────────────── */}
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
              <img src="/pidgin-main.png" alt="Pidgin" className="w-7 h-7 rounded-lg" />
              <span className="font-semibold text-sm tracking-tight">Pidgin</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => router.push("/sign-in")}
              >
                Sign in
              </Button>
              <Button
                size="sm"
                className="text-xs gap-1.5"
                onClick={() => router.push("/sign-up")}
              >
                Get started
                <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
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
              AI-powered newsletter digest
            </div>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-5xl sm:text-6xl lg:text-[5.5rem] font-bold tracking-tight leading-[1.07] mb-5"
          >
            Your newsletters,
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(199 89% 72%) 100%)" }}
            >
              actually read.
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed"
          >
            Pidgin connects to Gmail, filters the noise, and uses Claude AI to distill
            what matters — then drafts your LinkedIn &amp; Twitter posts in seconds.
          </motion.p>

          <motion.div variants={fadeUp} className="flex items-center justify-center gap-3 flex-wrap">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push("/sign-up")}
              className="relative inline-flex items-center gap-2 px-7 h-11 rounded-lg bg-primary text-white text-sm font-medium overflow-hidden transition-opacity hover:opacity-90"
            >
              <span className="relative z-10 flex items-center gap-2">
                Get started free
                <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
              </span>
              <motion.span
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 2.5, ease: "easeInOut" }}
              />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push("/sign-in")}
              className="inline-flex items-center gap-2 px-7 h-11 rounded-lg border border-border/70 bg-card/50 text-sm font-medium hover:border-border hover:bg-card transition-all"
            >
              Sign in
            </motion.button>
          </motion.div>

          <motion.p variants={fadeUp} className="mt-4 text-xs text-muted-foreground/40">
            30-second setup · Gmail read-only · No email ever sent or modified
          </motion.p>
        </motion.div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 relative">

            {/* Line: box 1 right-edge → box 2 left-edge */}
            <div
              className="hidden sm:block absolute top-[19px] h-px overflow-hidden"
              style={{ left: "calc(100%/6 + 22px)", right: "calc(50% + 22px)" }}
            >
              <div className="relative h-full w-full bg-border/50">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/55 to-transparent"
                  initial={{ x: "-100%" }}
                  animate={{ x: "200%" }}
                  transition={{ duration: 0.9, delay: 0.4, repeat: Infinity, repeatDelay: 3.8, ease: "easeInOut" }}
                />
              </div>
            </div>

            {/* Line: box 2 right-edge → box 3 left-edge */}
            <div
              className="hidden sm:block absolute top-[19px] h-px overflow-hidden"
              style={{ left: "calc(50% + 22px)", right: "calc(100%/6 + 22px)" }}
            >
              <div className="relative h-full w-full bg-border/50">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/55 to-transparent"
                  initial={{ x: "-100%" }}
                  animate={{ x: "200%" }}
                  transition={{ duration: 0.9, delay: 1.5, repeat: Infinity, repeatDelay: 3.8, ease: "easeInOut" }}
                />
              </div>
            </div>

            {steps.map(({ n, title, body }, i) => (
              <motion.div
                key={n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.12 }}
                className="relative z-10 flex flex-col items-center text-center px-4 pb-6"
              >
                <motion.div
                  whileHover={{ scale: 1.08 }}
                  className="w-10 h-10 rounded-xl border border-border/80 bg-card flex items-center justify-center mb-4 cursor-default"
                >
                  <span className="text-xs font-mono font-bold text-primary/60">{n}</span>
                </motion.div>
                <h3 className="text-sm font-semibold mb-1.5">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
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
            Built for people who actually{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(199 89% 70%) 100%)" }}
            >
              care about signal.
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
          {features.map(({ icon, title, desc }) => (
            <motion.div
              key={title}
              variants={fadeUp}
              whileHover={{ y: -2, transition: { duration: 0.18 } }}
              className="group relative rounded-xl border border-border/60 bg-card/60 p-5 flex flex-col gap-2.5 cursor-default overflow-hidden"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                {icon}
              </div>
              <h3 className="text-sm font-semibold">{title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── Bottom CTA ─────────────────────────────────────────────────────── */}
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
            Stop skimming.{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(199 89% 72%) 100%)" }}
            >
              Start retaining.
            </span>
          </h2>
          <p className="text-muted-foreground text-sm mb-7">
            Free to use. Just bring your Gmail.
          </p>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/sign-up")}
            className="relative inline-flex items-center gap-2 px-8 h-11 rounded-lg bg-primary text-white text-sm font-medium overflow-hidden transition-opacity hover:opacity-90"
          >
            <span className="relative z-10 flex items-center gap-2">
              Connect your Gmail
              <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
            </span>
            <motion.span
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 2.5, ease: "easeInOut" }}
            />
          </motion.button>
        </motion.div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="text-xs text-muted-foreground/60 tracking-tight">Pidgin</span>
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
// Home — redirect signed-in users to /dashboard, show landing otherwise
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
