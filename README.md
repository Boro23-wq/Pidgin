# Pidgin

AI-powered newsletter digest with on-demand social post generation.

Pidgin connects to your Gmail, filters out noise, and uses Claude AI to summarise every newsletter you're subscribed to — then drafts ready-to-publish LinkedIn and X posts in one click.

## Features

- Gmail read-only OAuth — connect in 30 seconds
- AI summaries — Claude distils each issue into key points and a plain-English explanation
- Social posts — one-click LinkedIn and X/Twitter drafts from any summary
- Search & filters — full-text search, category filter, source filter, date range, bookmarks
- Block senders — mute any newsletter permanently
- Light / dark mode
- Custom auth — sign-in, sign-up, and SSO (Google) with Clerk

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router) |
| Auth | Clerk |
| AI | Claude API (Anthropic) |
| Email | Gmail API (read-only) |
| Database | Supabase (PostgreSQL) |
| Styling | Tailwind CSS + shadcn/ui |
| Animations | Framer Motion |

## Getting Started

### 1. Clone and install

```bash
git clone <your-repo-url>
cd newsletter-agent
npm install
```

### 2. Set up services

You need accounts for: [Clerk](https://clerk.com), [Anthropic](https://console.anthropic.com), [Google Cloud](https://console.cloud.google.com) (Gmail API), and [Supabase](https://supabase.com).

### 3. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in your keys:

```bash
cp .env.local.example .env.local
```

### 4. Set up the database

Run the SQL in `supabase-schema.sql` in your Supabase SQL editor.

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `http://localhost:3000/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `http://localhost:3000/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `http://localhost:3000/dashboard` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `http://localhost:3000/dashboard` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |
| `ANTHROPIC_API_KEY` | Claude API key |
| `GOOGLE_CLIENT_ID` | Gmail OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Gmail OAuth client secret |
| `GOOGLE_REFRESH_TOKEN` | Gmail OAuth refresh token |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |

## Project Structure

```
app/
  page.tsx                  # Landing page
  dashboard/page.tsx        # Main dashboard (auth-protected)
  sign-in/                  # Custom Clerk sign-in
  sign-up/                  # Custom Clerk sign-up
  api/
    auth/                   # Gmail OAuth flow
    summarize/              # Fetch + summarise newsletters (SSE stream)
    summaries/              # List summaries
    generate-post/          # Generate social post on demand
    update-summary/         # Bookmark / mark read
    block-sender/           # Block a newsletter sender
components/
  custom-user-button.tsx    # Account dropdown
  theme-toggle.tsx          # Light/dark switcher
  theme-provider.tsx        # next-themes wrapper
  ui/                       # shadcn/ui primitives
lib/
  gmail.ts                  # Gmail API client
  claude.ts                 # Claude summarisation + post generation
  supabase.ts               # Supabase client helpers
  tokens.ts                 # OAuth token storage
```
