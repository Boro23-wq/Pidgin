"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { usePathname, useSearchParams } from "next/navigation";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      capture_pageview: false,
      persistence: "localStorage",
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ph = usePostHog();

  useEffect(() => {
    if (pathname) {
      ph?.capture("$pageview", { $current_url: window.location.href });
    }
  }, [pathname, searchParams, ph]);

  return null;
}

export function PostHogIdentify() {
  const { user, isLoaded } = useUser();
  const ph = usePostHog();

  useEffect(() => {
    if (!isLoaded) return;
    if (user) {
      ph?.identify(user.id, {
        email: user.emailAddresses[0]?.emailAddress,
        name: user.firstName ?? undefined,
      });
    } else {
      ph?.reset();
    }
  }, [user, isLoaded, ph]);

  return null;
}
