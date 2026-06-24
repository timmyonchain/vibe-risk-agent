"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { ArrowUpRight, X } from "lucide-react";

// Signature easing curve used across every hero entrance animation.
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE, delay: i * 0.1 },
  }),
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE, delay: i * 0.12 },
  }),
};

const clipReveal: Variants = {
  hidden: { y: "110%" },
  show: (i: number) => ({
    y: 0,
    transition: { duration: 0.7, ease: EASE, delay: 0.4 + i * 0.14 },
  }),
};

function scrollToDashboard() {
  document.getElementById("dashboard")?.scrollIntoView({ behavior: "smooth" });
}

// ── Decorative animated background: a slow glowing pulse-sweep line. ──
function PulseSweep() {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 2, ease: EASE }}
    >
      <motion.svg
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        className="h-[45%] w-[120%]"
        animate={{ x: ["-3%", "3%"] }}
        transition={{
          duration: 20,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
      >
        <path
          d="M0,160 C180,80 320,80 480,160 C640,240 800,240 960,160 C1120,80 1280,80 1440,160"
          fill="none"
          stroke="var(--vibe-cyan)"
          strokeWidth={2.5}
          strokeLinecap="round"
          style={{
            filter: "drop-shadow(0 0 16px var(--vibe-cyan))",
            opacity: 0.28,
          }}
        />
      </motion.svg>
    </motion.div>
  );
}

// ── 32px circular logo with inner cyan dot. ──
function LogoMark() {
  return (
    <span
      className="flex h-8 w-8 items-center justify-center rounded-full"
      style={{ border: "2px solid var(--vibe-cyan)" }}
    >
      <span
        className="block rounded-full"
        style={{
          width: 10,
          height: 10,
          background: "var(--vibe-cyan)",
        }}
      />
    </span>
  );
}

const NAV_LINKS = ["HOW IT WORKS", "LIVE AGENT"];

export default function Hero() {
  const [price, setPrice] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Live BTC price, refreshed every 10s.
  useEffect(() => {
    let active = true;
    const tick = async () => {
      try {
        const d = await fetch("/api/perception").then((r) => r.json());
        if (active && typeof d.price === "number") setPrice(d.price);
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

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const goToDashboard = () => {
    setMenuOpen(false);
    scrollToDashboard();
  };

  const priceText =
    price === null
      ? "—"
      : `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  // Stats row content (kept as JSX so each item can differ).
  const stats = [
    {
      label: "BTC · LIVE",
      node: (
        <span className="inline-flex items-center gap-2 tabular-nums">
          {priceText}
          <span className="pulse-dot relative inline-flex h-2.5 w-2.5 rounded-full bg-vibe-cyan" />
        </span>
      ),
    },
    {
      label: "AUTONOMOUS\nDECISIONS",
      node: (
        <span className="tabular-nums">
          100<span style={{ color: "var(--vibe-cyan)" }}>%</span>
        </span>
      ),
    },
    {
      label: "HUMAN TRADES\nPLACED",
      node: <span className="tabular-nums">0</span>,
    },
  ];

  const headingWords = [
    { text: "PERCEIVE", color: "var(--charcoal-green)" },
    { text: "DECIDE", color: "var(--charcoal-green)" },
    { text: "ACT", color: "var(--vibe-cyan)" },
  ];

  return (
    <section className="relative flex min-h-screen flex-col overflow-hidden bg-cream">
      <PulseSweep />

      {/* ── A) NAV ── */}
      <nav className="relative z-10 flex items-center justify-between px-5 pt-5 sm:px-8 md:px-12 md:pt-6">
        <motion.div
          custom={0}
          variants={fadeDown}
          initial="hidden"
          animate="show"
          className="flex items-center gap-3"
        >
          <LogoMark />
          <span className="text-sm font-semibold uppercase tracking-widest text-charcoal-green">
            VIBERISK
          </span>
        </motion.div>

        <div className="hidden items-center gap-10 md:flex">
          {NAV_LINKS.map((link, i) => (
            <motion.button
              key={link}
              custom={i + 1}
              variants={fadeDown}
              initial="hidden"
              animate="show"
              onClick={scrollToDashboard}
              className="text-sm font-semibold uppercase tracking-widest text-charcoal-green transition-opacity hover:opacity-60"
            >
              {link}
            </motion.button>
          ))}
        </div>

        <motion.button
          custom={3}
          variants={fadeDown}
          initial="hidden"
          animate="show"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 flex-col items-center justify-center gap-1 rounded-full"
          style={{ background: "var(--charcoal-green)" }}
        >
          <span className="h-0.5 w-4 rounded-full bg-white" />
          <span className="h-0.5 w-4 rounded-full bg-white" />
          <span className="h-0.5 w-4 rounded-full bg-white" />
        </motion.button>
      </nav>

      {/* ── B) STATS ROW ── */}
      <div className="relative z-10 flex flex-1 items-center justify-end px-5 py-8 sm:px-8 md:px-12 md:py-0">
        <div className="flex items-start gap-8 md:gap-10">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="text-right"
            >
              <div
                className="text-charcoal-green"
                style={{
                  fontSize: "clamp(1.5rem, 5vw, 3.5rem)",
                  fontWeight: 600,
                  lineHeight: 1,
                }}
              >
                {s.node}
              </div>
              <div className="mt-1.5 whitespace-pre-line text-[10px] font-semibold uppercase leading-tight tracking-widest text-charcoal-green sm:text-xs md:text-sm">
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── C) BOTTOM SECTION ── */}
      <div className="relative z-10 flex flex-col gap-6 px-5 pb-8 sm:px-8 md:gap-12 md:px-12 md:pb-12">
        {/* Row A */}
        <div className="flex items-center justify-between">
          <motion.div
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="max-w-[160px] whitespace-pre-line text-[10px] font-semibold uppercase leading-tight tracking-widest text-charcoal-green sm:max-w-xs sm:text-xs md:text-sm"
          >
            {"PLAIN ENGLISH IN.\nDISCIPLINED TRADES OUT."}
          </motion.div>

          <motion.button
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            onClick={scrollToDashboard}
            className="inline-flex items-center gap-1 font-semibold text-base sm:text-xl md:text-2xl"
            style={{ color: "var(--vibe-cyan)" }}
          >
            LAUNCH AGENT
            <ArrowUpRight className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
          </motion.button>
        </div>

        {/* Row B */}
        <div className="flex items-end justify-between gap-3 sm:gap-4">
          <motion.div
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="w-[120px] shrink-0 text-[10px] font-semibold uppercase leading-tight tracking-widest text-charcoal-green sm:w-[180px] sm:text-xs md:w-[280px] md:text-right md:text-sm"
          >
            AN AUTONOMOUS AGENT THAT WATCHES BTC, DECIDES, AND TRADES ON PAPER,
            NO SCRIPTS REQUIRED
          </motion.div>

          <div className="text-right">
            {headingWords.map((w, i) => (
              <div key={w.text} className="overflow-hidden">
                <motion.span
                  custom={i}
                  variants={clipReveal}
                  initial="hidden"
                  animate="show"
                  className="block uppercase"
                  style={{
                    fontSize: "clamp(2rem, 9vw, 9rem)",
                    lineHeight: 0.88,
                    fontWeight: 600,
                    color: w.color,
                  }}
                >
                  {w.text}
                </motion.span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── MOBILE MENU OVERLAY ── */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="fixed inset-0 z-50 flex flex-col bg-cream px-5 pb-8 pt-5 sm:px-8"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <LogoMark />
                <span className="text-sm font-semibold uppercase tracking-widest text-charcoal-green">
                  VIBERISK
                </span>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ background: "var(--charcoal-green)" }}
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>

            <div className="mt-16 flex flex-col gap-8">
              {NAV_LINKS.map((link, i) => (
                <motion.button
                  key={link}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE, delay: 0.1 + i * 0.1 }}
                  onClick={goToDashboard}
                  className="text-left text-3xl font-semibold uppercase tracking-widest text-charcoal-green"
                >
                  {link}
                </motion.button>
              ))}
            </div>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.3 }}
              onClick={goToDashboard}
              className="mt-auto inline-flex items-center gap-1 text-2xl font-semibold"
              style={{ color: "var(--vibe-cyan)" }}
            >
              LAUNCH AGENT
              <ArrowUpRight className="h-7 w-7" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
