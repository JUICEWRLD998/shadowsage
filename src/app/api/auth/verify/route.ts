/**
 * POST /api/auth/verify — prove wallet ownership, open a session.
 *
 * Body: { address, bytes, signature } where `bytes`/`signature` come from the
 * wallet's signPersonalMessage. We rebuild the message from the pending nonce
 * cookie, cryptographically verify the signature, confirm the recovered public
 * key actually owns `address`, then set the session cookie.
 *
 * The address is NEVER trusted from the client alone — only after the signature
 * checks out. This is the real security boundary of the app.
 */

import { verifyPersonalMessageSignature } from "@mysten/sui/verify";
import {
  buildSignInMessage,
  clearNonceCookie,
  getNonceCookie,
} from "@/lib/auth/nonce";
import { setSessionCookie } from "@/lib/auth/session";

interface VerifyBody {
  address?: string;
  /** Base64 message bytes returned by the wallet (must match our nonce message). */
  bytes?: string;
  /** Base64 signature returned by the wallet. */
  signature?: string;
}

export async function POST(req: Request) {
  let body: VerifyBody;
  try {
    body = (await req.json()) as VerifyBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { address, signature } = body;
  if (!address || !signature) {
    return Response.json(
      { error: "`address` and `signature` are required." },
      { status: 400 },
    );
  }

  const nonce = await getNonceCookie();
  if (!nonce) {
    return Response.json(
      { error: "No pending sign-in challenge. Request a nonce first." },
      { status: 400 },
    );
  }

  // Rebuild the exact message we expect was signed (don't trust client `bytes`).
  const expectedMessage = buildSignInMessage(nonce);
  const messageBytes = new TextEncoder().encode(expectedMessage);

  try {
    const publicKey = await verifyPersonalMessageSignature(
      messageBytes,
      signature,
      { address },
    );

    // verifyPersonalMessageSignature already checks the sig against `address`,
    // but assert the recovered key maps to the claimed address as defence in depth.
    if (publicKey.toSuiAddress() !== address) {
      return Response.json(
        { error: "Signature does not match the provided address." },
        { status: 401 },
      );
    }
  } catch (error) {
    console.error("[/api/auth/verify] signature verification failed:", error);
    return Response.json(
      { error: "Signature verification failed." },
      { status: 401 },
    );
  }

  // Single-use nonce — burn it so the signature can't be replayed.
  await clearNonceCookie();
  await setSessionCookie(address);

  return Response.json({ address: address.toLowerCase() });
}
