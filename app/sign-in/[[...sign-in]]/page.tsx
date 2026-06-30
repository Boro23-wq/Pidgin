"use client";

import { SignIn, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { AuthLeftPanel } from "@/components/auth-left-panel";
import AppLoading from "@/components/app-loading";
import { pidginClerkAppearance } from "@/lib/clerk-appearance";
import { isInviteOnlyEnabled } from "@/lib/invite-only";

export default function SignInPage() {
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
          <Link
            href={inviteOnly ? "/waitlist" : "/sign-up"}
            className="text-xs text-primary font-medium"
          >
            {inviteOnly ? "Request access" : "Sign up"}
          </Link>
        </div>

        <div className="hidden lg:flex justify-end px-10 pt-8">
          <p className="text-xs text-muted-foreground">
            No account?{" "}
            <Link
              href={inviteOnly ? "/waitlist" : "/sign-up"}
              className="text-primary font-medium"
            >
              {inviteOnly ? "Request access" : "Sign up"}
            </Link>
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-[440px]">
            <SignIn
              path="/sign-in"
              routing="path"
              signUpUrl={inviteOnly ? "/waitlist" : "/sign-up"}
              waitlistUrl="/waitlist"
              forceRedirectUrl="/dashboard"
              signUpForceRedirectUrl={inviteOnly ? "/waitlist" : "/dashboard"}
              transferable={!inviteOnly}
              withSignUp={!inviteOnly}
              appearance={pidginClerkAppearance}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
