"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">Something went wrong.</p>
          <button
            onClick={reset}
            className="text-xs text-primary hover:text-primary/80 transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
