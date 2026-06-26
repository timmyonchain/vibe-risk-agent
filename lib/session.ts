// ─────────────────────────────────────────────────────────────
// Server-side helper for reading the anonymous per-visitor session id.
//
// The "vibe_session" cookie is minted by proxy.ts (see that file). Route
// handlers call getSessionId() to scope all account/trade data to the
// current browser. The cookie is httpOnly, so it's only ever read here on
// the server, never by client-side JS.
// ─────────────────────────────────────────────────────────────

import { cookies } from "next/headers";

// Must match SESSION_COOKIE in proxy.ts.
export const SESSION_COOKIE = "vibe_session";

/** Read the current visitor's session id, or null if the cookie is absent. */
export async function getSessionId(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}
