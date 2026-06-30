import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Metadata } from "next";

const CAT_STYLE: Record<string, string> = {
  "AI & ML": "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/35 dark:border-indigo-500/25",
  Tech: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/35 dark:border-blue-500/25",
  Science: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/35 dark:border-cyan-500/25",
  Business: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/35 dark:border-amber-500/25",
  Finance: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/35 dark:border-green-500/25",
  Politics: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/35 dark:border-red-500/25",
  Health: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/35 dark:border-emerald-500/25",
  Startups: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/35 dark:border-purple-500/25",
  Other: "bg-zinc-500/15 text-zinc-500 dark:text-zinc-400 border-zinc-500/35 dark:border-zinc-500/25",
};

async function getSummary(id: string) {
  const { data } = await supabase
    .from("summaries")
    .select("*")
    .eq("id", id)
    .single();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const s = await getSummary(id);
  if (!s) return { title: "Pidgin" };
  return {
    title: s.newsletter_title,
    description: s.summary?.substring(0, 160) ?? "",
    openGraph: {
      title: s.newsletter_title,
      description: s.summary?.substring(0, 160) ?? "",
      siteName: "Pidgin",
      type: "article",
    },
    twitter: {
      card: "summary",
      title: s.newsletter_title,
      description: s.summary?.substring(0, 160) ?? "",
    },
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const s = await getSummary(id);
  if (!s) notFound();

  const senderName =
    s.source_email
      .match(/^(.+?)\s*</)?.[1]
      ?.trim()
      .replace(/^["']|["']$/g, "") ?? s.source_email.split("@")[0];

  const keyPoints: string[] = Array.isArray(s.key_points) ? s.key_points : [];
  const cat = s.category || "Other";
  const catStyle = CAT_STYLE[cat] ?? CAT_STYLE["Other"];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-2xl mx-auto py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/pidgin-main.png"
              alt="Pidgin"
              className="w-8 h-8 rounded-md"
            />
          </div>
          <a
            href="/dashboard"
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Open app →
          </a>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-start justify-center px-4 py-12 sm:py-16">
        <article className="w-full max-w-2xl">
          {/* Meta row */}
          <div className="flex items-center gap-2 mb-5">
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${catStyle}`}
            >
              {cat}
            </span>
            <span className="text-xs text-muted-foreground/60">
              {senderName}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight mb-6">
            {s.newsletter_title}
          </h1>

          {/* Summary */}
          {s.summary && (
            <p className="text-base text-foreground/75 leading-[1.8] mb-8">
              {s.summary}
            </p>
          )}

          {/* Key points */}
          {keyPoints.length > 0 && (
            <div className="mb-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/40 mb-4">
                Key points
              </p>
              <ul className="space-y-3">
                {keyPoints.map((pt, i) => (
                  <li
                    key={i}
                    className="flex gap-3 text-sm text-foreground/70 leading-relaxed"
                  >
                    <span className="text-primary mt-0.5 flex-shrink-0 text-xs">
                      ▸
                    </span>
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Simple explanation */}
          {s.simple_explanation && (
            <div className="border-l-2 border-border pl-4 mb-10">
              <p className="text-sm text-muted-foreground/60 italic leading-relaxed">
                {s.simple_explanation}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between flex-wrap gap-4 border-t border-border/50">
            <p className="text-[11px] text-muted-foreground/40">
              Summarized by{" "}
              <span className="font-semibold text-muted-foreground/60">
                Pidgin
              </span>
            </p>
            <a
              href="/waitlist"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 mt-6 rounded-xl text-xs font-semibold text-white transition-all shadow-sm shadow-primary/20 hover:opacity-90"
              style={{
                background:
                  "linear-gradient(135deg, hsl(199 89% 42%) 0%, hsl(221 83% 53%) 100%)",
              }}
            >
              Get your own digest →
            </a>
          </div>
        </article>
      </main>
    </div>
  );
}
