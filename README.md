# Pidgin

> Turn your newsletter backlog into a daily briefing — key points, AI summaries, and ready-to-post LinkedIn/X drafts. No skimming required.

Live at **[pidgin.site](https://pidgin.site)** · Alpha — invite only · [Request access](https://pidgin.site/waitlist)

---

## Features

- **Gmail integration** — connect read-only in 30 seconds, auto-detects newsletters
- **AI summaries** — Claude distils each issue into key points and a plain-English explanation
- **Social post drafts** — one-click LinkedIn and X/Twitter drafts from any summary
- **Daily digest** — email briefing of everything that landed today
- **Two-step sync** — scan inbox first, pick which newsletters to import, then summarise
- **Search & filters** — full-text search, category filter, source filter, date range, bookmarks
- **Block senders** — mute any newsletter permanently
- **Read / unread tracking** — mark articles read, filter to unread only
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

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/Boro23-wq/Pidgin.git
cd Pidgin
npm install
```

### 2. Set up services

You need accounts for: [Clerk](https://clerk.com), [Anthropic](https://console.anthropic.com), [Google Cloud](https://console.cloud.google.com) (Gmail API — Web application OAuth client), [Supabase](https://supabase.com), and [Resend](https://resend.com).

### 3. Configure environment variables

Create `.env.local` and fill in your keys:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=http://localhost:3000/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=http://localhost:3000/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=http://localhost:3000/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=http://localhost:3000/dashboard

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_INVITE_ONLY=false

# Google (Web application OAuth client)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=

# Anthropic
ANTHROPIC_API_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
```

### 4. Set up the database

Run in your Supabase SQL editor:

```sql
-- Summaries
create table summaries (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  source_email text,
  subject text,
  summary text,
  key_points text[],
  category text,
  is_read boolean default false,
  is_bookmarked boolean default false,
  created_at timestamptz default now()
);

-- User OAuth tokens
create table user_tokens (
  user_id text primary key,
  access_token text,
  refresh_token text,
  updated_at timestamptz default now()
);

-- Alpha waitlist
create table waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text,
  newsletter_count text,
  use_cases text[],
  access_type text,
  created_at timestamptz default now()
);
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
  page.tsx                  # Landing page
  waitlist/page.tsx         # Alpha waitlist form
  dashboard/page.tsx        # Main dashboard (auth-protected)
  sign-in/                  # Custom Clerk sign-in
  sign-up/                  # Custom Clerk sign-up
  api/
    auth/                   # Gmail OAuth flow
    waitlist/               # Waitlist form submission → Supabase
    scan/                   # Inbox scan — metadata only, returns newsletter previews
    summarize/              # Fetch + summarise newsletters (SSE stream)
    summaries/              # List / delete summaries
    dismiss/                # Dismiss a newsletter without importing it
    generate-post/          # Generate social post on demand
    update-summary/         # Bookmark / mark read
    block-sender/           # Block a newsletter sender
components/
  custom-user-button.tsx    # Account dropdown
  posthog-provider.tsx      # PostHog analytics wrapper
  theme-toggle.tsx          # Light/dark switcher
  theme-provider.tsx        # next-themes wrapper
  ui/                       # shadcn/ui primitives
lib/
  gmail.ts                  # Gmail API client
  claude.ts                 # Claude summarisation + post generation
  supabase.ts               # Supabase client helpers
  tokens.ts                 # OAuth token storage
```

## Status

**v0.1.0 — Alpha.** Invite-only while Gmail filtering and AI summaries are being tuned. [Request access →](https://pidgin.site/waitlist)
