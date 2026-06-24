// ─────────────────────────────────────────────────────────────
// Perception layer: pull live BTC market data from Bitget's PUBLIC API.
// No API keys or authentication are needed for any endpoint here.
// All functions throw on failure so callers can handle errors cleanly.
// ─────────────────────────────────────────────────────────────

const BASE = "https://api.bitget.com/api/v2/mix/market";

const TICKER_URL =
  `${BASE}/ticker?symbol=BTCUSDT&productType=usdt-futures`;

const CANDLES_URL =
  `${BASE}/candles?symbol=BTCUSDT&granularity=15m&limit=100&productType=usdt-futures`;

export interface Ticker {
  lastPr: number; // current/last traded price
  fundingRate: number; // perpetual funding rate (decimal, e.g. 0.0001 = 0.01%)
  markPrice: number; // mark price used for liquidations
  change24h: number; // 24h price change ratio (decimal, e.g. 0.0123 = +1.23%)
}

/**
 * getTicker — current BTCUSDT perpetual snapshot.
 * Bitget returns numbers as strings, so we convert to real numbers here.
 */
export async function getTicker(): Promise<Ticker> {
  const res = await fetch(TICKER_URL, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Bitget ticker request failed: HTTP ${res.status}`);
  }

  const json = await res.json();
  // Bitget wraps results: { code: "00000", msg: "success", data: [ {...} ] }
  if (json.code !== "00000" || !json.data?.[0]) {
    throw new Error(`Bitget ticker error: ${json.msg ?? "unexpected response"}`);
  }

  const d = json.data[0];
  return {
    lastPr: Number(d.lastPr),
    fundingRate: Number(d.fundingRate),
    markPrice: Number(d.markPrice),
    change24h: Number(d.change24h),
  };
}

/**
 * getCandles — last 100 fifteen-minute candles, reduced to closing prices.
 *
 * Each raw candle is a tuple:
 *   [ timestamp, open, high, low, close, baseVolume, quoteVolume ]
 * We sort oldest -> newest (so the last element is the most recent close)
 * and return just the close (index 4) as a plain number array.
 */
export async function getCandles(): Promise<number[]> {
  const res = await fetch(CANDLES_URL, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Bitget candles request failed: HTTP ${res.status}`);
  }

  const json = await res.json();
  if (json.code !== "00000" || !Array.isArray(json.data)) {
    throw new Error(`Bitget candles error: ${json.msg ?? "unexpected response"}`);
  }

  const rows = json.data as string[][];
  const sorted = [...rows].sort((a, b) => Number(a[0]) - Number(b[0])); // oldest -> newest
  return sorted.map((row) => Number(row[4])); // index 4 = close
}

// ─────────────────────────────────────────────────────────────
// Indicators — written by hand, no external library.
// Both return `null` if there isn't enough data to compute them.
// ─────────────────────────────────────────────────────────────

/**
 * calculateRSI — standard Wilder's Relative Strength Index.
 * Needs at least (period + 1) closes. Returns a value 0–100.
 */
export function calculateRSI(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;

  // Seed: simple average of gains/losses over the first `period` changes.
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff; // make positive
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Wilder smoothing across the remaining closes.
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100; // no losses => maximally overbought
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * calculateSMA — simple moving average over the most recent `period` closes.
 */
export function calculateSMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const recent = closes.slice(closes.length - period);
  const sum = recent.reduce((acc, n) => acc + n, 0);
  return sum / period;
}

// ─────────────────────────────────────────────────────────────
// getPerception — the full market snapshot used by the API routes
// and the decision engine. Combines the ticker + computed indicators
// into one clean object so callers never duplicate this logic.
// ─────────────────────────────────────────────────────────────

export type FundingSentiment = "crowded long" | "crowded short" | "neutral";
export type Trend = "bullish" | "bearish" | "unknown";

export interface Perception {
  symbol: string;
  price: number;
  change24h: number;
  fundingRate: number;
  fundingSentiment: FundingSentiment;
  rsi: number | null;
  sma20: number | null;
  sma50: number | null;
  trend: Trend;
  timestamp: string;
}

const round = (n: number | null, dp = 2): number | null =>
  n === null ? null : Math.round(n * 10 ** dp) / 10 ** dp;

export async function getPerception(): Promise<Perception> {
  // Fetch ticker + candles in parallel for speed.
  const [ticker, closes] = await Promise.all([getTicker(), getCandles()]);

  const rsi = calculateRSI(closes, 14);
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);

  // Trend: which moving average is on top?
  const trend: Trend =
    sma20 !== null && sma50 !== null
      ? sma20 > sma50
        ? "bullish"
        : "bearish"
      : "unknown";

  // Funding sentiment tuned to real-world magnitudes (0.0005 = 0.05%).
  const fundingSentiment: FundingSentiment =
    ticker.fundingRate > 0.0005
      ? "crowded long"
      : ticker.fundingRate < -0.0005
        ? "crowded short"
        : "neutral";

  return {
    symbol: "BTCUSDT",
    price: ticker.lastPr,
    change24h: ticker.change24h,
    fundingRate: ticker.fundingRate,
    fundingSentiment,
    rsi: round(rsi),
    sma20: round(sma20),
    sma50: round(sma50),
    trend,
    timestamp: new Date().toISOString(),
  };
}
