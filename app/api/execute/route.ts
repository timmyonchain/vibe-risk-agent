import { NextResponse } from "next/server";
import { getPerception } from "@/lib/perception/market";
import { decideTrade } from "@/lib/decision/decide";
import { executeTrade } from "@/lib/execution/paperTrade";
import { getSessionId } from "@/lib/session";

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

  // 2. Fail fast with clear messages if required config is missing.
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      {
        error: "GROQ_API_KEY is not set.",
        hint: "Add it to .env.local (see .env.local.example) and restart `npm run dev`.",
      },
      { status: 500 },
    );
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      {
        error: "Supabase is not configured.",
        hint: "Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local and restart `npm run dev`.",
      },
      { status: 500 },
    );
  }

  // 3. Identify the visitor's session (set by proxy.ts).
  const sessionId = await getSessionId();
  if (!sessionId) {
    return NextResponse.json(
      { error: "No session cookie found. Enable cookies and reload." },
      { status: 400 },
    );
  }

  // 4. Perception -> decision -> paper execution.
  try {
    const perception = await getPerception();
    const decision = await decideTrade(perception, riskProfile);
    const trade = await executeTrade(decision, perception, sessionId);
    return NextResponse.json({ perception, decision, trade });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to execute paper trade", detail: message },
      { status: 502 },
    );
  }
}
