"use client";

import { SignUp, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { AuthLeftPanel } from "@/components/auth-left-panel";
import AppLoading from "@/components/app-loading";
import { isInviteOnlyEnabled } from "@/lib/invite-only";

export default function SignUpPage() {
  const { isSignedIn, isLoaded } = useUser();
  const inviteOnly = isInviteOnlyEnabled();

  if (!isLoaded || isSignedIn) {
    return <AppLoading />;
  }

  return (
    <div className="min-h-screen flex overflow-hidden bg-[hsl(240_10%_3.9%)] text-white">
      <AuthLeftPanel />

      <div className="flex-1 flex flex-col bg-background text-foreground">
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

        <div className="hidden lg:flex justify-end px-10 pt-8">
          <p className="text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link href="/sign-in" className="text-primary font-medium">
              Sign in
            </Link>
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <SignUp
            path="/sign-up"
            routing="path"
            signInUrl="/sign-in"
            waitlistUrl="/waitlist"
            forceRedirectUrl="/dashboard"
            signInForceRedirectUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: "w-full max-w-sm",
                cardBox: "w-full shadow-none border border-border/60 bg-card",
                card: "bg-card text-foreground",
                headerTitle: "text-foreground",
                headerSubtitle: "text-muted-foreground",
                socialButtonsBlockButton:
                  "bg-secondary/40 border-border/60 text-foreground hover:bg-secondary/80",
                formFieldInput:
                  "bg-secondary/40 border-border/60 text-foreground",
                formButtonPrimary:
                  "bg-primary hover:bg-primary/90 text-primary-foreground",
                footerActionLink: "text-primary",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
