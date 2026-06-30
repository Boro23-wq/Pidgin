import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { PostHogProvider, PostHogPageView, PostHogIdentify } from "@/components/posthog-provider";
import { Suspense } from "react";
import "./globals.css";

const APP_URL = "https://pidgin.site";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "Pidgin — All the signal. None of the noise.",
    template: "%s — Pidgin",
  },
  description: "Your newsletters, summarized and delivered daily. Cut through inbox noise with AI-powered digests.",
  openGraph: {
    type: "website",
    url: APP_URL,
    siteName: "Pidgin",
    title: "Pidgin — All the signal. None of the noise.",
    description: "Your newsletters, summarized and delivered daily. Cut through inbox noise with AI-powered digests.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Pidgin" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pidgin — All the signal. None of the noise.",
    description: "Your newsletters, summarized and delivered daily.",
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
