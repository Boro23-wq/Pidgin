"use client";

import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { AuthLeftPanel } from "@/components/auth-left-panel";

export default function SignUpPage() {
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
          <SignUp
            forceRedirectUrl="/dashboard"
            signInUrl="/sign-in"
          />
        </div>
      </div>
    </div>
  );
}
