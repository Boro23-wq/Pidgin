"use client";

import { SignIn, useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import Link from "next/link";
import { AuthLeftPanel } from "@/components/auth-left-panel";
import AppLoading from "@/components/app-loading";
import { pidginClerkAppearance } from "@/lib/clerk-appearance";
import { isInviteOnlyEnabled } from "@/lib/invite-only";

export default function SignInPage() {
  const { isSignedIn, isLoaded } = useUser();
  const inviteOnly = isInviteOnlyEnabled();

  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName !== "INPUT") return;
      if (!t.closest(".pidgin-clerk-auth")) return;
      setTimeout(() => {
        if (document.activeElement !== t) return;
        t.style.setProperty("outline", "none", "important");
        t.style.setProperty(
          "box-shadow",
          "inset 0 0 0 2px hsl(199 89% 48% / 0.4)",
          "important",
        );
        t.style.setProperty(
          "border-color",
          "hsl(199 89% 48% / 0.9)",
          "important",
        );
      }, 0);
    };
    const onFocusOut = (e: FocusEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName !== "INPUT") return;
      if (!t.closest(".pidgin-clerk-auth")) return;
      t.style.removeProperty("outline");
      t.style.removeProperty("box-shadow");
      t.style.removeProperty("border-color");
    };
    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("focusout", onFocusOut, true);
    return () => {
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("focusout", onFocusOut, true);
    };
  }, []);

  if (!isLoaded || isSignedIn) {
    return <AppLoading />;
  }

  return (
    <div className="min-h-screen flex bg-[hsl(240_10%_3.9%)] text-white">
      <AuthLeftPanel />

      <div className="flex-1 flex flex-col bg-background text-foreground">
        <div className="lg:hidden flex items-center justify-between px-5 py-4 border-b border-border/50">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pidgin-main.png" alt="Pidgin" className="w-8 h-8" />
            {/* <span className="font-semibold text-sm">Pidgin</span> */}
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
          <div className="pidgin-clerk-auth">
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
