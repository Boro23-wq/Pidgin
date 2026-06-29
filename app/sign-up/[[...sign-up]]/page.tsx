"use client";

import { useSignUp, useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff, KeyRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthLeftPanel } from "@/components/auth-left-panel";
import AppLoading from "@/components/app-loading";
import {
  INVITE_ONLY_MESSAGE,
  getAuthErrorMessage,
  getInviteOnlyWaitlistUrl,
  isInviteOnlyEnabled,
  isInviteOnlyAuthError,
} from "@/lib/invite-only";

type Step = "register" | "verify";

function isExistingAccountError(msg: string) {
  const m = msg.toLowerCase();
  return (
    m.includes("already") ||
    m.includes("taken") ||
    m.includes("in use") ||
    m.includes("exists")
  );
}

export default function SignUpPage() {
  const { signUp, fetchStatus } = useSignUp();
  const { isSignedIn, isLoaded: userLoaded } = useUser();
  const searchParams = useSearchParams();
  const inviteOnly = isInviteOnlyEnabled();
  const urlTicket =
    searchParams.get("__clerk_ticket") ?? searchParams.get("__clerk_invitation_token");

  const [step, setStep] = useState<Step>("register");
  const [storedTicket, setStoredTicket] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [accountExists, setAccountExists] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const isLoading = fetchStatus === "fetching";
  const ticket = urlTicket ?? storedTicket;
  const hasActiveSignUp =
    Boolean(signUp?.id) &&
    signUp?.status === "missing_requirements" &&
    !signUp?.canBeDiscarded;
  const isCompletingOAuthSignUp = hasActiveSignUp && Boolean(signUp?.emailAddress);
  const hasInvitationContext = Boolean(ticket || hasActiveSignUp);
  const isInvitedFlow = !inviteOnly || hasInvitationContext;

  function goToDashboard() {
    window.sessionStorage.removeItem("pidgin_clerk_invitation_ticket");
    window.location.href = "/dashboard";
  }

  function sendToWaitlist() {
    setError(INVITE_ONLY_MESSAGE);
    window.setTimeout(() => {
      window.location.href = getInviteOnlyWaitlistUrl("sign-up");
    }, 900);
  }

  useEffect(() => {
    if (userLoaded && isSignedIn) {
      goToDashboard();
    }
  }, [userLoaded, isSignedIn]);

  useEffect(() => {
    if (urlTicket) {
      window.sessionStorage.setItem("pidgin_clerk_invitation_ticket", urlTicket);
      setStoredTicket(urlTicket);
      return;
    }

    setStoredTicket(window.sessionStorage.getItem("pidgin_clerk_invitation_ticket"));
  }, [urlTicket]);

  useEffect(() => {
    if (signUp?.emailAddress) {
      setEmail(signUp.emailAddress);
    }
  }, [signUp?.emailAddress]);

  useEffect(() => {
    if (!signUp || signUp.status !== "complete") return;

    void signUp.finalize().then(goToDashboard);
  }, [signUp, signUp?.status]);

  async function handleGoogleOAuth() {
    if (!signUp) {
      setError("Sign-up not ready — please refresh the page.");
      return;
    }
    if (inviteOnly && !ticket) {
      sendToWaitlist();
      return;
    }
    setOauthLoading(true);
    setError("");
    const origin = window.location.origin;
    const redirectTimeout = window.setTimeout(() => {
      setOauthLoading(false);
      setError("Could not start Google sign-up. Please refresh and try again.");
    }, 10000);
    try {
      if (ticket) {
        const { error: ticketErr } = await signUp.create({
          strategy: "ticket",
          ticket,
        });
        if (ticketErr) {
          window.clearTimeout(redirectTimeout);
          setError(getAuthErrorMessage(ticketErr, "Invitation link is invalid or expired."));
          setOauthLoading(false);
          return;
        }
      }

      const { error: err } = await signUp.sso({
        strategy: "oauth_google",
        redirectUrl: `${origin}/sign-up/sso-callback`,
        redirectCallbackUrl: `${origin}/dashboard`,
      });
      window.clearTimeout(redirectTimeout);
      if (err) {
        const message = getAuthErrorMessage(err, "Could not start Google sign-up.");
        if (inviteOnly && isInviteOnlyAuthError(message)) sendToWaitlist();
        else setError(message);
        setOauthLoading(false);
      }
    } catch (err) {
      window.clearTimeout(redirectTimeout);
      const message = getAuthErrorMessage(err, "Could not start Google sign-up.");
      if (inviteOnly && isInviteOnlyAuthError(message)) sendToWaitlist();
      else setError(message);
      setOauthLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!signUp) return;
    setError("");
    setAccountExists(false);
    if (!isInvitedFlow) {
      sendToWaitlist();
      return;
    }
    try {
      if (hasActiveSignUp && !urlTicket) {
        const { error: passwordErr } = await signUp.password({ password });
        if (passwordErr) {
          setError(getAuthErrorMessage(passwordErr, "Could not finish your account."));
          return;
        }
        if ((signUp as { status?: string }).status === "complete") {
          await signUp.finalize();
          goToDashboard();
          return;
        }
        if (signUp.unverifiedFields.includes("email_address")) {
          const { error: sendErr } = await signUp.verifications.sendEmailCode();
          if (sendErr) {
            setError(getAuthErrorMessage(sendErr, "Could not send verification code."));
            return;
          }
          setStep("verify");
          return;
        }
        if (signUp.missingFields.length) {
          setError(`Missing account details: ${signUp.missingFields.join(", ")}.`);
          return;
        }
        setError("Could not finish your Google sign-up. Please refresh and try again.");
        return;
      }

      if (inviteOnly && !ticket) {
        sendToWaitlist();
        return;
      }

      if (ticket) {
        // Activate invitation ticket before email/password sign-up so Clerk
        // allows it through Waitlist mode restriction.
        const { error: ticketErr } = await signUp.create({ strategy: "ticket", ticket });
        if (ticketErr) {
          setError(getAuthErrorMessage(ticketErr, "Invitation link is invalid or expired."));
          return;
        }
      }
      const { error: err } = await signUp.password({
        emailAddress: email,
        password,
      });
      if (err) {
        const msg = getAuthErrorMessage(err, "Something went wrong. Try again.");
        if (inviteOnly && isInviteOnlyAuthError(msg)) {
          sendToWaitlist();
          return;
        }
        if (isExistingAccountError(msg)) {
          setAccountExists(true);
          setError("An account with this email already exists.");
        } else setError(msg);
        return;
      }
      if ((signUp as { status?: string }).status === "complete") {
        await signUp.finalize();
        goToDashboard();
        return;
      }
      const { error: sendErr } = await signUp.verifications.sendEmailCode();
      if (sendErr) {
        const msg = sendErr.message ?? "";
        if (isExistingAccountError(msg)) {
          setAccountExists(true);
          setError("An account with this email already exists.");
        } else setError(msg || "Could not send verification code.");
        return;
      }
      setStep("verify");
    } catch (e: unknown) {
      const msg = getAuthErrorMessage(e, "Something went wrong. Try again.");
      if (inviteOnly && isInviteOnlyAuthError(msg)) {
        sendToWaitlist();
        return;
      }
      if (isExistingAccountError(msg)) {
        setAccountExists(true);
        setError("An account with this email already exists.");
      } else setError(msg);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!signUp) return;
    setError("");
    const { error: err } = await signUp.verifications.verifyEmailCode({ code });
    if (err) {
      setError(err.message ?? "Invalid code. Check your email.");
      return;
    }
    if (signUp.status === "complete") {
      await signUp.finalize();
      goToDashboard();
    }
  }

  if (!userLoaded || isSignedIn) {
    return <AppLoading />;
  }

  return (
    <div className="min-h-screen flex overflow-hidden bg-[hsl(240_10%_3.9%)] text-white">
      <AuthLeftPanel />

      <div className="flex-1 flex flex-col bg-background text-foreground">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-5 py-4 border-b border-border/50">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pidgin-main.png" alt="Pidgin" className="w-7 h-7" />
            <span className="font-semibold text-sm">Pidgin</span>
          </Link>
          <Link href="/sign-in" className="text-xs text-primary font-medium">
            Sign in
          </Link>
        </div>

        {/* Desktop top-right link */}
        <div className="hidden lg:flex justify-end px-10 pt-8">
          <p className="text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link href="/sign-in" className="text-primary font-medium">
              Sign in
            </Link>
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-sm">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="space-y-7"
            >
              {/* Invitation banner */}
              {hasInvitationContext && (
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-primary/25 bg-primary/8">
                  <motion.span
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0"
                  />
                  <p className="text-xs text-primary font-medium">You&apos;ve been invited to Pidgin</p>
                </div>
              )}

              {/* Step tracker */}
              <div className="space-y-2">
                <div className="flex gap-1.5">
                  <motion.div
                    className="h-[3px] flex-1 rounded-full bg-primary"
                    initial={{ scaleX: 0, originX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                  <motion.div
                    className="h-[3px] flex-1 rounded-full"
                    animate={{
                      backgroundColor:
                        step === "verify" ? "hsl(var(--primary))" : "hsl(var(--border))",
                    }}
                    transition={{ duration: 0.35 }}
                  />
                </div>
                <div className="flex justify-between px-0.5">
                  <span className="text-[11px] text-muted-foreground">Account</span>
                  <span
                    className={`text-[11px] transition-colors duration-300 ${step === "verify" ? "text-foreground" : "text-muted-foreground/40"}`}
                  >
                    Verify
                  </span>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {step === "register" && (
                  <motion.div
                    key="register"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.28, ease: "easeOut" }}
                    className="space-y-6"
                  >
                    <div className="space-y-1">
                      <h1 className="text-[1.75rem] font-bold tracking-tight">
                        {isCompletingOAuthSignUp ? "Finish your account" : "Create your account"}
                      </h1>
                      <p className="text-[0.9rem] text-muted-foreground">
                        {isCompletingOAuthSignUp
                          ? "Google is connected. Choose a password to finish."
                          : "Start reading smarter in minutes"}
                      </p>
                    </div>

                    {/* Google */}
                    {!isCompletingOAuthSignUp && (
                      <>
                        <motion.button
                          whileHover={{ scale: 1.015 }}
                          whileTap={{ scale: 0.985 }}
                          type="button"
                          onClick={handleGoogleOAuth}
                          disabled={oauthLoading || isLoading || !signUp}
                          className="w-full h-11 rounded-xl border border-border/80 bg-card hover:bg-secondary/80 flex items-center justify-center gap-2.5 text-sm font-medium shadow-sm transition-all disabled:opacity-50"
                        >
                          <GoogleIcon />
                          {oauthLoading ? "Redirecting…" : "Continue with Google"}
                        </motion.button>

                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border/50" />
                          </div>
                          <div className="relative flex justify-center">
                            <span className="bg-background px-3 text-[11px] text-muted-foreground/50 uppercase tracking-widest">or</span>
                          </div>
                        </div>
                      </>
                    )}

                    {isCompletingOAuthSignUp && (
                      <div className="rounded-lg border border-primary/20 bg-primary/8 px-3.5 py-2.5 text-xs text-primary">
                        Continue with {signUp.emailAddress}
                      </div>
                    )}

                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setAccountExists(false); setError(""); }}
                            required
                            disabled={isCompletingOAuthSignUp}
                            autoComplete="email"
                            className="pl-10 h-11 text-sm bg-secondary/40 border-border/60 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/60 transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Choose a strong password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="new-password"
                            className="pl-10 pr-11 h-11 text-sm bg-secondary/40 border-border/60 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/60 transition-all"
                          />
                          <button
                            type="button"
                            tabIndex={-1}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
                            onClick={() => setShowPassword((v) => !v)}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`rounded-lg px-3.5 py-2.5 text-xs border ${
                            accountExists
                              ? "bg-amber-500/8 border-amber-500/25 text-amber-600 dark:text-amber-300"
                              : "bg-destructive/8 border-destructive/20 text-destructive"
                          }`}
                        >
                          <p className="font-medium">{error}</p>
                          {accountExists && (
                            <Link href="/sign-in" className="text-primary font-semibold mt-1 block">
                              Sign in to your existing account →
                            </Link>
                          )}
                        </motion.div>
                      )}

                      <motion.button
                        type="submit"
                        whileHover={{ opacity: 0.92 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={isLoading || !signUp}
                        className="relative w-full h-11 rounded-xl text-white text-sm font-semibold overflow-hidden disabled:opacity-60 mt-1 shadow-lg shadow-primary/20"
                        style={{ background: "linear-gradient(135deg, hsl(199 89% 42%) 0%, hsl(221 83% 53%) 100%)" }}
                      >
                        <span className="relative z-10">
                          {isLoading
                            ? "Creating account…"
                            : isCompletingOAuthSignUp
                              ? "Finish account"
                              : "Create account"}
                        </span>
                        <motion.span
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12"
                          animate={{ x: ["-100%", "200%"] }}
                          transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
                        />
                      </motion.button>
                    </form>

                    <p className="text-center text-[11px] text-muted-foreground/50">
                      By creating an account you agree to our terms and privacy policy.
                    </p>
                  </motion.div>
                )}

                {step === "verify" && (
                  <motion.div
                    key="verify"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.28, ease: "easeOut" }}
                    className="space-y-6"
                  >
                    <div className="text-center space-y-4">
                      <motion.div
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto bg-primary/10 border border-primary/20"
                      >
                        <KeyRound className="w-7 h-7 text-primary" />
                      </motion.div>
                      <div>
                        <h1 className="text-[1.75rem] font-bold tracking-tight">Check your inbox</h1>
                        <p className="text-[0.9rem] text-muted-foreground mt-1">
                          6-digit code sent to <span className="text-foreground font-semibold">{email}</span>
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleVerify} className="space-y-4">
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="000000"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        required
                        autoComplete="one-time-code"
                        autoFocus
                        className="h-16 text-center text-3xl tracking-[0.5em] font-mono placeholder:text-muted-foreground/25 bg-secondary/40 border-border/60 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/60 transition-all"
                      />

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
                        disabled={isLoading || code.length < 6}
                        className="relative w-full h-11 rounded-xl text-white text-sm font-semibold overflow-hidden disabled:opacity-50 shadow-lg shadow-primary/20"
                        style={{ background: "linear-gradient(135deg, hsl(199 89% 42%) 0%, hsl(221 83% 53%) 100%)" }}
                      >
                        <span className="relative z-10">{isLoading ? "Verifying…" : "Verify & continue"}</span>
                        <motion.span
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12"
                          animate={{ x: ["-100%", "200%"] }}
                          transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
                        />
                      </motion.button>

                      <button
                        type="button"
                        onClick={() => { setStep("register"); setError(""); setCode(""); setAccountExists(false); }}
                        className="w-full text-xs text-muted-foreground/50 hover:text-muted-foreground text-center transition-colors py-1"
                      >
                        Use a different email
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
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
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
