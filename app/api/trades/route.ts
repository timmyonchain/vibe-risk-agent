import { NextResponse } from "next/server";
import { getRecentTrades } from "@/lib/execution/paperTrade";
import { getSessionId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      {
        error: "Supabase is not configured.",
        hint: "Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local and restart `npm run dev`.",
      },
      { status: 500 },
    );
  }

  const sessionId = await getSessionId();
  if (!sessionId) {
    return NextResponse.json(
      { error: "No session cookie found. Enable cookies and reload." },
      { status: 400 },
    );
  }

  try {
    const trades = await getRecentTrades(sessionId, 20);
    return NextResponse.json({ trades });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to load trades", detail: message },
      { status: 502 },
    );
  }
}
