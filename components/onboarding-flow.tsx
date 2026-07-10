"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Inbox, Check, X, Sparkles, ArrowRight } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

interface OnboardingFlowProps {
  gmailConnected: boolean;
  onStartScan: () => void;
  scanning: boolean;
}

const fadeSlide = {
  initial: { opacity: 0, y: 24 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
  exit: {
    opacity: 0,
    y: -16,
    transition: { duration: 0.22, ease: "easeIn" as const },
  },
};

const staggerList = {
  animate: { transition: { staggerChildren: 0.08, delayChildren: 0.25 } },
};

const listItem = {
  initial: { opacity: 0, x: -10 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: "easeOut" as const },
  },
};

// ── Step indicator ─────────────────────────────────────────────────────────────
function StepDots({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-3 mb-12">
      {([1, 2, 3] as const).map((s) => {
        const done = s < current;
        const active = s === current;
        return (
          <div key={s} className="flex items-center gap-3">
            <motion.div
              layout
              className={`flex items-center justify-center rounded-full text-[11px] font-semibold transition-all duration-300 ${
                done
                  ? "w-6 h-6 bg-primary text-white"
                  : active
                    ? "w-6 h-6 bg-primary text-white ring-4 ring-primary/20"
                    : "w-5 h-5 bg-secondary text-muted-foreground/50 text-[10px]"
              }`}
            >
              {done ? <Check className="w-3 h-3" /> : s}
            </motion.div>
            {s < 3 && (
              <div
                className={`h-px w-10 transition-colors duration-500 ${s < current ? "bg-primary/60" : "bg-border"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1: Morning Brief value prop → Connect Gmail ────────────────────────────
function StepConnect() {
  const [connecting, setConnecting] = React.useState(false);

  const perms = [
    { label: "Read your newsletters", ok: true },
    { label: "Send emails on your behalf", ok: false },
    { label: "Delete or modify emails", ok: false },
  ];

  return (
    <motion.div
      key="step1"
      {...fadeSlide}
      className="w-full max-w-sm text-center"
    >
      {/* Icon */}
      <div className="flex justify-center mb-8">
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-2xl scale-[1.6]" />
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            className="relative w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center"
          >
            <Sparkles className="w-9 h-9 text-primary" />
          </motion.div>
        </div>
      </div>

      {/* Text */}
      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.35 }}
        className="text-2xl font-bold tracking-tight mb-2"
      >
        Here&apos;s what changed while you were building
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.22, duration: 0.35 }}
        className="text-sm text-muted-foreground leading-relaxed mb-8"
      >
        Pidgin reads your newsletters and ranks what actually matters.
        <br />
        Read-only access. We never send or delete anything.
      </motion.p>

      {/* Permissions */}
      <motion.ul
        variants={staggerList}
        initial="initial"
        animate="animate"
        className="text-left space-y-2.5 mb-10 bg-secondary/30 border border-border/50 rounded-xl px-5 py-4"
      >
        {perms.map(({ label, ok }) => (
          <motion.li
            key={label}
            variants={listItem}
            className="flex items-center gap-3"
          >
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${ok ? "bg-emerald-500/20 text-emerald-400" : "bg-secondary text-muted-foreground/30"}`}
            >
              {ok ? (
                <Check className="w-2.5 h-2.5" />
              ) : (
                <X className="w-2.5 h-2.5" />
              )}
            </span>
            <span
              className={`text-sm ${ok ? "text-foreground/80" : "text-muted-foreground/40 line-through"}`}
            >
              {label}
            </span>
          </motion.li>
        ))}
      </motion.ul>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.35 }}
      >
        <button
          disabled={connecting}
          onClick={() => {
            setConnecting(true);
            window.location.href = "/api/auth/google";
          }}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-80 disabled:scale-100 disabled:cursor-not-allowed"
        >
          {connecting ? (
            <>
              <Spinner /> Connecting…
            </>
          ) : (
            <>
              Get my Morning Brief <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── Step 2: Scan inbox ─────────────────────────────────────────────────────────
function StepScan({
  onStartScan,
  scanning,
}: {
  onStartScan: () => void;
  scanning: boolean;
}) {
  return (
    <motion.div
      key="step2"
      {...fadeSlide}
      className="w-full max-w-sm text-center"
    >
      {/* Icon */}
      <div className="flex justify-center mb-8">
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl bg-indigo-500/15 blur-2xl scale-[1.6]" />
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            className="relative w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center"
          >
            <Inbox className="w-9 h-9 text-primary" />
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </span>
          </motion.div>
        </div>
      </div>

      {/* Gmail connected badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-6"
      >
        <Check className="w-3 h-3" />
        Gmail connected
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.35 }}
        className="text-2xl font-bold tracking-tight mb-2"
      >
        Find your newsletters
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.26, duration: 0.35 }}
        className="text-sm text-muted-foreground leading-relaxed mb-10"
      >
        We&apos;ll scan today&apos;s inbox and show you what arrived.
        <br />
        You pick what to import — nothing happens automatically.
      </motion.p>

      {/* What happens next */}
      <motion.div
        variants={staggerList}
        initial="initial"
        animate="animate"
        className="text-left space-y-3 mb-10 bg-secondary/30 border border-border/50 rounded-xl px-5 py-4"
      >
        {[
          {
            step: "1",
            text: "We scan your inbox — metadata only, no body download yet",
          },
          {
            step: "2",
            text: "You see a list of newsletters found — tick the ones you want",
          },
          {
            step: "3",
            text: "Claude reads and summarises each one you selected",
          },
        ].map(({ step, text }) => (
          <motion.div
            key={step}
            variants={listItem}
            className="flex items-start gap-3"
          >
            <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              {step}
            </span>
            <span className="text-sm text-muted-foreground leading-relaxed">
              {text}
            </span>
          </motion.div>
        ))}
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.35 }}
      >
        <button
          onClick={onStartScan}
          disabled={scanning}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:scale-100 disabled:cursor-not-allowed"
        >
          {scanning ? (
            <>
              <Spinner /> Scanning…
            </>
          ) : (
            <>
              Scan inbox <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
export function OnboardingFlow({
  gmailConnected,
  onStartScan,
  scanning,
}: OnboardingFlowProps) {
  const step = gmailConnected ? 2 : 1;

  return (
    <div className="flex flex-col items-center justify-center min-h-[56vh] py-12 px-4">
      <StepDots current={step as 1 | 2 | 3} />
      <AnimatePresence mode="wait">
        {step === 1 && <StepConnect key="connect" />}
        {step === 2 && (
          <StepScan key="scan" onStartScan={onStartScan} scanning={scanning} />
        )}
      </AnimatePresence>
    </div>
  );
}
