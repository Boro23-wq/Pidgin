import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Metadata } from "next";

async function getSummary(id: string) {
  const { data } = await supabase
    .from("summaries")
    .select("*")
    .eq("id", id)
    .single();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
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

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSummary(id);
  if (!s) notFound();

  const senderName = s.source_email.match(/^(.+?)\s*</)?.[1]?.trim().replace(/^["']|["']$/g, "")
    ?? s.source_email.split("@")[0];

  const keyPoints: string[] = Array.isArray(s.key_points) ? s.key_points : [];

  return (
    <div className="min-h-screen bg-[#030712] text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pidgin-main.png" alt="Pidgin" className="w-6 h-6 rounded-md" />
          <span className="text-sm font-bold tracking-tight">Pidgin</span>
        </div>
        <a
          href="/dashboard"
          className="text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          Open app →
        </a>
      </header>

      {/* Card */}
      <main className="flex-1 flex items-start justify-center px-4 py-16">
        <article className="w-full max-w-2xl">
          {/* Source + category */}
          <div className="flex items-center gap-2 mb-6">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
              {senderName}
            </span>
            {s.category && (
              <>
                <span className="text-white/20">·</span>
                <span className="text-[11px] text-white/30">{s.category}</span>
              </>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight mb-8 text-white">
            {s.newsletter_title}
          </h1>

          {/* Summary */}
          {s.summary && (
            <p className="text-base text-white/70 leading-[1.8] mb-8">
              {s.summary}
            </p>
          )}

          {/* Key points */}
          {keyPoints.length > 0 && (
            <div className="mb-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/25 mb-4">
                Key points
              </p>
              <ul className="space-y-3">
                {keyPoints.map((pt, i) => (
                  <li key={i} className="flex gap-3 text-sm text-white/60 leading-relaxed">
                    <span className="text-indigo-400 mt-0.5 flex-shrink-0">▸</span>
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Simple explanation */}
          {s.simple_explanation && (
            <div className="border-l-2 border-white/10 pl-4 mb-10">
              <p className="text-sm text-white/40 italic leading-relaxed">
                {s.simple_explanation}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-6 border-t border-white/[0.06]">
            <p className="text-[11px] text-white/25">
              Summarized by{" "}
              <span className="font-semibold text-white/40">Pidgin</span>
            </p>
            <a
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Get your own digest →
            </a>
          </div>
        </article>
      </main>
    </div>
  );
}
