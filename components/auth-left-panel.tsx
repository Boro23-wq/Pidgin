"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Linkedin, Sparkles } from "lucide-react";

const STORIES = [
  {
    source: "The Batch",
    time: "2h ago",
    category: "AI & ML",
    catStyle: "bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/25",
    headline: "OpenAI releases reasoning model with 40% cost reduction",
    snippet:
      "The latest model cuts inference costs significantly while improving multi-step reasoning tasks by a wide margin...",
    hasPost: true,
  },
  {
    source: "Morning Brew",
    time: "4h ago",
    category: "Tech",
    catStyle: "bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-500/25",
    headline: "Apple planning full Siri overhaul with in-house LLM for iOS 19",
    snippet:
      "The redesign would replace Siri's core engine, enabling complex multi-turn conversations and on-device reasoning...",
    hasPost: false,
  },
  {
    source: "TLDR Newsletter",
    time: "5h ago",
    category: "Startups",
    catStyle: "bg-purple-50 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 border-purple-200 dark:border-purple-500/25",
    headline: "Mistral raises $640M Series C at $6B valuation",
    snippet:
      "The French AI lab plans to scale infrastructure and expand its enterprise customer base across Europe and North America...",
    hasPost: true,
  },
];

function CountUp({ to, delay = 0 }: { to: number; delay?: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      const steps = 24;
      const inc = to / steps;
      let cur = 0;
      const iv = setInterval(() => {
        cur = Math.min(cur + inc, to);
        setVal(Math.round(cur));
        if (cur >= to) clearInterval(iv);
      }, 38);
      return () => clearInterval(iv);
    }, delay);
    return () => clearTimeout(t);
  }, [to, delay]);
  return <>{val}</>;
}

export function AuthLeftPanel() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setIdx((i) => (i + 1) % STORIES.length), 4200);
    return () => clearInterval(iv);
  }, []);

  const story = STORIES[idx];

  return (
    <div className="hidden lg:flex w-[480px] flex-shrink-0 flex-col relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 dark:hidden"
        style={{
          background:
            "linear-gradient(145deg, hsl(210 40% 96%) 0%, hsl(220 50% 94%) 50%, hsl(240 30% 96%) 100%)",
        }}
      />
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          background:
            "linear-gradient(145deg, hsl(221 70% 8%) 0%, hsl(240 30% 6%) 50%, hsl(260 40% 7%) 100%)",
        }}
      />

      {/* Drifting orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, hsl(199 89% 48% / 0.12) 0%, transparent 65%)",
          }}
          animate={{ x: [0, 14, 0], y: [0, -10, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 right-[-10%] w-[350px] h-[350px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, hsl(250 80% 55% / 0.1) 0%, transparent 65%)",
          }}
          animate={{ x: [0, -12, 0], y: [0, 12, 0] }}
          transition={{
            duration: 11,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.2,
          }}
        />
      </div>

      {/* Fine grid */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(199 89% 48%) 1px,transparent 1px),linear-gradient(90deg,hsl(199 89% 48%) 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full p-10 justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pidgin-main.png" alt="Pidgin" className="w-10 h-10" />
        </a>

        {/* Middle */}
        <div className="space-y-6">
          <div>
            <p className="text-gray-400 dark:text-white/40 text-xs font-semibold uppercase tracking-[0.2em] mb-2">
              Your digest, today
            </p>
            <h2 className="text-gray-900 dark:text-white text-2xl font-bold leading-tight tracking-tight">
              Every newsletter.
              <br />
              <span
                style={{
                  background:
                    "linear-gradient(90deg, hsl(199 89% 45%), hsl(250 80% 60%))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Zero effort.
              </span>
            </h2>
          </div>

          {/* Floating mock card */}
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
            className="rounded-xl border border-gray-200 dark:border-white/[0.07] bg-white/70 dark:bg-white/[0.04] backdrop-blur-sm p-4 min-h-[168px]"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.38, ease: "easeOut" }}
                className="space-y-3"
              >
                {/* Row: source + category */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <motion.div
                      className="w-2 h-2 rounded-full bg-sky-500"
                      animate={{ opacity: [1, 0.35, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <span className="text-gray-500 dark:text-white/50 text-xs">
                      {story.source} · {story.time}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full border ${story.catStyle}`}
                  >
                    {story.category}
                  </span>
                </div>

                {/* Headline */}
                <p className="text-gray-800 dark:text-white/90 text-sm font-semibold leading-snug">
                  {story.headline}
                </p>
                <p className="text-gray-400 dark:text-white/40 text-xs leading-relaxed">
                  {story.snippet}
                </p>

                {/* Badges */}
                <div className="flex items-center gap-2 pt-1">
                  <AnimatePresence>
                    {story.hasPost && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.75 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.75 }}
                        transition={{
                          delay: 0.18,
                          type: "spring",
                          stiffness: 380,
                          damping: 22,
                        }}
                        className="h-6 px-2.5 rounded-md bg-sky-500/10 border border-sky-500/20 flex items-center gap-1.5"
                      >
                        <motion.div
                          className="w-1.5 h-1.5 rounded-full bg-sky-500"
                          animate={{ opacity: [1, 0.25, 1] }}
                          transition={{ duration: 1.6, repeat: Infinity }}
                        />
                        <Linkedin className="w-3 h-3 text-sky-500" />
                        <span className="text-[10px] text-sky-500 font-medium">
                          Post ready
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="h-6 px-2.5 rounded-md bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-gray-400 dark:text-white/30" />
                    <span className="text-[10px] text-gray-400 dark:text-white/30 font-medium">
                      Generate X post
                    </span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Counting stats */}
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                [12, "newsletters", 0],
                [8, "posts ready", 180],
                [3, "sources", 340],
              ] as [number, string, number][]
            ).map(([target, label, delay]) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: delay / 1000 + 0.2, duration: 0.45 }}
                className="rounded-lg border border-gray-200 dark:border-white/[0.06] bg-white/60 dark:bg-white/[0.03] px-3 py-2.5 transition-colors cursor-default"
              >
                <p className="text-gray-900 dark:text-white font-bold text-lg leading-none">
                  <CountUp to={target} delay={delay + 400} />
                </p>
                <p className="text-gray-400 dark:text-white/35 text-[10px] mt-0.5">{label}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <p className="text-gray-300 dark:text-white/20 text-[11px]">
          Read-only Gmail · No data sold · Free
        </p>
      </div>
    </div>
  );
}
