"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useWaitlist } from "@clerk/nextjs";

const ROLES = [
  "Solo founder",
  "Indie builder",
  "Creator",
  "Startup operator",
  "Other",
];
const COUNTS = ["1–5", "6–10", "11–20", "20+"];
const USE_CASES = [
  "Summarize newsletters",
  "Find the best ideas",
  "Save time",
  "Generate LinkedIn posts",
  "Generate X posts",
  "Send a daily digest",
];
const ACCESS_TYPES = ["I want alpha access", "Just keep me posted"];

function SelectOption({
  label,
  selected,
  onClick,
  multi,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  multi?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2.5 w-full text-left px-4 py-3 rounded-xl border text-sm transition-all duration-150 ${
        selected
          ? "border-primary/60 bg-primary/8 text-foreground"
          : "border-border/60 bg-card/40 text-muted-foreground hover:border-border hover:text-foreground"
      }`}
    >
      <span
        className={`flex-shrink-0 w-4 h-4 rounded-${multi ? "sm" : "full"} border flex items-center justify-center transition-all ${
          selected ? "border-primary bg-primary" : "border-border/60"
        }`}
      >
        {selected && <Check className="w-2.5 h-2.5 text-white" />}
      </span>
      {label}
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-semibold text-foreground mb-2.5">{children}</p>
  );
}

export default function WaitlistPage() {
  const router = useRouter();
  const { waitlist } = useWaitlist();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [count, setCount] = useState("");
  const [useCases, setUseCases] = useState<string[]>([]);
  const [accessType, setAccessType] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyOnList, setAlreadyOnList] = useState(false);
  const [error, setError] = useState("");

  const toggleUseCase = (val: string) => {
    setUseCases((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Email is required.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          role: role || null,
          newsletterCount: count || null,
          useCases: useCases.length ? useCases : null,
          accessType: accessType || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (data.existing) {
        setAlreadyOnList(true);
        setSubmitted(true);
        return;
      }
      // Add to Clerk waitlist as Pending so it's invitable from the dashboard
      if (waitlist) {
        const { error: clerkErr } = await waitlist.join({ emailAddress: email });
        if (clerkErr) {
          console.error("[waitlist] Clerk join error:", clerkErr);
        }
      }
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pidgin-main.png" alt="Pidgin" className="w-8 h-8" />
          </button>
          <span className="text-xs text-muted-foreground/60">
            Alpha waitlist
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="thanks"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="text-center py-20"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 20,
                  delay: 0.1,
                }}
                className="w-14 h-14 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto mb-6"
              >
                <Check className="w-7 h-7 text-primary" />
              </motion.div>
              <h2 className="text-2xl font-bold tracking-tight mb-3">
                {alreadyOnList ? "You're already on the list." : "You're on the list."}
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
                {alreadyOnList
                  ? "We already have your email. I'll reach out when your alpha invite is ready."
                  : "Pidgin is being built for founders and builders who want to stay sharp without drowning in newsletter tabs. I'll reach out when alpha invites open."}
              </p>
              <button
                onClick={() => router.push("/")}
                className="mt-8 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                ← Back to home
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Header */}
              <div className="mb-10">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/25 bg-primary/8 text-primary text-xs font-medium mb-5">
                  <motion.span
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-1.5 h-1.5 rounded-full bg-primary"
                  />
                  Early alpha · Limited spots
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight mb-4">
                  Stop pretending you&apos;ll read
                  <br />
                  <span
                    className="bg-clip-text text-transparent"
                    style={{
                      backgroundImage:
                        "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(199 89% 72%) 100%)",
                    }}
                  >
                    all those newsletters.
                  </span>
                </h1>
                <p className="text-muted-foreground text-base leading-relaxed max-w-lg">
                  Pidgin turns your newsletter backlog into daily summaries,
                  useful insights, and ready-to-post LinkedIn/X drafts without
                  opening Gmail.
                </p>
                <p className="mt-4 text-xs text-muted-foreground/50">
                  Early alpha spots are limited while we tune the Gmail filtering
                  and AI summaries.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Email */}
                <div>
                  <FieldLabel>
                    Email address <span className="text-primary">*</span>
                  </FieldLabel>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full h-11 px-4 rounded-xl border border-border/60 bg-card/40 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                </div>

                {/* Role */}
                <div>
                  <FieldLabel>What best describes you?</FieldLabel>
                  <div className="space-y-2">
                    {ROLES.map((r) => (
                      <SelectOption
                        key={r}
                        label={r}
                        selected={role === r}
                        onClick={() => setRole(role === r ? "" : r)}
                      />
                    ))}
                  </div>
                </div>

                {/* Newsletter count */}
                <div>
                  <FieldLabel>
                    How many newsletters do you subscribe to?
                  </FieldLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {COUNTS.map((c) => (
                      <SelectOption
                        key={c}
                        label={c}
                        selected={count === c}
                        onClick={() => setCount(count === c ? "" : c)}
                      />
                    ))}
                  </div>
                </div>

                {/* Use cases */}
                <div>
                  <FieldLabel>
                    What do you want Pidgin to help with most?
                  </FieldLabel>
                  <p className="text-xs text-muted-foreground/50 mb-2.5">
                    Select all that apply
                  </p>
                  <div className="space-y-2">
                    {USE_CASES.map((u) => (
                      <SelectOption
                        key={u}
                        label={u}
                        selected={useCases.includes(u)}
                        onClick={() => toggleUseCase(u)}
                        multi
                      />
                    ))}
                  </div>
                </div>

                {/* Access type */}
                <div>
                  <FieldLabel>Want early access or just updates?</FieldLabel>
                  <div className="space-y-2">
                    {ACCESS_TYPES.map((a) => (
                      <SelectOption
                        key={a}
                        label={a}
                        selected={accessType === a}
                        onClick={() => setAccessType(accessType === a ? "" : a)}
                      />
                    ))}
                  </div>
                </div>

                {error && <p className="text-sm text-red-400">{error}</p>}

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full h-12 rounded-xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />{" "}
                      Joining…
                    </>
                  ) : (
                    <>
                      Join the alpha waitlist{" "}
                      <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
                    </>
                  )}
                </motion.button>

                <p className="text-center text-xs text-muted-foreground/35">
                  No spam. Unsubscribe anytime.
                </p>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
