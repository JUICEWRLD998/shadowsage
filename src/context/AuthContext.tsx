"use client";

/**
 * AuthContext — bridges the connected Sui wallet to a verified server session.
 *
 * The wallet being *connected* (dapp-kit) is not the same as being *signed in*
 * (our httpOnly session cookie). This context owns that gap:
 *
 *   connected wallet ──► request nonce ──► sign message ──► POST /api/auth/verify
 *                                                              └► session cookie set
 *
 * It exposes `{ address, status, signIn, signOut }`. `address` is the verified
 * session address (from the server), not just whatever wallet is connected — so
 * the gate and UI only ever trust a real, signature-backed identity.
 *
 * Client-only.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  useCurrentAccount,
  useDisconnectWallet,
  useSignPersonalMessage,
} from "@mysten/dapp-kit";

export type AuthStatus =
  | "loading" // checking existing session
  | "unauthenticated" // no wallet / not signed in
  | "signing" // handshake in progress
  | "authenticated" // verified session active
  | "error";

interface AuthContextValue {
  /** Verified session wallet address (lower-case), or null. */
  address: string | null;
  status: AuthStatus;
  error: string | null;
  /** Run the connect→sign→verify handshake for the connected wallet. */
  signIn: () => Promise<void>;
  /** Clear the session and disconnect the wallet. */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const account = useCurrentAccount();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  const { mutateAsync: disconnect } = useDisconnectWallet();

  const [address, setAddress] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  // Guards against re-running the handshake for an address already in flight.
  const signingFor = useRef<string | null>(null);

  // 1. On mount, ask the server who we are (existing cookie?).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        const json = (await res.json()) as { address: string | null };
        if (cancelled) return;
        if (json.address) {
          setAddress(json.address);
          setStatus("authenticated");
        } else {
          setStatus("unauthenticated");
        }
      } catch {
        if (!cancelled) setStatus("unauthenticated");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async () => {
    if (!account) {
      setError("Connect a wallet first.");
      return;
    }
    if (signingFor.current === account.address) return;
    signingFor.current = account.address;
    setError(null);
    setStatus("signing");

    try {
      // a. Get a fresh challenge.
      const nonceRes = await fetch("/api/auth/nonce", { cache: "no-store" });
      const { message } = (await nonceRes.json()) as { message: string };

      // b. Ask the wallet to sign it.
      const signed = await signPersonalMessage({
        message: new TextEncoder().encode(message),
      });

      // c. Verify server-side → sets the session cookie.
      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          address: account.address,
          bytes: signed.bytes,
          signature: signed.signature,
        }),
      });

      if (!verifyRes.ok) {
        const { error: errMsg } = (await verifyRes
          .json()
          .catch(() => ({ error: "Verification failed." }))) as { error?: string };
        throw new Error(errMsg ?? "Verification failed.");
      }

      const { address: verified } = (await verifyRes.json()) as { address: string };
      setAddress(verified);
      setStatus("authenticated");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed.");
      setStatus("error");
    } finally {
      signingFor.current = null;
    }
  }, [account, signPersonalMessage]);

  // 2. When a wallet connects and we're not yet authenticated, auto-run the
  //    handshake so "connect" flows straight into "sign in".
  useEffect(() => {
    if (
      account &&
      (status === "unauthenticated" || status === "error") &&
      signingFor.current === null &&
      // Don't re-prompt if the connected wallet already matches the session.
      account.address.toLowerCase() !== address
    ) {
      void signIn();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, status]);

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // best-effort — clear local state regardless
    }
    try {
      await disconnect();
    } catch {
      // wallet may already be disconnected
    }
    setAddress(null);
    setStatus("unauthenticated");
    setError(null);
  }, [disconnect]);

  return (
    <AuthContext.Provider value={{ address, status, error, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>.");
  return ctx;
}
