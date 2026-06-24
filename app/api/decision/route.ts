import { NextResponse } from "next/server";
import { getPerception } from "@/lib/perception/market";
import { decideTrade } from "@/lib/decision/decide";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // 1. Parse and validate the request body.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON, e.g. { \"riskProfile\": \"...\" }" },
      { status: 400 },
    );
  }

  const riskProfile = (body as { riskProfile?: unknown })?.riskProfile;
  if (typeof riskProfile !== "string" || riskProfile.trim() === "") {
    return NextResponse.json(
      { error: "Missing or empty 'riskProfile'. Send { \"riskProfile\": \"moderate risk, swing trade BTC, exit at -5%\" }" },
      { status: 400 },
    );
  }

  // 2. Fail fast and clearly if the Groq key is missing (don't crash cryptically).
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      {
        error: "GROQ_API_KEY is not set.",
        hint: "Copy .env.local.example to .env.local, paste your Groq key, and restart `npm run dev`.",
      },
      { status: 500 },
    );
  }

  // 3. Perception first, then the LLM decision.
  try {
    const perception = await getPerception();
    const decision = await decideTrade(perception, riskProfile);
    return NextResponse.json({ perception, decision });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to produce a trade decision", detail: message },
      { status: 502 },
    );
  }
}
