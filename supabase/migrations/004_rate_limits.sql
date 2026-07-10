-- Durable rate limiting. Run in the Supabase SQL editor.
--
-- The previous limiter lived in a module-level Map, so it reset on every
-- serverless cold start and was never shared across concurrent Vercel
-- instances. In practice that meant an attacker could get many times the
-- nominal limit just by spreading requests, and a single cold start wiped
-- the counter entirely. Fine for an invite-only alpha; not fine once signups
-- are open, since /api/summarize spends Anthropic tokens per call.

create table if not exists rate_limit_hits (
  id bigserial primary key,
  key text not null,
  created_at timestamptz not null default now()
);

-- Supports both the per-key window scan and the pruning delete below.
create index if not exists rate_limit_hits_key_created_idx
  on rate_limit_hits (key, created_at desc);

-- Returns true when the caller is OVER the limit and should be rejected.
--
-- The advisory lock is what makes this a real limiter rather than a
-- suggestion: without it, two concurrent requests both read count < max and
-- both insert, so a burst of N parallel requests all pass a limit of 1. The
-- lock is transaction-scoped and keyed by the rate-limit key, so unrelated
-- keys never contend.
create or replace function check_rate_limit(
  p_key text,
  p_max int,
  p_window_seconds int
) returns boolean
language plpgsql
as $$
declare
  v_count int;
  v_cutoff timestamptz := now() - make_interval(secs => p_window_seconds);
begin
  perform pg_advisory_xact_lock(hashtext(p_key));

  -- Prune only this key's expired rows. A global sweep here would make every
  -- request pay for the whole table.
  delete from rate_limit_hits where key = p_key and created_at < v_cutoff;

  select count(*) into v_count
    from rate_limit_hits
   where key = p_key and created_at >= v_cutoff;

  if v_count >= p_max then
    return true;
  end if;

  insert into rate_limit_hits (key) values (p_key);
  return false;
end;
$$;

-- Same deny-by-default posture as every other table (see 003_security.sql).
-- The app reaches this only through the service-role client, which bypasses
-- RLS; the browser-exposed anon key must not be able to read or forge hits.
alter table rate_limit_hits enable row level security;
revoke all on rate_limit_hits from anon, authenticated;
revoke all on sequence rate_limit_hits_id_seq from anon, authenticated;
revoke execute on function check_rate_limit(text, int, int) from anon, authenticated;
