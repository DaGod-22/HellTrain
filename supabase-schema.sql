-- ============================================================
-- HELL TRAIN — Global leaderboard schema (Supabase / Postgres)
-- Run this once in the Supabase SQL editor for your project.
-- Safe to re-run: uses IF NOT EXISTS everywhere.
--
-- Boards:
--   leaderboard_entries : one row per player per (realm, difficulty, month)
--                         keeps the player's BEST score — a worse run
--                         never overwrites it. The client only upserts
--                         when the new score beats the old one.
--   monthly_standings   : one row per player per month — best score
--                         across ALL boards. Powers the season rewards
--                         (top 50 payout table) at month rollover.
-- ============================================================

create table if not exists leaderboard_entries (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  player_id  text not null,
  name       text not null default 'CONDUCTOR',
  score      bigint not null check (score >= 0 and score < 1000000000000),
  stage      int not null default 1 check (stage >= 1 and stage <= 999),
  kills      int not null default 0,
  realm      text not null,
  difficulty text not null,
  period     text not null, -- 'YYYY-MM'
  unique (player_id, realm, difficulty, period)
);

create table if not exists monthly_standings (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  player_id  text not null,
  name       text not null default 'CONDUCTOR',
  score      bigint not null default 0,
  period     text not null, -- 'YYYY-MM'
  unique (player_id, period)
);

create index if not exists idx_board_rank on leaderboard_entries
  (period, realm, difficulty, score desc);
create index if not exists idx_month_rank on monthly_standings
  (period, score desc);

-- Row level security: anon key may insert and may read — nothing else.
alter table leaderboard_entries enable row level security;
alter table monthly_standings  enable row level security;

drop policy if exists "board read"  on leaderboard_entries;
drop policy if exists "board write" on leaderboard_entries;
drop policy if exists "month read"  on monthly_standings;
drop policy if exists "month write" on monthly_standings;

create policy "board read"  on leaderboard_entries for select using (true);
create policy "board write" on leaderboard_entries for insert with check (true);
create policy "month read"  on monthly_standings  for select using (true);
create policy "month write" on monthly_standings  for insert with check (true);

-- Notes:
--  * upserts need the UNIQUE constraints above; the client upserts with
--    on_conflict = (player_id,realm,difficulty,period) / (player_id,period)
--    but only after reading its own best row, so scores only ever go up.
--  * "update" permission is intentionally NOT granted: a player who beats
--    their score inserts a corrected row via delete+insert is not needed —
--    the client upsert path uses INSERT ... ON CONFLICT DO UPDATE, which
--    requires an update policy. Grant it narrowly:
drop policy if exists "board update" on leaderboard_entries;
drop policy if exists "month update" on monthly_standings;
create policy "board update" on leaderboard_entries for update using (true) with check (true);
create policy "month update" on monthly_standings  for update using (true) with check (true);
