"use client";

import { SignUp, useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import Link from "next/link";
import { AuthLeftPanel } from "@/components/auth-left-panel";
import AppLoading from "@/components/app-loading";
import { pidginClerkAppearance } from "@/lib/clerk-appearance";

export default function SignUpPage() {
  const { isSignedIn, isLoaded } = useUser();

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
          <div className="pidgin-clerk-auth">
            <SignUp
              path="/sign-up"
              routing="path"
              signInUrl="/sign-in"
              waitlistUrl="/waitlist"
              forceRedirectUrl="/dashboard"
              signInForceRedirectUrl="/dashboard"
              appearance={pidginClerkAppearance}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
