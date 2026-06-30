"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

function FeedbackContent() {
  const params = useSearchParams();
  const status = params.get("status");
  const rating = params.get("rating");

  const isValid = status === "thanks";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background text-foreground">
      <div className="w-full max-w-sm text-center space-y-4">
        {isValid ? (
          <>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-lg font-semibold">Thanks for the feedback</h1>
              <p className="text-sm text-muted-foreground">
                {rating === "up"
                  ? "Glad the digest is hitting the mark."
                  : "We'll use this to make it better."}
              </p>
            </div>
            <a
              href="/dashboard"
              className="inline-block text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Back to dashboard →
            </a>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-lg font-semibold">Link expired</h1>
              <p className="text-sm text-muted-foreground">This feedback link is no longer valid.</p>
            </div>
            <a
              href="/dashboard"
              className="inline-block text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Back to dashboard →
            </a>
          </>
        )}
      </div>
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense>
      <FeedbackContent />
    </Suspense>
  );
}
