"use client";

import { useSignIn, useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import Link from "next/link";
import { AuthLeftPanel } from "@/components/auth-left-panel";
import AppLoading from "@/components/app-loading";
import {
  INVITE_ONLY_MESSAGE,
  getAuthErrorMessage,
  getInviteOnlyWaitlistUrl,
  isInviteOnlyEnabled,
  isInviteOnlyAuthError,
} from "@/lib/invite-only";

export default function SignInPage() {
  const { signIn, fetchStatus } = useSignIn();
  const { isSignedIn, isLoaded: userLoaded } = useUser();
  const inviteOnly = isInviteOnlyEnabled();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [oauthLoading, setOauthLoading] = useState(false);

  const isLoading = fetchStatus === "fetching";

  function sendToWaitlist() {
    setError(INVITE_ONLY_MESSAGE);
    window.setTimeout(() => {
      window.location.href = getInviteOnlyWaitlistUrl("sign-in");
    }, 900);
  }

  useEffect(() => {
    if (userLoaded && isSignedIn) {
      window.location.href = "/dashboard";
    }
  }, [userLoaded, isSignedIn]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!signIn) return;
    setError("");
    try {
      const { error: passwordErr } = await signIn.password({
        identifier: email,
        password,
      });
      if (passwordErr) {
        const message = getAuthErrorMessage(passwordErr, "Invalid email or password.");
        if (inviteOnly && isInviteOnlyAuthError(message)) sendToWaitlist();
        else setError(message);
        return;
      }

      const { error: finalizeErr } = await signIn.finalize();
      if (finalizeErr) {
        setError(getAuthErrorMessage(finalizeErr, "Could not complete sign-in."));
        return;
      }

      window.location.href = "/dashboard";
    } catch (err) {
      const message = getAuthErrorMessage(err, "Invalid email or password.");
      if (inviteOnly && isInviteOnlyAuthError(message)) sendToWaitlist();
      else setError(message);
    }
  }

  async function handleGoogleOAuth() {
    if (!signIn) {
      setError("Sign-in not ready — please refresh the page.");
      return;
    }
    setOauthLoading(true);
    setError("");
    const origin = window.location.origin;
    const redirectTimeout = window.setTimeout(() => {
      setOauthLoading(false);
      setError("Could not start Google sign-in. Please refresh and try again.");
    }, 10000);
    try {
      const { error: err } = await signIn.create({
        strategy: "oauth_google",
        redirectUrl: `${origin}/sign-in/sso-callback`,
        actionCompleteRedirectUrl: `${origin}/dashboard`,
        signUpIfMissing: !inviteOnly,
      });
      window.clearTimeout(redirectTimeout);
      if (err) {
        const message = getAuthErrorMessage(err, "Could not start Google sign-in.");
        if (inviteOnly && isInviteOnlyAuthError(message)) sendToWaitlist();
        else setError(message);
        setOauthLoading(false);
      }
    } catch (err) {
      window.clearTimeout(redirectTimeout);
      const message = getAuthErrorMessage(err, "Could not start Google sign-in.");
      if (inviteOnly && isInviteOnlyAuthError(message)) sendToWaitlist();
      else setError(message);
      setOauthLoading(false);
    }
  }

  if (!userLoaded || isSignedIn) {
    return <AppLoading />;
  }

  return (
    <div className="min-h-screen flex overflow-hidden bg-[hsl(240_10%_3.9%)] text-white">
      <AuthLeftPanel />

      {/* ── Right form panel ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-background text-foreground">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-5 py-4 border-b border-border/50">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pidgin-main.png" alt="Pidgin" className="w-7 h-7" />
            <span className="font-semibold text-sm">Pidgin</span>
          </Link>
          <Link href={inviteOnly ? "/waitlist" : "/sign-up"} className="text-xs text-primary  font-medium">
            {inviteOnly ? "Request access" : "Sign up"}
          </Link>
        </div>

        {/* Desktop: top-right link */}
        <div className="hidden lg:flex justify-end px-10 pt-8">
          <p className="text-xs text-muted-foreground">
            No account?{" "}
            <Link href={inviteOnly ? "/waitlist" : "/sign-up"} className="text-primary  font-medium">
              {inviteOnly ? "Request access" : "Sign up"}
            </Link>
          </p>
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-sm">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="space-y-7"
            >
              {/* Heading */}
              <div className="space-y-1">
                <h1 className="text-[1.75rem] font-bold tracking-tight">
                  Welcome back
                </h1>
                <p className="text-[0.9rem] text-muted-foreground">
                  Sign in to your Pidgin account
                </p>
              </div>

              {/* Google SSO */}
              <motion.button
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                type="button"
                onClick={handleGoogleOAuth}
                disabled={oauthLoading || isLoading || !signIn}
                className="w-full h-11 rounded-xl border border-border/80 bg-card hover:bg-secondary/80 flex items-center justify-center gap-2.5 text-sm font-medium shadow-sm transition-all disabled:opacity-50"
              >
                <GoogleIcon />
                {oauthLoading ? "Redirecting…" : "Continue with Google"}
              </motion.button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-3 text-[11px] text-muted-foreground/50 uppercase tracking-widest">
                    or
                  </span>
                </div>
              </div>

              {/* Email form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="pl-10 h-11 text-sm bg-secondary/40 border-border/60 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/60 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="pl-10 pr-11 h-11 text-sm bg-secondary/40 border-border/60 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/60 transition-all"
                    />
                    <button
                      type="button"
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-destructive bg-destructive/8 border border-destructive/20 rounded-lg px-3.5 py-2.5"
                  >
                    {error}
                  </motion.p>
                )}

                <motion.button
                  type="submit"
                  whileHover={{ opacity: 0.92 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isLoading || !signIn}
                  className="relative w-full h-11 rounded-xl text-white text-sm font-semibold overflow-hidden disabled:opacity-60 mt-1 shadow-lg shadow-primary/20"
                  style={{
                    background:
                      "linear-gradient(135deg, hsl(199 89% 42%) 0%, hsl(221 83% 53%) 100%)",
                  }}
                >
                  <span className="relative z-10">
                    {isLoading ? "Signing in…" : "Sign in"}
                  </span>
                  {/* shimmer */}
                  <motion.span
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12"
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{
                      duration: 2.2,
                      repeat: Infinity,
                      repeatDelay: 3,
                      ease: "easeInOut",
                    }}
                  />
                </motion.button>
              </form>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
