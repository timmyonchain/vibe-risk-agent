import { NextResponse } from "next/server";
import {
  getTicker,
  getCandles,
  calculateRSI,
  calculateSMA,
} from "@/lib/perception/market";

// Always run fresh on each request — market data must never be cached.
export const dynamic = "force-dynamic";

// Round helper for clean JSON output.
const round = (n: number | null, dp = 2): number | null =>
  n === null ? null : Math.round(n * 10 ** dp) / 10 ** dp;

export async function GET() {
  try {
    // Fetch ticker + candles in parallel for speed.
    const [ticker, closes] = await Promise.all([getTicker(), getCandles()]);

    const rsi = calculateRSI(closes, 14);
    const sma20 = calculateSMA(closes, 20);
    const sma50 = calculateSMA(closes, 50);

    // Trend: which moving average is on top?
    const trend =
      sma20 !== null && sma50 !== null
        ? sma20 > sma50
          ? "bullish"
          : "bearish"
        : "unknown";

    // Funding sentiment: are traders crowded one way?
    // NOTE: thresholds are as specified (0.01). Bitget returns funding as a
    // decimal (e.g. 0.0001 = 0.01%), so this will read "neutral" unless funding
    // is extreme. Easy to retune later if you want it more sensitive.
    const fundingSentiment =
      ticker.fundingRate > 0.01
        ? "crowded long"
        : ticker.fundingRate < -0.01
          ? "crowded short"
          : "neutral";

    return NextResponse.json({
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
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch market perception", detail: message },
      { status: 502 },
    );
  }
}
