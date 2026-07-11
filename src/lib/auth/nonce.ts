/**
 * Sign-in nonce — the anti-replay challenge for wallet auth.
 *
 * Flow: /api/auth/nonce mints a random nonce and stashes it in a short-lived
 * httpOnly cookie. The client signs a message containing that nonce; /api/auth/
 * verify rebuilds the exact message, checks the signature, and only then trusts
 * the address. A signature can't be replayed because the nonce is single-use and
 * expires quickly.
 *
 * Server only.
 */

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

export const NONCE_COOKIE = "sp_nonce";

/** Nonces are throwaway — a few minutes is plenty for connect → sign. */
const NONCE_MAX_AGE = 60 * 5;

/** Generate a fresh random nonce string. */
export function generateNonce(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * The exact message the user signs. Kept in one place so /api/auth/nonce and
 * /api/auth/verify build byte-identical text.
 */
export function buildSignInMessage(nonce: string): string {
  return [
    "ShadowSage - sign in",
    "",
    "Sign this message to prove you control this wallet and unlock your Shadow.",
    "This is free and will not submit a transaction.",
    "",
    `Nonce: ${nonce}`,
  ].join("\n");
}

/** Stash the nonce in its httpOnly cookie. */
export async function setNonceCookie(nonce: string): Promise<void> {
  const store = await cookies();
  store.set(NONCE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: NONCE_MAX_AGE,
  });
}

/** Read the pending nonce, or null if none/expired. */
export async function getNonceCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(NONCE_COOKIE)?.value ?? null;
}

/** Consume (clear) the nonce — call right after a successful verify. */
export async function clearNonceCookie(): Promise<void> {
  const store = await cookies();
  store.delete(NONCE_COOKIE);
}
