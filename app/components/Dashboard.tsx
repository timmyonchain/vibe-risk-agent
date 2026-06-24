"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Send,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Target,
  Wallet,
} from "lucide-react";
import type { AccountResponse, Decision, Trade } from "./types";

type FeedKind = "buy" | "sell" | "hold" | "closed";

interface FeedEntry {
  id: string;
  timestamp: string;
  kind: FeedKind;
  dotColor: string;
  text: string;
}

const KIND_COLOR: Record<FeedKind, string> = {
  buy: "var(--vibe-cyan)",
  sell: "var(--pnl-negative)",
  hold: "#a89f8c",
  closed: "#cbb994",
};

/** Map a stored trade row to a feed entry (long => buy, short => sell). */
function tradeToFeed(t: Trade): FeedEntry {
  const kind: FeedKind = t.direction === "long" ? "buy" : "sell";
  return {
    id: t.id,
    timestamp: t.timestamp,
    kind,
    dotColor: KIND_COLOR[kind],
    text: t.reasoning ?? "(no reasoning recorded)",
  };
}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const fmtUSD = (n: number) =>
  n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function Dashboard() {
  const [account, setAccount] = useState<AccountResponse | null>(null);
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [live, setLive] = useState<{ price: number; change24h: number } | null>(
    null,
  );

  const position = account?.openPosition ?? null;

  // Refresh just the account (balance + open position) without touching feed.
  const refreshAccount = useCallback(async () => {
    try {
      const acc = await fetch("/api/account").then((r) => r.json());
      if (acc && !acc.error) setAccount(acc as AccountResponse);
    } catch {
      /* leave previous state in place */
    }
  }, []);

  // On mount: load real current state (feed history + account).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const d = await fetch("/api/trades").then((r) => r.json());
        if (active && d && !d.error && Array.isArray(d.trades)) {
          setFeed((d.trades as Trade[]).map(tradeToFeed));
        }
      } catch {
        /* ignore */
      }
      if (active) await refreshAccount();
    })();
    return () => {
      active = false;
    };
  }, [refreshAccount]);

  // Poll live price every 10s (drives the position card's live PnL).
  useEffect(() => {
    let active = true;
    const tick = async () => {
      try {
        const p = await fetch("/api/perception").then((r) => r.json());
        if (active && p && typeof p.price === "number") {
          setLive({ price: p.price, change24h: p.change24h });
        }
      } catch {
        /* ignore transient errors */
      }
    };
    tick();
    const id = setInterval(tick, 10_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  // While a position is open, run the server-side risk check every 15s.
  useEffect(() => {
    if (!position) return;
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/risk-check").then((r) => r.json());
        if (res && res.closed === true) {
          const profit = res.pnl >= 0;
          setFeed((f) => [
            {
              id: `close-${Date.now()}`,
              timestamp: new Date().toISOString(),
              kind: "closed",
              dotColor: profit ? "var(--vibe-cyan)" : "var(--pnl-negative)",
              text: `Position closed (${res.reason}). Realized PnL $${res.pnl} (${res.currentPnlPercent}%). New balance $${fmtUSD(res.newBalance)}.`,
            },
            ...f,
          ]);
          refreshAccount();
        }
      } catch {
        /* ignore */
      }
    }, 15_000);
    return () => clearInterval(id);
  }, [position, refreshAccount]);

  const runAgent = async () => {
    const text = input.trim();
    if (!text || running) return;
    setRunning(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riskProfile: text }),
      }).then((r) => r.json());

      if (res.error) {
        setErrorMsg(res.detail ? `${res.error} — ${res.detail}` : res.error);
      } else {
        const decision: Decision = res.decision;
        setFeed((f) => [
          {
            id: `exec-${Date.now()}`,
            timestamp: new Date().toISOString(),
            kind: decision.action,
            dotColor: KIND_COLOR[decision.action],
            text: decision.reasoning,
          },
          ...f,
        ]);
        await refreshAccount();
      }
    } catch {
      setErrorMsg("Network error calling the agent.");
    } finally {
      setRunning(false);
    }
  };

  // ── Derived display values ────────────────────────────────
  const balance = account?.balance ?? null;
  const starting = account?.starting_balance ?? 10000;
  const balPct = balance === null ? null : ((balance - starting) / starting) * 100;
  const balUp = (balPct ?? 0) >= 0;

  // Live PnL% mirrors the server formula in lib/risk/monitor.ts (display only).
  let livePnlPercent: number | null = null;
  let slPrice: number | null = null;
  let tpPrice: number | null = null;
  if (position) {
    const entry = Number(position.price);
    const isLong = position.direction === "long";
    if (live) {
      livePnlPercent = isLong
        ? ((live.price - entry) / entry) * 100
        : ((entry - live.price) / entry) * 100;
    }
    const sl = Number(position.stop_loss_percent);
    const tp = Number(position.take_profit_percent);
    slPrice = isLong ? entry * (1 - sl / 100) : entry * (1 + sl / 100);
    tpPrice = isLong ? entry * (1 + tp / 100) : entry * (1 - tp / 100);
  }
  const pnlUp = (livePnlPercent ?? 0) >= 0;

  return (
    <section
      id="dashboard"
      className="w-full bg-dash-bg px-6 py-16 md:px-10"
    >
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-medium uppercase tracking-wider text-vibe-cyan">
          Live Agent
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-cream md:text-4xl">
          Describe your risk. Watch it trade.
        </h2>

        {/* Input row */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") runAgent();
            }}
            placeholder="e.g. moderate risk, swing trade BTC, exit at -5%"
            className="flex-1 rounded-xl border px-4 py-3 text-sm text-cream placeholder:text-cream/40 outline-none focus:border-[color:var(--vibe-cyan)]"
            style={{
              background: "var(--card-bg)",
              borderColor: "var(--card-border)",
            }}
          />
          <button
            onClick={runAgent}
            disabled={running || !input.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-vibe-cyan px-6 py-3 text-sm font-semibold text-charcoal-green transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={16} />
            {running ? "Running…" : "Run Agent"}
          </button>
        </div>
        {errorMsg && (
          <p className="mt-3 text-sm" style={{ color: "var(--pnl-negative)" }}>
            {errorMsg}
          </p>
        )}

        {/* Main grid */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Reasoning feed */}
          <div
            className="rounded-2xl border lg:col-span-2"
            style={{
              background: "var(--card-bg)",
              borderColor: "var(--card-border)",
            }}
          >
            <div
              className="border-b px-5 py-4"
              style={{ borderColor: "var(--card-border)" }}
            >
              <h3 className="text-sm font-semibold text-cream">
                Reasoning Feed
              </h3>
              <p className="text-xs text-cream/50">
                Newest first · what the agent decided and why
              </p>
            </div>
            <div className="feed-scroll max-h-[460px] space-y-3 overflow-y-auto p-5">
              {feed.length === 0 ? (
                <p className="py-10 text-center text-sm text-cream/40">
                  No activity yet. Type a risk profile above and run the agent.
                </p>
              ) : (
                feed.map((e) => (
                  <div
                    key={e.id}
                    className="rounded-xl border px-4 py-3"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      borderColor: "var(--card-border)",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ background: e.dotColor }}
                      />
                      <span
                        className="text-xs font-bold uppercase tracking-wide"
                        style={{ color: e.dotColor }}
                      >
                        {e.kind}
                      </span>
                      <span className="ml-auto text-xs tabular-nums text-cream/40">
                        {fmtTime(e.timestamp)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-cream/80">
                      {e.text}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right column: balance + position */}
          <div className="space-y-6">
            {/* Balance */}
            <div
              className="rounded-2xl border p-5"
              style={{
                background: "var(--card-bg)",
                borderColor: "var(--card-border)",
              }}
            >
              <div className="flex items-center gap-2 text-cream/60">
                <Wallet size={16} />
                <span className="text-sm font-medium">Paper Balance</span>
              </div>
              <div className="mt-3 text-3xl font-semibold tabular-nums text-cream">
                {balance === null ? "—" : `$${fmtUSD(balance)}`}
              </div>
              <div
                className="mt-1 text-sm font-medium tabular-nums"
                style={{
                  color: balUp ? "var(--vibe-cyan)" : "var(--pnl-negative)",
                }}
              >
                {balPct === null
                  ? "—"
                  : `${balUp ? "+" : ""}${balPct.toFixed(2)}% from $${fmtUSD(starting)}`}
              </div>
            </div>

            {/* Current position */}
            <div
              className="rounded-2xl border p-5"
              style={{
                background: "var(--card-bg)",
                borderColor: "var(--card-border)",
              }}
            >
              <div className="flex items-center gap-2 text-cream/60">
                <Target size={16} />
                <span className="text-sm font-medium">Current Position</span>
              </div>

              {!position ? (
                <p className="mt-4 text-sm text-cream/50">
                  No open position. Agent is watching.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-cream">
                      {position.symbol}
                    </span>
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold uppercase"
                      style={{
                        background:
                          position.direction === "long"
                            ? "rgba(31,199,194,0.15)"
                            : "rgba(226,87,76,0.15)",
                        color:
                          position.direction === "long"
                            ? "var(--vibe-cyan)"
                            : "var(--pnl-negative)",
                      }}
                    >
                      {position.direction === "long" ? (
                        <TrendingUp size={13} />
                      ) : (
                        <TrendingDown size={13} />
                      )}
                      {position.direction}
                    </span>
                  </div>

                  {/* Live PnL */}
                  <div>
                    <div className="text-xs text-cream/50">
                      Unrealized PnL (live)
                    </div>
                    <div
                      className="text-2xl font-semibold tabular-nums"
                      style={{
                        color: pnlUp
                          ? "var(--vibe-cyan)"
                          : "var(--pnl-negative)",
                      }}
                    >
                      {livePnlPercent === null
                        ? "—"
                        : `${pnlUp ? "+" : ""}${livePnlPercent.toFixed(2)}%`}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Stat label="Entry" value={`$${fmtUSD(Number(position.price))}`} />
                    <Stat
                      label="Live"
                      value={live ? `$${fmtUSD(live.price)}` : "—"}
                    />
                    <Stat
                      label="Quantity"
                      value={Number(position.quantity).toFixed(5)}
                    />
                    <Stat
                      label="Size"
                      value={`$${fmtUSD(Number(position.quantity) * Number(position.price))}`}
                    />
                  </div>

                  <div
                    className="space-y-2 border-t pt-3"
                    style={{ borderColor: "var(--card-border)" }}
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-1.5 text-cream/60">
                        <ShieldAlert size={14} />
                        Stop-Loss
                      </span>
                      <span className="tabular-nums text-cream/80">
                        −{Number(position.stop_loss_percent)}%
                        {slPrice !== null && (
                          <span className="text-cream/40">
                            {" "}
                            (${fmtUSD(slPrice)})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-1.5 text-cream/60">
                        <Target size={14} />
                        Take-Profit
                      </span>
                      <span className="tabular-nums text-cream/80">
                        +{Number(position.take_profit_percent)}%
                        {tpPrice !== null && (
                          <span className="text-cream/40">
                            {" "}
                            (${fmtUSD(tpPrice)})
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-cream/50">{label}</div>
      <div className="tabular-nums text-cream/90">{value}</div>
    </div>
  );
}
