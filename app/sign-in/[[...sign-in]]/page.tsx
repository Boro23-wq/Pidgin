"use client";

import { useSignIn, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import Link from "next/link";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.07, ease: "easeOut" as const },
  }),
};

export default function SignInPage() {
  const { signIn, fetchStatus } = useSignIn();
  const { isSignedIn, isLoaded: userLoaded } = useUser();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [oauthLoading, setOauthLoading] = useState(false);

  const isLoading = fetchStatus === "fetching";

  // Already signed in → go straight to dashboard
  useEffect(() => {
    if (userLoaded && isSignedIn) router.replace("/dashboard");
  }, [userLoaded, isSignedIn, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!signIn) return;
    setError("");
    const { error: err } = await signIn.password({ identifier: email, password });
    if (err) {
      setError(err.message ?? "Invalid email or password.");
      return;
    }
    if (signIn.status === "complete") {
      await signIn.finalize();
      router.replace("/dashboard");
    }
  }

  async function handleGoogleOAuth() {
    if (!signIn) {
      setError("Sign-in not ready — please refresh the page.");
      return;
    }
    setOauthLoading(true);
    setError("");
    const { error: err } = await signIn.sso({
      strategy: "oauth_google",
      redirectUrl: `${APP_URL}/sign-in/sso-callback`,
      redirectCallbackUrl: APP_URL,
    });
    if (err) {
      setError(err.message ?? "Could not start Google sign-in.");
      setOauthLoading(false);
    }
  }

  // Show nothing while checking auth to avoid flash
  if (!userLoaded || (userLoaded && isSignedIn)) return null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-50"
          style={{ background: "radial-gradient(circle, hsl(199 89% 48% / 0.08) 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full opacity-40"
          style={{ background: "radial-gradient(circle, hsl(250 80% 60% / 0.06) 0%, transparent 70%)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage: "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative px-6 py-4 flex items-center justify-between"
      >
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pidgin-main.png" alt="Pidgin" className="w-7 h-7 rounded-lg" />
          <span className="font-semibold text-sm tracking-tight">Pidgin</span>
        </Link>
        <p className="text-xs text-muted-foreground">
          No account?{" "}
          <Link href="/sign-up" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </motion.div>

      {/* Form */}
      <div className="relative flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">
          <motion.div initial="hidden" animate="visible" className="flex flex-col gap-0">
            <motion.div custom={0} variants={fadeUp} className="mb-8 text-center">
              <h1 className="text-2xl font-bold mb-1 tracking-tight">Welcome back</h1>
              <p className="text-sm text-muted-foreground">Sign in to your Pidgin account</p>
            </motion.div>

            <motion.div custom={1} variants={fadeUp}>
              <motion.button
                type="button"
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                onClick={handleGoogleOAuth}
                disabled={oauthLoading || isLoading || !signIn}
                className="w-full h-10 rounded-lg border border-border/70 bg-card/60 backdrop-blur-sm flex items-center justify-center gap-2.5 text-sm font-medium hover:border-border hover:bg-card transition-all disabled:opacity-50 mb-4"
              >
                <GoogleIcon />
                {oauthLoading ? "Redirecting…" : "Continue with Google"}
              </motion.button>
            </motion.div>

            <motion.div custom={2} variants={fadeUp}>
              <Divider />
            </motion.div>

            <motion.form custom={3} variants={fadeUp} onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="pl-9 h-10 text-sm bg-secondary/40 border-border/60 focus-visible:ring-primary/40 focus-visible:border-primary/50 transition-all"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pl-9 pr-10 h-10 text-sm bg-secondary/40 border-border/60 focus-visible:ring-primary/40 focus-visible:border-primary/50 transition-all"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2"
                >
                  {error}
                </motion.p>
              )}

              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isLoading || !signIn}
                className="relative w-full h-10 rounded-lg bg-primary text-white text-sm font-medium overflow-hidden mt-1 transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                <span className="relative z-10">{isLoading ? "Signing in…" : "Sign in"}</span>
                <motion.span
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/12 to-transparent -skew-x-12"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
                />
              </motion.button>
            </motion.form>
          </motion.div>
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

function Divider() {
  return (
    <div className="relative mb-4">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border/50" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-background px-3 text-xs text-muted-foreground/50">or</span>
      </div>
    </div>
  );
}
