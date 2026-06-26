// ─────────────────────────────────────────────────────────────
// Risk management: a SINGLE stop-loss / take-profit check.
//
// This is intentionally NOT a background loop — Vercel's serverless
// functions can't run forever. Call this repeatedly from outside
// (e.g. a cron job or manual GET) to monitor the open position.
// ─────────────────────────────────────────────────────────────

import { getTicker } from "@/lib/perception/market";
import {
  getOpenPosition,
  getAccount,
  closeTrade,
  updateAccountBalance,
} from "@/lib/execution/paperTrade";

export type CloseReason = "stop_loss" | "take_profit";

export type RiskCheckResult =
  | { closed: false; reason: string } // no open position
  | { closed: false; currentPnlPercent: number } // still open, just reporting
  | {
      closed: true;
      reason: CloseReason;
      pnl: number;
      newBalance: number;
      currentPnlPercent: number;
    };

const round = (n: number, dp = 2): number => Math.round(n * 10 ** dp) / 10 ** dp;

export async function checkAndCloseTrade(sessionId: string): Promise<RiskCheckResult> {
  // 1. Is there anything to monitor for this session?
  const open = await getOpenPosition(sessionId);
  if (!open) {
    return { closed: false, reason: "No open position" };
  }

  // 2. Current live price vs entry.
  const ticker = await getTicker();
  const currentPrice = ticker.lastPr;
  const entryPrice = Number(open.price);
  const quantity = Number(open.quantity);
  const isLong = open.direction === "long";

  // 3. Unrealized PnL as a percent.
  const pnlPercent = isLong
    ? ((currentPrice - entryPrice) / entryPrice) * 100
    : ((entryPrice - currentPrice) / entryPrice) * 100;

  const stopLossPercent = Number(open.stop_loss_percent);
  const takeProfitPercent = Number(open.take_profit_percent);

  // 4. Has it hit a threshold?
  let reason: CloseReason | null = null;
  if (pnlPercent <= -stopLossPercent) {
    reason = "stop_loss";
  } else if (pnlPercent >= takeProfitPercent) {
    reason = "take_profit";
  }

  // 5a. Not triggered — leave it open and report status.
  if (!reason) {
    return { closed: false, currentPnlPercent: round(pnlPercent) };
  }

  // 5b. Triggered — realize the dollar PnL, close the trade, update balance.
  const pnl = isLong
    ? quantity * (currentPrice - entryPrice)
    : quantity * (entryPrice - currentPrice);

  const account = await getAccount(sessionId);
  const newBalance = Number(account.balance) + pnl;

  // NOTE: two separate writes (not a single DB transaction). Fine for a paper
  // simulator with one position at a time; revisit if concurrency is added.
  await updateAccountBalance(sessionId, newBalance);
  await closeTrade(open.id, {
    closePrice: currentPrice,
    pnl,
    balanceAfter: newBalance,
  });

  return {
    closed: true,
    reason,
    pnl: round(pnl),
    newBalance: round(newBalance),
    currentPnlPercent: round(pnlPercent),
  };
}
