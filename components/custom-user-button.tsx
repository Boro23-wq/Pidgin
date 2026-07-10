"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { LogOut, Settings, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { apiFetch } from "@/lib/api-fetch";

export function CustomUserButton() {
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // The route revokes Gmail, erases every row, then deletes the Clerk user —
  // which invalidates this session. Hard-navigate rather than router.push so
  // nothing tries to re-render against a dead session.
  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);

    const res = await apiFetch("/api/account", { method: "DELETE" });
    if (res.ok) {
      window.location.href = "/";
      return;
    }

    setDeleting(false);
    setDeleteError(
      res.reason === "unauthenticated"
        ? "Your session expired. Please sign in again."
        : "Could not delete your account. Please try again, or email hello@pidgin.site.",
    );
  };

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  if (!user) return null;

  const initials =
    [user.firstName, user.lastName]
      .filter(Boolean)
      .map((n) => n![0].toUpperCase())
      .join("") || user.emailAddresses[0]?.emailAddress[0]?.toUpperCase() || "?";

  const displayName = user.fullName || user.emailAddresses[0]?.emailAddress || "";
  const email = user.emailAddresses[0]?.emailAddress || "";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded-full overflow-hidden border-2 border-border hover:border-primary/50 transition-colors flex-shrink-0"
        aria-label="Account menu"
      >
        {user.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.imageUrl} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary text-xs font-semibold">
            {initials}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-56 rounded-xl border border-border bg-card shadow-xl shadow-black/20 overflow-hidden">
          {/* User info */}
          <div className="px-3.5 py-3 border-b border-border/60">
            <p className="text-sm font-semibold truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{email}</p>
          </div>

          {/* Actions */}
          <div className="p-1">
            <button
              onClick={() => {
                setOpen(false);
                openUserProfile();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-secondary transition-colors text-left"
            >
              <Settings className="w-3.5 h-3.5 text-muted-foreground" />
              Manage account
            </button>
            <button
              onClick={() => {
                setOpen(false);
                signOut(() => router.push("/"));
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-secondary transition-colors text-left"
            >
              <LogOut className="w-3.5 h-3.5 text-muted-foreground" />
              Sign out
            </button>
          </div>

          {/* Separated from the reversible actions above — this one isn't. */}
          <div className="p-1 border-t border-border/60">
            <button
              onClick={() => {
                setOpen(false);
                setDeleteError(null);
                setConfirmDelete(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete account
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {confirmDelete && (
          <ConfirmDialog
            key="confirm-delete-account"
            destructive
            title="Delete your account?"
            confirmLabel="Delete everything"
            busyLabel="Deleting…"
            confirmPhrase="DELETE"
            icon={<Trash2 className="w-4 h-4" />}
            busy={deleting}
            onCancel={() => setConfirmDelete(false)}
            onConfirm={handleDeleteAccount}
            body={
              <>
                <p>This permanently erases:</p>
                <ul className="mt-1.5 space-y-0.5 list-disc list-inside">
                  <li>Your Gmail connection, revoked with Google</li>
                  <li>Every summary, bookmark and topic history</li>
                  <li>Your Pidgin account itself</li>
                </ul>
                <p className="mt-2">This cannot be undone.</p>
                {deleteError && (
                  <p className="mt-2.5 text-red-400 font-medium">{deleteError}</p>
                )}
              </>
            }
          />
        )}
      </AnimatePresence>
    </div>
  );
}
