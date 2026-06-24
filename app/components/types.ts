// Shared client-side types mirroring the API response shapes.

export type Action = "buy" | "sell" | "hold";

export interface Perception {
  symbol: string;
  price: number;
  change24h: number;
  fundingRate: number;
  fundingSentiment: string;
  rsi: number | null;
  sma20: number | null;
  sma50: number | null;
  trend: string;
  timestamp: string;
}

export interface Decision {
  action: Action;
  confidence: number;
  positionSizePercent: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  reasoning: string;
}

export interface Trade {
  id: string;
  timestamp: string;
  symbol: string;
  direction: string; // "long" | "short"
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

export interface AccountResponse {
  balance: number;
  starting_balance: number;
  updated_at: string;
  openPosition: Trade | null;
}
