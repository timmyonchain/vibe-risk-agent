// ─────────────────────────────────────────────────────────────
// Paper trading execution. Persists to Supabase (Postgres) so the trade
// log survives across Vercel's stateless serverless invocations.
//
// Uses the SERVICE ROLE key — server-side only. Never import this into a
// client component or expose the key to the browser.
// ─────────────────────────────────────────────────────────────

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Perception } from "@/lib/perception/market";
import type { TradeDecision } from "@/lib/decision/decide";

let client: SupabaseClient | null = null;

/** Lazily create the Supabase client, with a clear error if env is missing. */
function getClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local (see .env.local.example) and restart the dev server.",
    );
  }
  if (!client) {
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

export interface PaperAccount {
  id: number;
  balance: number;
  starting_balance: number;
  updated_at: string;
}

export interface PaperTrade {
  id: string;
  timestamp: string;
  symbol: string;
  direction: string; // "long" (buy) | "short" (sell)
  price: number;
  quantity: number;
  balance_before: number;
  balance_after: number;
  balance_change: number;
  stop_loss_percent: number;
  take_profit_percent: number;
  status: string; // "open" | "closed"
  reasoning: string | null;
  confidence: number | null;
  closed_at: string | null;
  close_price: number | null;
  pnl: number | null;
}

/** Fetch the single virtual balance row (id = 1). */
export async function getAccount(): Promise<PaperAccount> {
  const { data, error } = await getClient()
    .from("paper_account")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) {
    throw new Error(`Failed to load paper_account: ${error.message}`);
  }
  return data as PaperAccount;
}

/** Fetch the currently open position, or null if none. Only one is allowed. */
export async function getOpenPosition(): Promise<PaperTrade | null> {
  const { data, error } = await getClient()
    .from("paper_trades")
    .select("*")
    .eq("status", "open")
    .order("timestamp", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Failed to query open positions: ${error.message}`);
  }
  return data && data.length > 0 ? (data[0] as PaperTrade) : null;
}

export type ExecuteResult = { skipped: true; reason: string } | PaperTrade;

/**
 * executeTrade — open a new paper position from a decision, if appropriate.
 *
 * Skips (returns { skipped, reason }) when the action is "hold", a position is
 * already open, or the position size is 0%. Otherwise inserts a new "open" row
 * and returns it. Balance is unchanged at open time — PnL is realized later
 * when the position closes (Phase 5).
 */
export async function executeTrade(
  decision: TradeDecision,
  perception: Perception,
): Promise<ExecuteResult> {
  if (decision.action === "hold") {
    return { skipped: true, reason: "Decision was 'hold' — no position opened." };
  }

  const open = await getOpenPosition();
  if (open) {
    return {
      skipped: true,
      reason: "A position is already open — only one open position is allowed at a time.",
    };
  }

  if (decision.positionSizePercent <= 0) {
    return { skipped: true, reason: "Position size is 0% — nothing to allocate." };
  }

  const account = await getAccount();
  const balanceBefore = Number(account.balance);

  // Allocate a slice of the balance and convert to base-asset quantity.
  const quantity =
    (balanceBefore * decision.positionSizePercent) / 100 / perception.price;

  // "buy" => going long, "sell" => going short.
  const direction = decision.action === "buy" ? "long" : "short";

  const { data, error } = await getClient()
    .from("paper_trades")
    .insert({
      symbol: perception.symbol,
      direction,
      price: perception.price,
      quantity,
      balance_before: balanceBefore,
      balance_after: balanceBefore, // unchanged until the position closes
      balance_change: 0,
      stop_loss_percent: decision.stopLossPercent,
      take_profit_percent: decision.takeProfitPercent,
      status: "open",
      reasoning: decision.reasoning,
      confidence: decision.confidence,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to insert paper trade: ${error.message}`);
  }
  return data as PaperTrade;
}

// ─────────────────────────────────────────────────────────────
// Closing helpers (used by the Phase 5 risk monitor).
// ─────────────────────────────────────────────────────────────

/**
 * closeTrade — mark an open trade as closed and record its outcome.
 * Also updates balance_after / balance_change on the row so the trade log
 * (which judges inspect) reflects the realized result, not the open-time state.
 */
export async function closeTrade(
  tradeId: string,
  fields: { closePrice: number; pnl: number; balanceAfter: number; closedAt?: string },
): Promise<PaperTrade> {
  const { data, error } = await getClient()
    .from("paper_trades")
    .update({
      status: "closed",
      closed_at: fields.closedAt ?? new Date().toISOString(),
      close_price: fields.closePrice,
      pnl: fields.pnl,
      balance_after: fields.balanceAfter,
      balance_change: fields.pnl,
    })
    .eq("id", tradeId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to close trade ${tradeId}: ${error.message}`);
  }
  return data as PaperTrade;
}

/** updateAccountBalance — set the virtual balance (id = 1) to a new value. */
export async function updateAccountBalance(newBalance: number): Promise<PaperAccount> {
  const { data, error } = await getClient()
    .from("paper_account")
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq("id", 1)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update account balance: ${error.message}`);
  }
  return data as PaperAccount;
}
