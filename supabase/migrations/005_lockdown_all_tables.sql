-- Locks down every table in `public`, including ones nobody remembered.
--
-- Migration 003 enumerated tables by hand and missed two: `invites` and
-- `digest_sources`. Both were left readable by the browser-exposed
-- NEXT_PUBLIC_SUPABASE_ANON_KEY. `digest_sources` had 11 rows (user ids and
-- newsletter sender addresses); `invites` was empty, but its whole purpose is
-- to hold unredeemed invite codes.
--
-- Neither table is referenced anywhere in the application. They are leftovers.
-- Rather than hand-list tables a third time, this walks pg_tables — so a table
-- created later and forgotten is still covered the next time this runs.

do $$
declare
  t record;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t.tablename);
    execute format('revoke all on public.%I from anon, authenticated', t.tablename);
    raise notice 'locked down %', t.tablename;
  end loop;
end $$;

-- Sequences too: `revoke all on <table>` doesn't cover the identity sequence,
-- and a writable sequence leaks row counts.
do $$
declare
  s record;
begin
  for s in
    select sequencename from pg_sequences where schemaname = 'public'
  loop
    execute format('revoke all on sequence public.%I from anon, authenticated', s.sequencename);
  end loop;
end $$;

-- Audit query. Should return zero rows. Run it after any schema change.
--
--   select tablename
--     from pg_tables t
--    where schemaname = 'public'
--      and not exists (
--        select 1 from pg_class c
--         where c.relname = t.tablename and c.relrowsecurity
--      );

-- `invites` and `digest_sources` are dead. They are locked down above rather
-- than dropped, because dropping is irreversible and they cost nothing to
-- keep. To remove them once you've confirmed nothing external reads them:
--
--   drop table if exists public.invites;
--   drop table if exists public.digest_sources;
