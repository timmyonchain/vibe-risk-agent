-- ─────────────────────────────────────────────────────────────
-- Vibe Risk Agent — Supabase schema
--
-- Run this in your Supabase project: Dashboard → SQL Editor → New query →
-- paste this whole file → Run. Safe to re-run (uses IF NOT EXISTS / ON CONFLICT).
-- ─────────────────────────────────────────────────────────────

-- gen_random_uuid() lives in pgcrypto. Supabase usually has it, but be safe.
create extension if not exists pgcrypto;

-- ── paper_account: the single virtual balance row ──────────────
create table if not exists paper_account (
  id               integer primary key default 1 check (id = 1), -- only ever one row
  balance          numeric not null default 10000,
  starting_balance numeric not null default 10000,
  updated_at       timestamptz not null default now()
);

-- Seed the one and only account row (no-op if it already exists).
insert into paper_account (id, balance, starting_balance)
values (1, 10000, 10000)
on conflict (id) do nothing;

-- ── paper_trades: the trade log judges will inspect ────────────
create table if not exists paper_trades (
  id                 uuid primary key default gen_random_uuid(),
  timestamp          timestamptz not null default now(),
  symbol             text not null,
  direction          text not null,          -- "long" (buy) or "short" (sell)
  price              numeric not null,        -- entry price
  quantity           numeric not null,
  balance_before     numeric not null,
  balance_after      numeric not null,
  balance_change     numeric not null,
  stop_loss_percent  numeric not null,
  take_profit_percent numeric not null,
  status             text not null,           -- "open" or "closed"
  reasoning          text,
  confidence         numeric,
  closed_at          timestamptz,             -- nullable; set when closed
  close_price        numeric,                 -- nullable; set when closed
  pnl                numeric                  -- nullable; realized profit/loss
);

-- Helpful index for the "find the open position" lookup.
create index if not exists paper_trades_status_idx on paper_trades (status);
