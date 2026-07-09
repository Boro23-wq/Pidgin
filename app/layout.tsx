import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import {
  PostHogProvider,
  PostHogPageView,
  PostHogIdentify,
} from "@/components/posthog-provider";
import { Suspense } from "react";
import "./globals.css";

const APP_URL = "https://pidgin.site";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Pidgin",
    template: "%s — Pidgin",
  },
  description:
    "A Founder Intelligence System: your newsletters turned into a ranked daily brief of what changed, why it matters, what to do about it.",
  openGraph: {
    type: "website",
    url: APP_URL,
    siteName: "Pidgin",
    title: "Pidgin",
    description:
      "A Founder Intelligence System: your newsletters turned into a ranked daily brief of what changed, why it matters, what to do about it.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Pidgin" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pidgin",
    description:
      "A Founder Intelligence System: your newsletters turned into a ranked daily brief.",
    images: ["/og.png"],
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [{ rel: "manifest", url: "/site.webmanifest" }],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider waitlistUrl="/waitlist">
      <html lang="en" suppressHydrationWarning>
        <body>
          <PostHogProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem={false}
              disableTransitionOnChange
            >
              <Suspense fallback={null}>
                <PostHogPageView />
              </Suspense>
              <PostHogIdentify />
              {children}
            </ThemeProvider>
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
