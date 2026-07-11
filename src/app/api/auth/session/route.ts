/**
 * GET /api/auth/session — who is the current request, if anyone.
 *
 * Returns the verified wallet address from the session cookie, or null. The
 * client uses this to know whether the sign-in handshake is still needed.
 */

import { getSessionAddress } from "@/lib/auth/session";

export async function GET() {
  const address = await getSessionAddress();
  return Response.json({ address });
}
