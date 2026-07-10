import Link from "next/link";

// Also what a private or expired /share/[id] link renders. Deliberately says
// nothing about whether the summary exists — "not found" and "not shared with
// you" must be indistinguishable from the outside.
export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/pidgin-main.png" alt="Pidgin" className="w-10 h-10 rounded-lg mx-auto" />
        <h1 className="text-2xl font-bold tracking-tight">Not found</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This page doesn&apos;t exist, or the story isn&apos;t shared publicly.
        </p>
        <Link
          href="/"
          className="inline-block text-xs font-semibold text-primary hover:text-primary/80 transition-colors pt-2"
        >
          Go to Pidgin →
        </Link>
      </div>
    </div>
  );
}
