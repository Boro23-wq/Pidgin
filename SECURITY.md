# Security & Gmail Data Handling

This is the reference for what Pidgin does with participant Gmail data, and how it's protected. The first section is written to be quoted directly to a participant who asks. The second is the engineering detail behind each claim.

Everything here is a statement about code that is in this repository. If you change how data flows, change this file in the same commit.

> **Deploy prerequisites — this document describes the intended state. Before it is accurate:**
>
> 1. Run [`supabase/migrations/003_security.sql`](supabase/migrations/003_security.sql). Until it runs, `summaries` and `digest_feedback` are readable with the public `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the isolation claims below are false. *(Done — verified 2026-07-09.)*
> 2. Run [`supabase/migrations/004_rate_limits.sql`](supabase/migrations/004_rate_limits.sql). Until it runs, rate limiting silently falls back to the weaker in-memory limiter.
> 3. Set `TOKEN_ENCRYPTION_KEY` in the Vercel **Production** environment (`openssl rand -base64 32`). Deploying without it breaks every Gmail connection.
>
> Do not point a participant at this document until all three are done.

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

`/api/scan`, `/api/summarize`, and OAuth initiation are limited per user; `/api/waitlist` is limited per IP because it is public and each call writes to both Supabase and Clerk.

The counter lives in Postgres ([`lib/rate-limit.ts`](lib/rate-limit.ts), [`supabase/migrations/004_rate_limits.sql`](supabase/migrations/004_rate_limits.sql)), not in process memory. Vercel runs many concurrent serverless instances and recycles them constantly, so an in-memory `Map` both resets on cold start and is invisible to sibling instances. The SQL function takes a per-key advisory lock before counting, so a burst of parallel requests cannot all read "under the limit" and slip through together.

It fails *open* — to a per-instance in-memory limiter — when Postgres is unreachable or migration 004 hasn't been applied. A rate limiter that takes the app down during a database hiccup is a worse outage than the abuse it prevents.

### Transport & headers

Set in [`next.config.js`](next.config.js): a Content-Security-Policy, HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and `X-Permitted-Cross-Domain-Policies: none`.

The referrer policy matters specifically because `/share/[id]` URLs are capability tokens: a full referrer on an outbound click would leak the URL to the destination site.

The CSP blocks script from any origin outside a short allowlist (Clerk, PostHog, Cloudflare Turnstile), blocks framing entirely, and locks down `base-uri`, `form-action` and `object-src`. It **does** permit `'unsafe-inline'` and `'unsafe-eval'` in `script-src`, so it is not a defense against inline script injection — Next inlines its hydration bootstrap, and both Clerk and PostHog eval at runtime. Removing those requires a per-request nonce plus `strict-dynamic`, which is a real project. The mitigation in the meantime is that no user-controlled HTML is rendered unescaped anywhere.

### Client-side request handling

Every dashboard call to this app's own API goes through [`lib/api-fetch.ts`](lib/api-fetch.ts) rather than raw `fetch`.

The reason is specific. When a Clerk session expires, the middleware answers an API request with a 307 to `/sign-in`; `fetch` follows redirects transparently, and the sign-in page returns 200. So `res.ok` is `true` for a request that never reached the route handler. Optimistic writes — bookmark, mark-as-read, publish-a-share-link — appeared to succeed, silently lost the write, and reverted on next reload. `apiFetch` inspects `res.redirected` and returns an explicit `unauthenticated` result. Covered by [`lib/api-fetch.test.ts`](lib/api-fetch.test.ts).

### Account deletion

`DELETE /api/account` ([`app/api/account/route.ts`](app/api/account/route.ts)), reachable from the account menu behind a type-`DELETE`-to-confirm dialog. It revokes the Gmail grant with Google, erases every row keyed to the user across all seven tables plus their waitlist entry, then deletes the Clerk account.

Order is deliberate: Gmail first, so a later failure can never leave a live grant on an account the user believes is gone; Clerk last, because its user id is the key every other query needs.

### Known gaps

- **CSP allows `'unsafe-inline'` / `'unsafe-eval'` in `script-src`.** See above. Closing it needs nonce-based CSP with `strict-dynamic`.
- **`gmail.readonly` requires OAuth verification and a CASA Tier 2 assessment.** See below. Not a code change.

## Token encryption

There is no legacy plaintext path. `user_tokens` was purged on 2026-07-09 — before the encrypting code shipped, and while every row still belonged to the developer's own test accounts — so `decryptToken` treats an unencrypted value as a hard error rather than passing it through. Every stored token is written by `encryptToken` and prefixed `v1.`.

Two consequences worth knowing:

- `TOKEN_ENCRYPTION_KEY` must be set in Vercel **Production** before deploying. Without it, no token can be read.
- Rotating that key, or restoring a pre-2026-07-09 backup into `user_tokens`, strands every row. Users would have to reconnect Gmail.

Verify no plaintext has crept in:

```sql
select count(*) filter (where refresh_token not like 'v1.%') as plaintext_rows from user_tokens;
```

## Google OAuth verification (CASA)

`gmail.readonly` is a Google **restricted scope**. While the OAuth app is in *Testing* status it works for a handful of listed test users and refresh tokens expire after 7 days. Moving to *In production* — required before opening signups — means:

1. **OAuth consent screen** — verified domain ownership, a homepage explaining the app, and a publicly linked privacy policy that discloses the Google data accessed. [`app/privacy/page.tsx`](app/privacy/page.tsx) covers the disclosure.
2. **Scope justification + demo video** — showing the consent screen, what the app does with Gmail data, and why a narrower scope (e.g. `gmail.metadata`) does not suffice. It genuinely doesn't here: the summaries need message bodies.
3. **CASA Tier 2 assessment** — an independent security review by a Google-authorized lab, against the OWASP ASVS. Paid, and typically several weeks. It re-verifies annually.
4. **App must not be a prototype** — Google rejects apps that look like tests. A working landing page, functioning deletion flow, and honest privacy copy all matter here.

Items 1, 2 and 4 are ready. Item 3 is an external audit that has to be scheduled and paid for; nothing in this repository can substitute for it. The engineering work most likely to come out of it — encrypted secrets at rest, deny-by-default database access, self-service deletion, no debug endpoints — is done.

## Reporting a vulnerability

Email hello@pidgin.site. Please don't open a public issue.
