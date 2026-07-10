import { cn } from "@/lib/utils";

// The one loading indicator. Previously there were four near-identical
// hand-rolled rings plus a rotating RefreshCw icon — the refresh-arrows glyph
// reads as "reload this page", not "working", and spinning it looks like a
// stuck animation rather than progress.
//
// `border-current` inherits the button's text colour, so this works on both
// filled and ghost buttons without a variant prop.
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin flex-shrink-0",
        className,
      )}
    />
  );
}
