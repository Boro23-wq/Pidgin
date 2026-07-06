-- Morning Brief repositioning: trend memory + light source extensibility.
-- Run in the Supabase SQL editor. Safe to run once; re-running will error on
-- "already exists" for the table/columns, which is fine to ignore.

-- New columns on summaries: light future-proofing for a second source type,
-- plus the new per-story "why it matters" / "what to do" framing.
alter table summaries add column if not exists source_type text default 'gmail';
alter table summaries add column if not exists why_it_matters text;
alter table summaries add column if not exists what_to_do text;

-- Trend memory ledger. Decoupled from `summaries`' 7-day retention window
-- (see deleteOldSummaries in lib/supabase.ts) so multi-week recurrence
-- ("this has come up for the 3rd week running") can still be computed after
-- the underlying summary rows have been pruned.
create table if not exists topic_occurrences (
  user_id text not null,
  topic_key text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_seen_week text not null,
  weeks_seen_count int not null default 1,
  occurrences_count int not null default 1,
  last_title text,
  primary key (user_id, topic_key)
);

create index if not exists topic_occurrences_user_id_idx on topic_occurrences (user_id);
