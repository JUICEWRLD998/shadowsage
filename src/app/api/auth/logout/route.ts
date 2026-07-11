/**
 * POST /api/auth/logout — end the session.
 *
 * Clears the session cookie. The client also disconnects the wallet so the next
 * visit starts the connect → sign handshake fresh.
 */

import { clearSessionCookie } from "@/lib/auth/session";

export async function POST() {
  await clearSessionCookie();
  return Response.json({ ok: true });
}
