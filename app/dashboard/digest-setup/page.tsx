"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown, ArrowLeft, Loader2, Mail } from "lucide-react";
import { motion } from "framer-motion";

const MAX_SOURCES = 7;

function extractSenderName(email: string) {
  const match = email.match(/^(.+?)\s*</);
  if (match) return match[1].trim().replace(/^["']|["']$/g, "");
  return email.split("@")[0];
}

interface DigestSource {
  source_email: string;
  priority: number;
  enabled: boolean;
}

export default function DigestSetupPage() {
  const router = useRouter();
  const [sources, setSources] = useState<DigestSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/digest/sources")
      .then((r) => r.json())
      .then((data) => {
        setSources(data.sources ?? []);
      })
      .catch(() => setError("Failed to load your newsletters."))
      .finally(() => setLoading(false));
  }, []);

  const enabledCount = sources.filter((s) => s.enabled).length;

  const toggleEnabled = (email: string) => {
    setSources((prev) =>
      prev.map((s) => {
        if (s.source_email !== email) return s;
        // Enforce max cap
        if (!s.enabled && enabledCount >= MAX_SOURCES) return s;
        return { ...s, enabled: !s.enabled };
      })
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
    if (enabledCount === 0) return;
    setSaving(true);
    try {
      const sourcesRes = await fetch("/api/digest/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources }),
      });
      if (!sourcesRes.ok) throw new Error("Failed to save sources");

      const enableRes = await fetch("/api/digest/enable", { method: "POST" });
      if (!enableRes.ok) throw new Error("Failed to enable digest");

      router.push("/dashboard?digest=enabled");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-lg mx-auto px-4 py-10">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Set up your daily digest</h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Choose up to {MAX_SOURCES} newsletters and set the order they appear in your email.
            You can change this any time.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {sources.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card px-6 py-10 text-center">
            <Mail className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No newsletters found. Sync your inbox first to get started.
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="mt-4 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              Go to dashboard
            </button>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
                Sources
              </p>
              <p className={`text-xs font-medium ${enabledCount >= MAX_SOURCES ? "text-amber-400" : "text-muted-foreground/60"}`}>
                {enabledCount} / {MAX_SOURCES} selected
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
              {sources.map((source, index) => (
                <motion.div
                  key={source.source_email}
                  layout
                  transition={{ type: "spring", damping: 30, stiffness: 300 }}
                  className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${
                    source.enabled ? "" : "opacity-50"
                  }`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleEnabled(source.source_email)}
                    className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      source.enabled
                        ? "bg-primary border-primary"
                        : enabledCount >= MAX_SOURCES
                        ? "border-border cursor-not-allowed"
                        : "border-border hover:border-primary/60"
                    }`}
                  >
                    {source.enabled && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {extractSenderName(source.source_email)}
                    </p>
                    <p className="text-xs text-muted-foreground/50 truncate">
                      #{index + 1} in digest
                    </p>
                  </div>

                  {/* Priority arrows */}
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="p-1 rounded text-muted-foreground/40 hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveDown(index)}
                      disabled={index === sources.length - 1}
                      className="p-1 rounded text-muted-foreground/40 hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground/50 mt-3">
              Unselected newsletters will still appear in the app, just not in your email digest.
            </p>

            <div className="flex items-center gap-3 mt-8">
              <button
                onClick={handleSave}
                disabled={enabledCount === 0 || saving}
                className="flex-1 h-11 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-40 hover:brightness-110 transition-all flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Enable daily digest"
                )}
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="h-11 px-5 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Maybe later
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
