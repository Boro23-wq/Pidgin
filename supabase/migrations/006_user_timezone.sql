-- The user's IANA timezone, captured from the browser on each scan/import.
-- Used to anchor "today" windows and the digest greeting to the user's local
-- day instead of server (UTC) time. Nullable: absent until the user's first
-- scan after this ships, and everything falls back to UTC when null.
alter table user_tokens add column if not exists timezone text;
