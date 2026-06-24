import { NextResponse } from "next/server";
import { getAccount, getOpenPosition } from "@/lib/execution/paperTrade";

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

  try {
    const [account, openPosition] = await Promise.all([
      getAccount(),
      getOpenPosition(),
    ]);
    return NextResponse.json({
      balance: Number(account.balance),
      starting_balance: Number(account.starting_balance),
      updated_at: account.updated_at,
      openPosition, // null if none
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to load account", detail: message },
      { status: 502 },
    );
  }
}
