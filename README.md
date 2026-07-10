# Pidgin

> Your Morning Brief: here's what changed while you were building — key points, why it matters, and ready-to-post LinkedIn/X drafts. No skimming required.

Live at **[pidgin.site](https://pidgin.site)** · Alpha — invite only · [Request access](https://pidgin.site/waitlist)

---

## Features

- **Gmail integration** — connect read-only in 30 seconds, auto-detects newsletters
- **AI summaries** — Claude distils each issue into key points and a plain-English explanation
- **Trend memory** — recognises when a story recurs across newsletters and across weeks
- **Social post drafts** — one-click LinkedIn and X/Twitter drafts from any summary
- **Daily digest** — emailed only when something clears the importance bar, not every day
- **Two-step sync** — scan inbox first, pick which newsletters to import, then summarise
- **Share links** — publish a single summary to a public link, opt-in per story
- **Search & filters** — full-text search, category filter, source filter, date range, bookmarks
- **Block senders** — mute any newsletter permanently
- **Read / unread tracking** — mark articles read, filter to unread only
- **Disconnect & delete** — revoke Gmail, or erase your account and all data, from the app
- **Light / dark mode**
- **Invite-only access** — Clerk restricted mode with manual invitations

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router) |
| Auth | Clerk |
| AI | Claude API (Anthropic) |
| Email | Gmail API (read-only) + Resend |
| Database | Supabase (PostgreSQL) |
| Styling | Tailwind CSS + shadcn/ui |
| Animations | Framer Motion |
| Analytics | PostHog |
| Errors | Sentry |
| Tests | Vitest |

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/Boro23-wq/Pidgin.git
cd Pidgin
npm install
```

### 2. Set up services

You need accounts for: [Clerk](https://clerk.com), [Anthropic](https://console.anthropic.com), [Google Cloud](https://console.cloud.google.com) (Gmail API — Web application OAuth client), [Supabase](https://supabase.com), and [Resend](https://resend.com). [Sentry](https://sentry.io) and [PostHog](https://posthog.com) are optional.

The Google OAuth client needs `https://www.googleapis.com/auth/gmail.readonly` and `.../auth/userinfo.email`, with `{APP_URL}/api/auth/google/callback` as an authorised redirect URI. `gmail.readonly` is a Google **restricted scope** — see *Security* below.

### 3. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill it in. Two values you generate yourself:

```bash
openssl rand -base64 32   # TOKEN_ENCRYPTION_KEY
openssl rand -base64 32   # OAUTH_STATE_SECRET
```

`TOKEN_ENCRYPTION_KEY` encrypts Gmail tokens at rest. **The app cannot read any stored token without it.** Rotating it forces every user to reconnect Gmail.

### 4. Set up the database

The base tables were created by hand before migrations existed. Create them in the Supabase SQL editor:

```sql
create table summaries (
  id                 uuid primary key default gen_random_uuid(),
  user_id            text not null,
  newsletter_title   varchar not null,
  original_content   text not null,
  summary            text not null,
  simple_explanation text not null,
  key_points         text[] not null,
  linkedin_post      text not null default '',
  twitter_post       text not null default '',
  source_email       varchar,
  source_email_id    varchar,
  processed_date     date,
  category           text,
  source_url         text,
  is_bookmarked      boolean default false,
  is_read            boolean default false,
  created_at         timestamp default now(),
  unique (user_id, source_email_id, newsletter_title)
);

create table user_tokens (
  id                  uuid primary key default gen_random_uuid(),
  clerk_user_id       text not null unique,
  gmail_address       text,
  access_token        text not null,
  refresh_token       text not null,
  token_expiry        timestamptz not null,
  auto_digest_enabled boolean not null default false,
  last_synced_at      timestamptz,
  created_at          timestamptz default now()
);

create table waitlist (
  id               uuid primary key default gen_random_uuid(),
  email            text not null unique,
  role             text,
  newsletter_count text,
  use_cases        text[],
  access_type      text,
  created_at       timestamptz default now()
);

create table dismissed_emails (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null,
  email_id     text not null,
  from_name    text,
  from_email   text,
  subject      text,
  dismissed_at timestamptz not null default now(),
  unique (user_id, email_id)
);

create table blocked_senders (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null,
  domain     text not null,
  created_at timestamptz default now(),
  unique (user_id, domain)
);

create table digest_feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null,
  rating     text,
  message    text,
  created_at timestamptz default now()
);

create table feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null,
  summary_id uuid,
  reason     text,
  created_at timestamptz default now()
);
```

Then run every file in `supabase/migrations/`, in order:

| Migration | What it does |
|---|---|
| `001_morning_brief.sql` | Trend-memory table, `why_it_matters` / `what_to_do` columns |
| `002_significance.sql` | `significance` column for importance ranking |
| `003_security.sql` | Row-level security, deny-by-default; `is_public` for share links |
| `004_rate_limits.sql` | Durable rate limiter (table + `check_rate_limit` function) |
| `005_lockdown_all_tables.sql` | Drops two dead tables, then walks `pg_tables` and locks down anything 003 missed |

`003` and `005` are not optional. Without them the browser-exposed `NEXT_PUBLIC_SUPABASE_ANON_KEY` can read your tables directly. Verify:

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/summaries?select=id&limit=1" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
# 401 = locked down.  200 = exposed, run the migrations.
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev      # dev server
npm run build    # production build
npm run lint     # eslint
npm test         # vitest
```

## Security

The app holds Google OAuth refresh tokens for a restricted scope, so a few invariants matter:

- **Tokens are encrypted at rest** (AES-256-GCM, `lib/crypto.ts`). There is no plaintext fallback — an unencrypted value in `user_tokens` is a hard error. Don't restore an old backup into that table.
- **Authorization lives in the route handlers.** Every query filters on the Clerk `userId`. RLS is deny-by-default defence in depth, not the primary gate.
- **Newsletter bodies are untrusted input.** They reach Claude, so prompt injection can steer its output. React escapes the dashboard and `/share`; the digest email is hand-built HTML, so `lib/digest.ts` escapes every field and rejects non-`http(s)` URLs.
- **Client calls go through `lib/api-fetch.ts`.** An expired Clerk session redirects to `/sign-in`, which returns 200 — so a raw `res.ok` check reports success for a request that never ran.
- **`gmail.readonly` is a restricted scope.** Leaving Google's *Testing* status requires OAuth verification and a CASA Tier 2 assessment.

Found a vulnerability? Email **hello@pidgin.site** — please don't open a public issue.

## Project Structure

```
app/
  page.tsx                  # Landing page
  dashboard/page.tsx        # Main dashboard (auth-protected)
  share/[id]/page.tsx       # Public summary page — opt-in via is_public
  admin/page.tsx            # Internal cockpit, ADMIN_EMAILS allow-list
  waitlist/ privacy/ terms/ # Static pages
  sign-in/ sign-up/         # Custom Clerk flows
  api/
    account/                # DELETE — revoke Gmail, erase all data, delete user
    auth/google/            # Gmail OAuth: GET connect, DELETE disconnect
    scan/                   # Inbox scan — metadata only, returns previews
    summarize/              # Fetch + summarise newsletters (SSE stream)
    summaries/              # List / delete summaries
    dismiss/                # Dismiss a newsletter without importing it
    generate-post/          # Generate social post on demand
    update-summary/         # Bookmark / mark read / publish share link
    block-sender/           # Block a newsletter sender
    digest/                 # Send digest now; toggle daily digest
    cron/digest/            # Nightly job, CRON_SECRET bearer auth
    feedback/               # In-app and email-link feedback
    waitlist/               # Waitlist form submission
components/
  confirm-dialog.tsx        # Destructive-action dialog, optional type-to-confirm
  custom-user-button.tsx    # Account dropdown + delete account
  onboarding-flow.tsx       # First-run connect & scan
  ui/                       # shadcn/ui primitives + Spinner
lib/
  gmail.ts                  # Gmail API client, newsletter detection
  claude.ts                 # Claude story extraction + post generation
  crypto.ts                 # AES-256-GCM envelope for OAuth tokens
  oauth-state.ts            # HMAC-signed OAuth state and feedback links
  digest.ts                 # Importance ranking + digest HTML (escaped)
  api-fetch.ts              # Client fetch wrapper; detects auth redirects
  rate-limit.ts             # Postgres-backed limiter, in-memory fallback
  supabase.ts               # Supabase client + query helpers
  tokens.ts                 # Token storage, refresh, revocation
supabase/migrations/        # Run in order; see table above
```

## Status

**v0.1.0 — Alpha.** Invite-only while Gmail filtering and AI summaries are being tuned. [Request access →](https://pidgin.site/waitlist)
