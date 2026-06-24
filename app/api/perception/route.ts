import { NextResponse } from "next/server";
import { getPerception } from "@/lib/perception/market";

// Always run fresh on each request — market data must never be cached.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const perception = await getPerception();
    return NextResponse.json(perception);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch market perception", detail: message },
      { status: 502 },
    );
  }
}
