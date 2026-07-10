const { withSentryConfig } = require("@sentry/nextjs");

// Content-Security-Policy
//
// What this buys: an injected `<script src="https://evil.test/x.js">` won't
// execute, a stolen page can't be framed for clickjacking, `<base>` injection
// can't rewrite every relative URL, and a form can't be repointed at an
// attacker's origin.
//
// What it does NOT buy: 'unsafe-inline' and 'unsafe-eval' are in script-src,
// so this is not a defense against inline script injection. Removing them
// needs a per-request nonce plus 'strict-dynamic', because Next inlines its
// hydration bootstrap and both Clerk and PostHog eval at runtime. That is a
// real project, not a header tweak. The mitigation today is that no
// user-controlled HTML is rendered unescaped anywhere: React escapes the
// dashboard and /share, and lib/digest.ts escapes the one hand-built HTML
// string (the digest email, which isn't governed by this policy anyway).
//
// If a third-party breaks after a dependency upgrade, the fix is almost always
// adding its origin here — check the browser console for the blocked URI.

// Clerk serves its JS and API from a "Frontend API" host that differs per
// environment: `<slug>.clerk.accounts.dev` on a development key, but a CNAME
// on your own domain (`clerk.pidgin.site`) on a production key. The second one
// matches neither wildcard below, which is exactly how this policy shipped
// broken — it passed locally on a pk_test key and blocked all of Clerk in prod.
//
// The host is base64-encoded into the publishable key itself, so derive it
// rather than hardcoding a domain that only one environment uses.
function clerkFrontendApiOrigin() {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!pk) return [];
  try {
    const host = Buffer.from(pk.replace(/^pk_(test|live)_/, ""), "base64")
      .toString("utf8")
      .replace(/\$$/, ""); // the encoded value carries a trailing '$'
    return /^[a-z0-9.-]+$/i.test(host) ? [`https://${host}`] : [];
  } catch {
    return [];
  }
}

const CLERK = [
  "https://*.clerk.accounts.dev",
  "https://*.clerk.com",
  ...clerkFrontendApiOrigin(),
];
// Clerk phones home to this from the browser. Harmless to block, but it logs a
// CSP violation on every page load if we do.
const CLERK_TELEMETRY = ["https://clerk-telemetry.com"];
const POSTHOG = ["https://us.i.posthog.com", "https://us-assets.i.posthog.com"];
const SENTRY = ["https://*.ingest.sentry.io", "https://*.ingest.us.sentry.io"];
// Clerk's bot protection renders a Turnstile widget in an iframe.
const TURNSTILE = ["https://challenges.cloudflare.com"];

const csp = [
  `default-src 'self'`,
  `base-uri 'self'`,
  `object-src 'none'`,
  `frame-ancestors 'none'`,
  `form-action 'self'`,
  // script-src-elem is deliberately not set: it falls back to script-src, and
  // a second copy of this allowlist is a second place to forget an origin.
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${[...CLERK, ...POSTHOG, ...TURNSTILE].join(" ")}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https://img.clerk.com ${CLERK.join(" ")}`,
  `font-src 'self' data:`,
  // Sentry's Replay integration spawns its worker from a blob URL, and Clerk
  // loads its bot-detection worker the same way.
  `worker-src 'self' blob:`,
  `connect-src 'self' ${[...CLERK, ...CLERK_TELEMETRY, ...POSTHOG, ...SENTRY].join(" ")}`,
  `frame-src 'self' ${[...CLERK, ...TURNSTILE].join(" ")}`,
  `upgrade-insecure-requests`,
].join("; ");

// Referrer-Policy matters beyond the usual hygiene here: /share/[id] URLs
// carry an unguessable summary UUID, so a full referrer on outbound clicks
// would hand that URL to whatever site the reader clicks through to.
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
});
