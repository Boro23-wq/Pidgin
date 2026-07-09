-- Security hardening. Run in the Supabase SQL editor.
-- Safe to run once; re-running errors on "already exists", which is fine.

-- ---------------------------------------------------------------------------
-- 1. Row-level security on every table.
--
-- NOT hypothetical. Probing the live project with the anon key (the one that
-- ships to every browser as NEXT_PUBLIC_SUPABASE_ANON_KEY) on 2026-07-09
-- returned, unauthenticated:
--
--     summaries         368 / 368 rows   — 9 users, 154 rows still holding
--                                          the full raw newsletter body
--     digest_feedback     6 / 6   rows
--
-- Every other table already had RLS on and correctly returned nothing
-- (user_tokens, waitlist, topic_occurrences, dismissed_emails,
-- blocked_senders). Gmail tokens were never exposed. Newsletter content was.
--
-- The app reaches Supabase exclusively through the service-role client in
-- lib/supabase.ts, which bypasses RLS entirely — so enabling RLS with NO
-- policies changes nothing for the app while making the anon key useless for
-- reading these tables directly. Deny-by-default: no policy means no access
-- for the anon/authenticated roles. That is the intent, not an oversight.
--
-- Authorization has never lived in the database here — every route handler
-- filters on the Clerk userId from auth(). RLS is the backstop for when
-- something talks to PostgREST without going through a route handler.
-- ---------------------------------------------------------------------------
alter table user_tokens       enable row level security;
alter table summaries         enable row level security;
alter table topic_occurrences enable row level security;
alter table waitlist          enable row level security;
alter table digest_feedback   enable row level security;
alter table feedback          enable row level security;
alter table dismissed_emails  enable row level security;
alter table blocked_senders   enable row level security;

-- Belt and braces: revoke the table grants the anon/authenticated roles get by
-- default in a fresh Supabase project. RLS alone is sufficient, but a future
-- "add a policy to unblock X" change shouldn't silently re-expose everything.
revoke all on user_tokens       from anon, authenticated;
revoke all on summaries         from anon, authenticated;
revoke all on topic_occurrences from anon, authenticated;
revoke all on waitlist          from anon, authenticated;
revoke all on digest_feedback   from anon, authenticated;
revoke all on feedback          from anon, authenticated;
revoke all on dismissed_emails  from anon, authenticated;
revoke all on blocked_senders   from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Share links become opt-in.
--
-- /share/[id] is a public route that previously looked a summary up by id
-- alone — so every row was world-readable to anyone holding its UUID, whether
-- or not the owner ever shared it. Default false: existing rows are private
-- until explicitly shared.
-- ---------------------------------------------------------------------------
alter table summaries add column if not exists is_public boolean not null default false;

-- ---------------------------------------------------------------------------
-- 3. Backfill note — token encryption (lib/crypto.ts)
--
-- Tokens written before this release are plaintext. decryptToken() passes
-- unrecognized values through unchanged, so they keep working. Each user's row
-- re-encrypts on its own the next time getValidTokens() refreshes their access
-- token (within an hour of activity) or they reconnect Gmail.
--
-- To confirm the backfill has completed, every row should be prefixed 'v1.':
--
--   select count(*) filter (where refresh_token not like 'v1.%') as plaintext_rows
--   from user_tokens;
--
-- Once that reads 0, drop the passthrough in decryptToken() so an unencrypted
-- value becomes a hard error rather than a silent downgrade.
-- ---------------------------------------------------------------------------
