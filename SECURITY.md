# Security & Gmail Data Handling

This is the reference for what Pidgin does with participant Gmail data, and how it's protected. The first section is written to be quoted directly to a participant who asks. The second is the engineering detail behind each claim.

Everything here is a statement about code that is in this repository. If you change how data flows, change this file in the same commit.

> **Deploy prerequisites — this document describes the intended state, and two steps are required before it is accurate:**
>
> 1. Run [`supabase/migrations/003_security.sql`](supabase/migrations/003_security.sql). Until it runs, the `summaries` and `digest_feedback` tables are readable with the public `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the isolation claims below are false.
> 2. Set `TOKEN_ENCRYPTION_KEY` in the Vercel project (`openssl rand -base64 32`). Until it is set, the encryption-at-rest claim below is false, and deploying without it will break token reads.
>
> Do not point a participant at this document until both are done.

---

## For participants

**What Pidgin can see.** Pidgin connects to Gmail through Google's standard OAuth consent screen. It never sees your Google password. It requests exactly two permissions: read-only access to Gmail, and your email address. It cannot send, modify, delete, or archive anything — those permissions are never requested, so the access token physically cannot perform those actions.

**What Pidgin actually reads.** "Read-only Gmail" is a permission over your whole mailbox — that is how Google scopes it, and we'd rather say so than imply Google is enforcing a narrower boundary than it is. What narrows it is Pidgin itself: it only ever asks Gmail for messages that are filed under Promotions or Updates *and* carry the `List-Unsubscribe` header, which bulk senders are legally required to set. Personal correspondence, drafts, and sent mail are never fetched, never sent to an AI model, and never stored. On top of that, a blocklist filters out banks, shipping notices, job alerts, and similar mail that passes the newsletter test but isn't one.

**Where the content goes.** The body of a newsletter is sent to Anthropic's Claude API to produce the summary, key points, and "why it matters" framing you see. Under Anthropic's commercial API terms, that content is not used to train models. Derived summaries are stored in Supabase; the daily email is delivered by Resend.

**What's stored, and for how long.** The original newsletter body is kept only long enough to generate your brief and is cleared after 7 days — including for stories you've bookmarked, since a bookmark saves the summary, not the source email. Derived summaries and topic history are kept up to 180 days. All study data is deleted at the end of the study.

**How the connection itself is protected.** Your Gmail access and refresh tokens are encrypted at rest with AES-256-GCM before they touch the database, so a database leak on its own does not hand anyone access to your inbox. Every request is scoped to your signed-in account; no participant can read another's data. Traffic is TLS-encrypted in transit.

**Sharing is opt-in.** Summaries are private by default. A summary becomes readable by link only when you press Share on it.

**How to revoke access.** Press *Disconnect* in the dashboard: Pidgin revokes the grant with Google and deletes the stored tokens immediately. You can also revoke from [Google account permissions](https://myaccount.google.com/permissions), which works regardless of whether Pidgin is running or cooperating. To delete all study data, email hello@pidgin.site — actioned within 72 hours.

---

## Engineering detail

### OAuth

Scopes requested, and only these, in [`app/api/auth/google/route.ts`](app/api/auth/google/route.ts):

- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/userinfo.email`

`gmail.readonly` is a Google **restricted scope**. Publishing the OAuth app beyond Testing status requires OAuth verification and a CASA Tier 2 assessment.

The consent flow is CSRF-protected. The `state` parameter is an HMAC-SHA256 signature over the Clerk user ID plus a 10-minute expiry ([`lib/oauth-state.ts`](lib/oauth-state.ts)), verified with a constant-time compare in the callback. Without this, an attacker could complete a flow and bind *their* Gmail tokens to *your* account.

The callback also checks that `gmail.readonly` is actually present in the granted scopes before saving anything ([`app/api/auth/google/callback/route.ts`](app/api/auth/google/callback/route.ts)). Google's consent screen lets a user deselect individual scopes and still complete the flow "successfully"; without this check, every later scan would fail with an opaque 403.

### Token storage

Access and refresh tokens are encrypted with AES-256-GCM before being written, and decrypted only in memory when a Gmail call is about to be made ([`lib/crypto.ts`](lib/crypto.ts), applied in [`lib/tokens.ts`](lib/tokens.ts)). Each ciphertext carries a random 96-bit IV and a GCM authentication tag, so tampering is detected rather than silently decrypted into garbage.

This defends against a database-only compromise — a leaked service-role key, a stray backup, a bad RLS policy. It does **not** defend against compromise of the running application, which necessarily holds `TOKEN_ENCRYPTION_KEY`.

Rotating `TOKEN_ENCRYPTION_KEY` invalidates every stored token; users would have to reconnect.

### Database access

The application reaches Supabase exclusively through the service-role client in [`lib/supabase.ts`](lib/supabase.ts), and every query filters on the Clerk `userId` returned by `auth()`. Authorization lives in the route handlers, not in the database.

Row-level security is enabled on every table with **no policies** ([`supabase/migrations/003_security.sql`](supabase/migrations/003_security.sql)). The service-role key bypasses RLS, so this is invisible to the app; what it does is make the browser-exposed `NEXT_PUBLIC_SUPABASE_ANON_KEY` useless for reading any table directly. Deny-by-default is the intent. The default `anon`/`authenticated` grants are revoked as well, so a future "just add one policy" change can't silently re-expose a whole table.

The one intentionally unauthenticated read is [`getPublicSummary`](lib/supabase.ts), used by `/share/[id]`. It requires `is_public = true`, which defaults to false and is only ever set through an authenticated, user-scoped write.

### Untrusted input

A newsletter body is attacker-controlled: anyone can email a participant something that passes the `List-Unsubscribe` heuristic. That body reaches Claude, and prompt injection can steer what Claude emits into `newsletter_title`, `summary`, `why_it_matters`, `what_to_do`, and `source_url`.

Those fields render in two places. The dashboard and `/share/[id]` go through React, which escapes them. The digest email is a hand-built HTML string, so [`lib/digest.ts`](lib/digest.ts) escapes every interpolated field via `escapeHtml()` and passes `source_url` through `safeUrl()`, which rejects anything that isn't `http:`/`https:` — blocking `javascript:` hrefs and attribute breakout. Covered by tests in [`lib/digest.test.ts`](lib/digest.test.ts).

### Endpoint authentication

Clerk middleware ([`middleware.ts`](middleware.ts)) protects everything not explicitly listed as public. Each API route independently re-checks `auth()` and scopes its queries by `userId` — the middleware is not the only gate.

Two endpoints are reachable without a session, by necessity:

- `/api/cron/digest` — authenticated by a `CRON_SECRET` bearer token, compared in constant time, failing closed if the secret is unset.
- `/api/feedback/digest` (GET) — clicked from an inbox, so there is no session. The user ID rides in an HMAC-signed `uid`. It was previously bare base64, which is encoding rather than authentication and let anyone forge feedback as anyone.

`/admin` sits behind Clerk *and* an explicit `ADMIN_EMAILS` allow-list, and fails closed when that variable is unset.

### Rate limiting

`/api/scan`, `/api/summarize`, and OAuth initiation are limited per user; `/api/waitlist` is limited per IP because it is public and each call writes to both Supabase and Clerk. The limiter ([`lib/rate-limit.ts`](lib/rate-limit.ts)) is in-memory and resets on serverless cold start — adequate for an invite-only alpha, and the first thing to replace with a durable store before opening signups.

### Transport & headers

HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: strict-origin-when-cross-origin` are set in [`next.config.js`](next.config.js). The referrer policy matters specifically because `/share/[id]` URLs are capability tokens: a full referrer on an outbound click would leak the URL to the destination site.

There is no Content-Security-Policy yet. That's the main remaining gap in this section.

### Known gaps

- No CSP.
- Rate limiting is per-instance and in-memory.
- `lib/crypto.ts` still passes legacy plaintext tokens through on read, so the pre-encryption rows keep working. Remove that fallback once the backfill query in `003_security.sql` reports zero plaintext rows.
- `gmail.readonly` requires a CASA Tier 2 assessment before the OAuth app can leave Testing status.

## Reporting a vulnerability

Email hello@pidgin.site. Please don't open a public issue.
