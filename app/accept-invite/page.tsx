"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Check, AlertCircle } from "lucide-react";

type State = "loading" | "valid" | "error";

export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  const [state, setState] = useState<State>("loading");
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!code) {
      setErrorMsg("No invite code found in the link.");
      setState("error");
      return;
    }

    fetch("/api/invite/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setEmail(data.email);
          setState("valid");
        } else {
          setErrorMsg(data.error ?? "Invalid or expired invite.");
          setState("error");
        }
      })
      .catch(() => {
        setErrorMsg("Something went wrong. Please try again.");
        setState("error");
      });
  }, [code]);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {state === "loading" && (
          <div className="flex flex-col items-center gap-4">
            <span className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Validating your invite…</p>
          </div>
        )}

        {state === "valid" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
              className="w-14 h-14 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto mb-6"
            >
              <Check className="w-7 h-7 text-primary" />
            </motion.div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">You&apos;re invited</h1>
            <p className="text-muted-foreground text-sm mb-1">
              This invite is for <span className="text-foreground font-medium">{email}</span>
            </p>
            <p className="text-muted-foreground/60 text-xs mb-8">
              You can sign up with Google or email/password.
            </p>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/sign-up?invited=1")}
              className="w-full h-12 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Create your account →
            </motion.button>
          </motion.div>
        )}

        {state === "error" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center"
          >
            <div className="w-14 h-14 rounded-full bg-destructive/10 border border-destructive/25 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-7 h-7 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">Invite invalid</h1>
            <p className="text-muted-foreground text-sm mb-8">{errorMsg}</p>
            <button
              onClick={() => router.push("/waitlist")}
              className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              ← Join the waitlist
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
