"use client";

import { motion, type Variants } from "framer-motion";
import { Eye, Brain, Zap, ShieldCheck, type LucideIcon } from "lucide-react";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const stepVariant: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE, delay: i * 0.1 },
  }),
};

interface Step {
  num: string;
  Icon: LucideIcon;
  title: string;
  desc: string;
}

const STEPS: Step[] = [
  {
    num: "01",
    Icon: Eye,
    title: "PERCEIVE",
    desc: "Pulls live BTC price, RSI, moving averages, and funding rate straight from Bitget's public market data, refreshed continuously.",
  },
  {
    num: "02",
    Icon: Brain,
    title: "DECIDE",
    desc: "Your plain-English risk profile and the live market data go to Groq's llama-3.3-70b model, which returns a structured decision: buy, sell, or hold, with sizing and reasoning.",
  },
  {
    num: "03",
    Icon: Zap,
    title: "ACT",
    desc: "If the agent decides to trade, it opens a simulated paper position and logs it permanently, entry price, size, timestamp, all of it.",
  },
  {
    num: "04",
    Icon: ShieldCheck,
    title: "PROTECT",
    desc: "The agent checks its own open position against your stop-loss and take-profit levels, and closes itself automatically the moment either is hit. No babysitting.",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="w-full px-5 py-20 sm:px-8 md:px-12 md:py-28"
      style={{ background: "#EFE6D6" }}
    >
      <h2
        className="uppercase text-charcoal-green"
        style={{
          fontSize: "clamp(2rem, 6vw, 4.5rem)",
          fontWeight: 600,
          lineHeight: 0.95,
        }}
      >
        How It Works
      </h2>

      <div className="mt-12 grid grid-cols-1 gap-12 sm:grid-cols-2 md:mt-16 md:grid-cols-4 md:gap-8">
        {STEPS.map((step, i) => (
          <motion.div
            key={step.num}
            custom={i}
            variants={stepVariant}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
          >
            {/* Large faint outlined number */}
            <div
              className="leading-none text-charcoal-green"
              style={{
                fontSize: "clamp(3.5rem, 7vw, 6rem)",
                fontWeight: 200,
                opacity: 0.16,
              }}
            >
              {step.num}
            </div>

            {/* Icon */}
            <step.Icon
              className="mt-2"
              size={32}
              strokeWidth={1.75}
              style={{ color: "var(--vibe-cyan)" }}
            />

            {/* Title */}
            <h3 className="mt-4 text-lg font-semibold uppercase tracking-widest text-charcoal-green">
              {step.title}
            </h3>

            {/* Description */}
            <p className="mt-3 text-sm leading-relaxed text-charcoal-green/70">
              {step.desc}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
