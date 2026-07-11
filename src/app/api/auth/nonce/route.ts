/**
 * GET /api/auth/nonce — issue a sign-in challenge.
 *
 * Mints a random nonce, stores it in a short-lived httpOnly cookie, and returns
 * the exact message the client should ask the wallet to sign.
 */

import {
  buildSignInMessage,
  generateNonce,
  setNonceCookie,
} from "@/lib/auth/nonce";

export async function GET() {
  const nonce = generateNonce();
  await setNonceCookie(nonce);
  return Response.json({ nonce, message: buildSignInMessage(nonce) });
}
