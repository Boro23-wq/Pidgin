-- Importance ranking: lets the dashboard surface "Top stories" and "Trending"
-- ahead of everything else, instead of a flat recency-only list.
-- Run in the Supabase SQL editor.

alter table summaries add column if not exists significance text default 'notable';
