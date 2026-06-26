"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { LogOut, Settings } from "lucide-react";

export function CustomUserButton() {
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors text-left"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
