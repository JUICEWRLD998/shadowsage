/**
 * Session — the server's source of truth for "who is this request".
 *
 * Identity is a wallet address, proven once via a signed nonce (see
 * /api/auth/verify) and then carried in a tamper-proof, httpOnly cookie. The
 * cookie value is `<base64url(payload)>.<base64url(hmac)>`, where the HMAC is
 * SHA-256 over the payload keyed by SESSION_SECRET — so a client can read the
 * cookie but never forge a different address into it.
 *
 * No database: the wallet address IS the account. Every memory namespace is
 * scoped by it (see lib/memory `scopeNs`), which is what isolates one user's
 * predictions / biases / Shadow from everyone else's.
 *
 * Server only.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "sp_session";

/** 7 days — long enough to feel persistent, short enough to rotate. */
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

interface SessionPayload {
  address: string;
  iat: number; // issued-at, epoch seconds
}

/**
 * Secret used to sign session cookies. Falls back to a clearly-marked dev
 * constant so local runs work out of the box; production MUST set SESSION_SECRET
 * (the fallback is logged loudly once).
 */
let warnedAboutSecret = false;
function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length > 0) return secret;
  if (!warnedAboutSecret) {
    console.warn(
      "[auth] SESSION_SECRET is not set — using an insecure dev fallback. Set SESSION_SECRET in production.",
    );
    warnedAboutSecret = true;
  }
  return "shadow-pundit-dev-secret-do-not-use-in-prod";
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function hmac(payloadB64: string): string {
  return createHmac("sha256", sessionSecret()).update(payloadB64).digest("base64url");
}

/** Mint a signed session token for a verified wallet address. */
export function signSession(address: string): string {
  const payload: SessionPayload = {
    address: address.toLowerCase(),
    iat: Math.floor(Date.now() / 1000),
  };
  const payloadB64 = b64url(JSON.stringify(payload));
  return `${payloadB64}.${hmac(payloadB64)}`;
}

/** Verify a session token; returns the wallet address, or null if invalid. */
export function verifySession(token: string | undefined): string | null {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot < 0) return null;

  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = hmac(payloadB64);
  // Constant-time compare; lengths must match first or timingSafeEqual throws.
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (!payload.address) return null;
    if (Date.now() / 1000 - payload.iat > SESSION_MAX_AGE) return null;
    return payload.address;
  } catch {
    return null;
  }
}

/** Read + verify the current request's session address. Null when signed out. */
export async function getSessionAddress(): Promise<string | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

/** Persist a session cookie for `address` (called from /api/auth/verify). */
export async function setSessionCookie(address: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, signSession(address), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

/** Clear the session cookie (logout). */
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * Route guard: returns the session address, or a 401 Response to return early.
 * Usage:
 *   const auth = await requireSession();
 *   if (auth instanceof Response) return auth;
 *   // auth is the address string here
 */
export async function requireSession(): Promise<string | Response> {
  const address = await getSessionAddress();
  if (!address) {
    return Response.json(
      { error: "Not authenticated. Connect your wallet." },
      { status: 401 },
    );
  }
  return address;
}
