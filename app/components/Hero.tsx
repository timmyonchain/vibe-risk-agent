"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

function scrollToDashboard() {
  document.getElementById("dashboard")?.scrollIntoView({ behavior: "smooth" });
}

export default function Hero() {
  const [price, setPrice] = useState<number | null>(null);
  const [change, setChange] = useState<number | null>(null);

  // Fetch a live BTC readout once on mount.
  useEffect(() => {
    let active = true;
    fetch("/api/perception")
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        if (typeof d.price === "number") setPrice(d.price);
        if (typeof d.change24h === "number") setChange(d.change24h);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const up = (change ?? 0) >= 0;

  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-cream">
      <div className="hero-gradient" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-6 md:px-10">
        {/* Nav pill */}
        <nav className="mx-auto flex items-center gap-1 rounded-full border border-black/5 bg-white/70 px-2 py-1.5 shadow-sm backdrop-blur">
          <span className="px-3 text-sm font-bold text-charcoal-green">
            VibeRisk
          </span>
          <a
            href="#dashboard"
            className="rounded-full px-4 py-2 text-sm text-charcoal-green/70 transition hover:text-charcoal-green"
          >
            How it Works
          </a>
          <a
            href="#dashboard"
            className="rounded-full px-4 py-2 text-sm text-charcoal-green/70 transition hover:text-charcoal-green"
          >
            Live Agent
          </a>
          <button
            onClick={scrollToDashboard}
            className="rounded-full bg-vibe-cyan px-4 py-2 text-sm font-semibold text-charcoal-green transition hover:opacity-90"
          >
            Launch Agent
          </button>
        </nav>

        {/* Headline */}
        <div className="flex flex-1 flex-col justify-center">
          <h1 className="max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            <span className="block text-charcoal-green">
              Close the gap between
            </span>
            <span className="block text-vibe-cyan">
              your instinct and the market
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-base text-charcoal-green/70 md:text-lg">
            VibeRisk reads live BTC signals, decides, trades on paper, and
            protects itself, all from one sentence you type.
          </p>
        </div>

        {/* Bottom row */}
        <div className="flex items-end justify-between gap-6 pb-2">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <span className="pulse-dot relative inline-flex h-2.5 w-2.5 rounded-full bg-vibe-cyan" />
              <span className="text-sm font-semibold text-charcoal-green">
                Agent Online
              </span>
            </div>
            <p className="mt-2 text-sm text-charcoal-green/60">
              Continuously watching live BTC perpetual signals, ready to act on
              the risk profile you describe.
            </p>
            <button
              onClick={scrollToDashboard}
              className="mt-4 rounded-full bg-charcoal-green px-5 py-2.5 text-sm font-semibold text-cream transition hover:opacity-90"
            >
              Launch Agent
            </button>
          </div>

          {/* Live ticker — desktop only */}
          <div className="hidden rounded-2xl border border-black/5 bg-white/70 px-5 py-4 text-right backdrop-blur md:block">
            <div className="text-xs font-medium uppercase tracking-wider text-charcoal-green/50">
              BTCUSDT · Perp
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums text-charcoal-green">
              {price === null
                ? "—"
                : `$${price.toLocaleString(undefined, { maximumFractionDigits: 1 })}`}
            </div>
            <div
              className="mt-1 flex items-center justify-end gap-1 text-sm font-medium"
              style={{ color: up ? "var(--vibe-cyan)" : "var(--pnl-negative)" }}
            >
              {change === null ? null : up ? (
                <ArrowUpRight size={16} />
              ) : (
                <ArrowDownRight size={16} />
              )}
              <span className="tabular-nums">
                {change === null ? "—" : `${(change * 100).toFixed(2)}%`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
