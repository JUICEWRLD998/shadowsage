/**
 * POST /api/auth/verify — prove wallet ownership, open a session.
 *
 * Body: { address, signature } where `signature` is a hex-encoded Ethereum
 * personal_sign signature (EIP-191). We rebuild the message from the pending
 * nonce cookie, cryptographically verify the signature, recover the signer
 * address, and confirm it matches the claimed `address`.
 *
 * The address is NEVER trusted from the client alone — only after the signature
 * checks out. This is the real security boundary of the app.
 */

import { verifyMessage } from "ethers";
import {
  buildSignInMessage,
  clearNonceCookie,
  getNonceCookie,
} from "@/lib/auth/nonce";
import { setSessionCookie } from "@/lib/auth/session";

interface VerifyBody {
  address?: string;
  /** Hex-encoded signature from wallet (EIP-191 personal_sign). */
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

  // Rebuild the exact message we expect was signed.
  const expectedMessage = buildSignInMessage(nonce);

  try {
    // Recover the signer address from the signature using ethers.js
    // verifyMessage handles EIP-191 prefixing internally
    const recoveredAddress = verifyMessage(expectedMessage, signature);

    // Compare recovered address to claimed address (case-insensitive)
    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      console.error(
        `[/api/auth/verify] Address mismatch: claimed=${address}, recovered=${recoveredAddress}`,
      );
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
