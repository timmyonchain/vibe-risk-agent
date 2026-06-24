// ─────────────────────────────────────────────────────────────
// Decision engine: given the market perception + the user's plain-English
// risk profile, ask Groq's LLM for a disciplined, structured trade decision.
// ─────────────────────────────────────────────────────────────

import Groq from "groq-sdk";
import type { Perception } from "@/lib/perception/market";

const MODEL = "llama-3.3-70b-versatile";

export interface TradeDecision {
  action: "buy" | "sell" | "hold";
  confidence: number; // 0–100
  positionSizePercent: number; // % of paper balance to allocate, 0–100
  stopLossPercent: number; // e.g. 5 => exit at -5%
  takeProfitPercent: number; // e.g. 10 => exit at +10%
  reasoning: string; // 2–3 plain-English sentences
}

const SYSTEM_PROMPT = `You are a disciplined but decisive trading agent.
You are given current market data for a symbol and the user's stated risk profile.

Weigh the three signals: trend (SMA20 vs SMA50), RSI, and funding sentiment. If at least two of the three signals point the same direction, take that position (buy if bullish-leaning, sell if bearish-leaning), sized according to the user's stated risk profile. Only return "hold" if the signals are genuinely split with no majority direction, or if the user's risk profile explicitly asks for extreme caution. A deeply oversold RSI (below 30) combined with a bearish trend is a classic reversal setup, lean toward buy in that case unless the risk profile says otherwise.

Set stop-loss / take-profit levels consistent with the user's risk profile (e.g. a "moderate" profile should not use aggressive position sizes or wide stops).

Respond with STRICT JSON ONLY — no markdown, no code fences, no commentary before or after.
The JSON must match this exact shape and key names:
{
  "action": "buy" | "sell" | "hold",
  "confidence": number,            // 0-100
  "positionSizePercent": number,   // 0-100, percent of paper balance to allocate
  "stopLossPercent": number,       // positive number, e.g. 5 means exit at -5%
  "takeProfitPercent": number,     // positive number, e.g. 10 means exit at +10%
  "reasoning": "string"            // 2-3 sentences, plain English
}`;

function buildUserPrompt(perception: Perception, riskProfile: string): string {
  return `User risk profile (plain English): "${riskProfile}"

Current market data (JSON):
${JSON.stringify(perception, null, 2)}

Return your trade decision as strict JSON in the required shape.`;
}

/**
 * Strip accidental markdown fences and surrounding prose, then JSON.parse.
 * Throws if the cleaned text is not valid JSON.
 */
function parseDecision(raw: string): TradeDecision {
  let text = raw.trim();

  // Remove ```json ... ``` or ``` ... ``` fences if the model added them.
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }

  // If there is stray text around the object, grab the outermost {...}.
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    text = text.slice(first, last + 1);
  }

  return JSON.parse(text) as TradeDecision;
}

export async function decideTrade(
  perception: Perception,
  riskProfile: string,
): Promise<TradeDecision> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is not set. Add it to .env.local (see .env.local.example) and restart the dev server.",
    );
  }

  const groq = new Groq({ apiKey });
  const userPrompt = buildUserPrompt(perception, riskProfile);

  // Attempt 1: normal request.
  const first = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });
  const firstText = first.choices[0]?.message?.content ?? "";

  try {
    return parseDecision(firstText);
  } catch {
    // Attempt 2: retry once with a stricter reminder to emit pure JSON.
    const second = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
        { role: "assistant", content: firstText },
        {
          role: "user",
          content:
            "That was not valid JSON. Respond again with ONLY the JSON object in the exact required shape. No markdown fences, no extra text, nothing before or after the JSON.",
        },
      ],
    });
    const secondText = second.choices[0]?.message?.content ?? "";

    try {
      return parseDecision(secondText);
    } catch {
      throw new Error(
        `Groq did not return valid JSON after a retry. Last response: ${secondText.slice(0, 300)}`,
      );
    }
  }
}
