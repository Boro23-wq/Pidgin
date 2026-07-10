"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

// Replaces window.confirm for destructive actions, which is unstyled, unthemed,
// and blocks the main thread. Follows SyncOverlay's backdrop + spring-in card
// idiom from the dashboard.
//
// Escape and backdrop-click both cancel, since cancelling is the safe outcome —
// but neither is honored while a request is in flight, because dismissing then
// would imply the action was cancelled when it may already have succeeded.
//
// `confirmPhrase` gates the confirm button behind typing an exact string. Use
// it only for genuinely irreversible actions (account deletion), never as
// friction on ordinary ones.
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  busyLabel,
  icon,
  confirmPhrase,
  onConfirm,
  onCancel,
  busy = false,
  destructive = false,
}: {
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  busyLabel?: string;
  icon?: React.ReactNode;
  confirmPhrase?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  destructive?: boolean;
}) {
  const [typed, setTyped] = useState("");
  const phraseSatisfied = !confirmPhrase || typed.trim() === confirmPhrase;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, busy]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={busy ? undefined : onCancel}
      />
      <motion.div
        className="relative z-10 w-full max-w-[380px] rounded-2xl border border-border bg-card px-6 py-6 shadow-2xl shadow-black/20"
        initial={{ scale: 0.96, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 4 }}
        transition={{ type: "spring", damping: 28, stiffness: 380 }}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
              destructive
                ? "bg-red-500/10 border border-red-500/20"
                : "bg-primary/10 border border-primary/20"
            }`}
          >
            <span className={destructive ? "text-red-400" : "text-primary"}>
              {icon ?? <AlertTriangle className="w-4 h-4" />}
            </span>
          </div>
          <div className="space-y-1.5 pt-0.5">
            <p id="confirm-dialog-title" className="text-sm font-semibold">
              {title}
            </p>
            <div className="text-xs text-muted-foreground leading-relaxed">{body}</div>
          </div>
        </div>

        {confirmPhrase && (
          <div className="mt-4 space-y-1.5">
            <label htmlFor="confirm-phrase" className="text-xs text-muted-foreground">
              Type <span className="font-semibold text-foreground">{confirmPhrase}</span> to
              confirm
            </label>
            <input
              id="confirm-phrase"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={busy}
              autoComplete="off"
              autoFocus
              className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-primary/60 transition-colors disabled:opacity-50"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            onClick={onCancel}
            disabled={busy}
            className="h-9 px-4 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy || !phraseSatisfied}
            autoFocus={!confirmPhrase}
            className={`h-9 px-4 rounded-full text-xs font-semibold text-white flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              destructive
                ? "bg-red-500 hover:bg-red-500/90"
                : "bg-primary hover:bg-primary/90"
            }`}
          >
            {busy && (
              <span className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
            )}
            {busy ? (busyLabel ?? "Working…") : confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
