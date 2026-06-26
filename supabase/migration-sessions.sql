-- ─────────────────────────────────────────────────────────────
-- Vibe Risk Agent — Phase 9 migration: anonymous per-visitor sessions
--
-- Run this in your Supabase project: Dashboard → SQL Editor → New query →
-- paste this whole file → Run. Safe to re-run (uses IF NOT EXISTS / guards).
--
-- What it does: scopes account + trade data to a per-browser "session_id"
-- so each visitor gets their own isolated balance and trade history.
--
-- Backward compatible: the original single shared account row (id = 1) and any
-- existing trades are left untouched as orphaned legacy data (session_id NULL).
-- The original schema.sql is NOT modified.
-- ─────────────────────────────────────────────────────────────

-- ── 1. Tag both tables with the owning session ────────────────
alter table paper_account add column if not exists session_id text;
alter table paper_trades  add column if not exists session_id text;

-- ── 2. Allow more than one paper_account row ──────────────────
-- The original table pinned every row to id = 1 via a CHECK constraint and a
-- default of 1. Drop that constraint (whatever its generated name is) so each
-- session can have its own account row.
do $$
declare
  c text;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'paper_account'::regclass
      and contype = 'c'
  loop
    execute format('alter table paper_account drop constraint %I', c);
  end loop;
end $$;

-- New account rows must get unique ids instead of all defaulting to 1.
-- Back the id column with a sequence that starts after the legacy row.
create sequence if not exists paper_account_id_seq owned by paper_account.id;
select setval(
  'paper_account_id_seq',
  greatest(coalesce((select max(id) from paper_account), 0), 1)
);
alter table paper_account alter column id set default nextval('paper_account_id_seq');

-- ── 3. One account per session; fast per-session trade lookups ─
-- Unique index over session_id keeps lazy account creation idempotent.
-- (The legacy row's NULL session_id is exempt — Postgres treats NULLs as
-- distinct in unique indexes.)
create unique index if not exists paper_account_session_id_idx
  on paper_account (session_id);

create index if not exists paper_trades_session_id_idx
  on paper_trades (session_id);
