"use client";

import { Waitlist } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function WaitlistPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.push("/")} className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pidgin-main.png" alt="Pidgin" className="w-8 h-8" />
          </button>
          <span className="text-xs text-muted-foreground/60">Alpha waitlist</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
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
                backgroundImage: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(199 89% 72%) 100%)",
              }}
            >
              all those newsletters.
            </span>
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed max-w-lg">
            Pidgin turns your newsletter backlog into daily summaries, useful insights, and ready-to-post LinkedIn/X drafts — without opening Gmail.
          </p>
        </div>

        <Waitlist />
      </main>
    </div>
  );
}
