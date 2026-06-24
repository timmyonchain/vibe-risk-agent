# Vibe Risk Agent

An autonomous trading agent that turns one plain-English sentence into a full perceive → decide → execute → protect loop on BTC perpetuals. Built for Bitget AI Base Camp Hackathon S1, Track 1 (Trading Agent).

## The idea

Every trading product since the Amsterdam stock exchange in 1602 has assumed a human is the one pulling the trigger. Vibe Risk Agent removes that assumption. You type something like *"moderate risk, swing trade BTC, exit at -5%"*, and the agent handles everything else: reading the market, deciding, trading on paper, and managing its own risk.

## The loop

**1. Perceive** — Pulls live BTC price, RSI(14), SMA(20/50), and funding rate straight from Bitget's public market data API (`/api/v2/mix/market/ticker`, `/candles`), refreshed continuously. No authentication required, no API key needed for this layer.

**2. Decide** — The live market snapshot plus the user's risk profile is sent to Groq's `llama-3.3-70b-versatile`. The model returns a strict JSON decision: action (buy/sell/hold), confidence, position size, stop-loss %, take-profit %, and its reasoning in plain English.

**3. Execute** — On a buy/sell decision, the agent opens a simulated paper position sized against a virtual $10,000 balance, and permanently logs it to Supabase: timestamp, symbol, direction, entry price, quantity, balance before/after.

**4. Protect** — On every check, the agent compares its open position's live P&L against the stop-loss/take-profit it set for itself, and closes the position automatically the moment either threshold is crossed, updating the logged trade and the account balance with the realized P&L.

## Why this satisfies the track

- **Real, verifiable usage record**: every decision and every trade is permanently logged in Supabase, not just displayed and forgotten (`paper_trades` table: timestamp, direction, price, quantity, balance_change).
- **Full closed loop, not a partial demo**: perception → decision → execution → risk management, all four stages are live and wired together, not mocked.
- **No real funds required**: paper trading throughout, exactly as the track allows.
- **Disciplined, not reckless**: the agent has repeatedly chosen to hold through bearish/oversold conditions rather than force a trade, see the reasoning feed in the live demo.

## Tech stack

- **Frontend**: Next.js 16, TypeScript, Tailwind CSS, Framer Motion
- **AI decision engine**: Groq (`llama-3.3-70b-versatile`)
- **Market data**: Bitget public REST API (mix/market endpoints)
- **Persistence**: Supabase (Postgres)
- **Deployment**: Vercel

## Live demo

https://viberisk-agent.vercel.app

## Running locally

```bash
git clone <repo-url>
cd vibe-risk-agent
npm install
cp .env.local.example .env.local
# fill in GROQ_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
# run supabase/schema.sql in your Supabase project's SQL editor first
npm run dev
```

## API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/perception` | GET | Live BTC price, RSI, SMA, funding sentiment |
| `/api/decision` | POST | Runs perception + Groq decision, no trade execution |
| `/api/execute` | POST | Full loop: perceive → decide → open paper trade if applicable |
| `/api/risk-check` | GET | Checks the open position against stop-loss/take-profit, closes if triggered |
| `/api/account` | GET | Current balance + open position |
| `/api/trades` | GET | Last 20 logged trades |

## Example trade log entry

```json
{
  "symbol": "BTCUSDT",
  "direction": "long",
  "price": 60740.2,
  "quantity": 0.0165,
  "stop_loss_percent": 5,
  "take_profit_percent": 10,
  "status": "closed",
  "close_price": 60807.1,
  "pnl": 1.07,
  "reasoning": "RSI deeply oversold but trend remains bearish and funding neutral; sized conservatively given moderate risk profile."
}
```

## Built by

Solo build, Bitget AI Base Camp Hackathon S1.
