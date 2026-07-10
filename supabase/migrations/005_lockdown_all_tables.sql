-- Drops two dead tables, then locks down every table that remains — including
-- ones nobody remembered.
--
-- Migration 003 enumerated tables by hand and missed two: `invites` and
-- `digest_sources`. Both were left readable by the browser-exposed
-- NEXT_PUBLIC_SUPABASE_ANON_KEY. `digest_sources` held 11 rows (user ids,
-- sender addresses); `invites` existed to hold unredeemed invite codes.
--
-- Run in the Supabase SQL editor. Safe to run more than once.

-- ---------------------------------------------------------------------------
-- 1. Drop the dead tables.
--
-- Both are leftovers from features that were removed, not features that are
-- planned:
--
--   digest_sources — backed the per-sender digest allow-list, deleted in
--     4a8dd82 when importance ranking replaced allow-lists entirely. The
--     comment in app/api/cron/digest/route.ts still says so: "No sender
--     allow-list here by design."
--
--   invites — backed the custom invite-code system, deleted in 3d076b5 when
--     Clerk's own waitlist took over. lib/invite-only.ts is the surviving
--     implementation and touches no table.
--
-- Neither is referenced by any code in this repository, at any commit since
-- their removal. Contents were backed up before dropping.
-- ---------------------------------------------------------------------------
drop table if exists public.digest_sources;
drop table if exists public.invites;

-- ---------------------------------------------------------------------------
-- 2. Lock down everything else.
--
-- Rather than hand-list tables a third time — which is how 003 missed two —
-- walk pg_tables. A table created and forgotten later is still covered the
-- next time this runs.
--
-- Enabling RLS with no policies is deny-by-default: the app talks to Postgres
-- only through the service-role client, which bypasses RLS, so this is
-- invisible to the app and fatal to the anon key.
-- ---------------------------------------------------------------------------
do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t.tablename);
    execute format('revoke all on public.%I from anon, authenticated', t.tablename);
    raise notice 'locked down %', t.tablename;
  end loop;
end $$;

-- Sequences too: `revoke all on <table>` doesn't cover an identity sequence,
-- and a readable sequence leaks row counts.
do $$
declare
  s record;
begin
  for s in select sequencename from pg_sequences where schemaname = 'public'
  loop
    execute format('revoke all on sequence public.%I from anon, authenticated', s.sequencename);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Audit. Both queries must return zero rows. Re-run after any schema change.
-- ---------------------------------------------------------------------------

-- Tables without RLS:
--
--   select tablename from pg_tables t
--    where schemaname = 'public'
--      and not exists (
--        select 1 from pg_class c
--         where c.relname = t.tablename and c.relnamespace = 'public'::regnamespace
--           and c.relrowsecurity
--      );

-- Tables the anon/authenticated roles still hold any grant on:
--
--   select table_name, privilege_type, grantee
--     from information_schema.role_table_grants
--    where table_schema = 'public'
--      and grantee in ('anon', 'authenticated');
