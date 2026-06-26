// ─────────────────────────────────────────────────────────────
// Phase 9 — anonymous per-visitor sessions (NO login).
//
// NOTE: In Next.js 16 the "middleware" file convention was renamed to
// "proxy" (the function is `proxy`, not `middleware`). This is the same
// concept — code that runs on the server before a request reaches a route.
//
// On every /api/* request we ensure a "vibe_session" cookie exists. If the
// visitor doesn't have one yet, we mint a random UUID and set it as an
// httpOnly cookie (not readable by client-side JS) that lasts 1 year. All
// account/trade data is then scoped to this id, so each browser gets its
// own isolated paper-trading balance and history.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Must match SESSION_COOKIE in lib/session.ts. Kept as a literal here so the
// proxy stays self-contained (the proxy runs separately from app code).
const SESSION_COOKIE = "vibe_session";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function proxy(request: NextRequest) {
  const existing = request.cookies.get(SESSION_COOKIE)?.value;

  // Already has a session — nothing to do.
  if (existing) {
    return NextResponse.next();
  }

  // New visitor: mint an id and make it visible to the route handler on THIS
  // same request (request.cookies.set), then also tell the browser to store
  // it for next time (response.cookies.set).
  const sessionId = crypto.randomUUID();
  request.cookies.set(SESSION_COOKIE, sessionId);

  const response = NextResponse.next({ request });
  response.cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });
  return response;
}

export const config = {
  // Apply only to the API routes that read/write per-session data.
  matcher: "/api/:path*",
};
