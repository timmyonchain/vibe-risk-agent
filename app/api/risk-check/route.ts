import { NextResponse } from "next/server";
import { checkAndCloseTrade } from "@/lib/risk/monitor";

export const dynamic = "force-dynamic";

export async function GET() {
  // Needs Supabase (read position + write close) — fail clearly if unset.
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      {
        error: "Supabase is not configured.",
        hint: "Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local and restart `npm run dev`.",
      },
      { status: 500 },
    );
  }

  try {
    const result = await checkAndCloseTrade();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Risk check failed", detail: message },
      { status: 502 },
    );
  }
}
