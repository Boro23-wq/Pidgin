"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <p className="text-sm text-muted-foreground">Something went wrong.</p>
        <button
          onClick={reset}
          className="text-xs text-primary hover:text-primary/80 underline"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
