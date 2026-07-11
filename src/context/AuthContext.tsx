"use client";

/**
 * AuthContext — bridges the WDK wallet to a verified server session.
 *
 * The wallet being *connected* (WDK) is not the same as being *signed in*
 * (our httpOnly session cookie). This context owns that gap:
 *
 *   WDK wallet ──► request nonce ──► sign message ──► POST /api/auth/verify
 *                                                        └► session cookie set
 *
 * It exposes `{ address, status, signIn, signOut, connectWallet }`. `address`
 * is the verified session address (from the server), not just whatever wallet
 * is connected — so the gate and UI only ever trust a real, signature-backed
 * identity.
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
import { wdkWallet } from "@/lib/wdk";

export type AuthStatus =
  | "loading" // checking existing session
  | "unauthenticated" // no wallet / not signed in
  | "signing" // handshake in progress
  | "authenticated" // verified session active
  | "error";

interface AuthContextValue {
  /** Verified session wallet address (lower-case), or null. */
  address: string | null;
  /** Current wallet connection address (may differ from session address). */
  walletAddress: string | null;
  status: AuthStatus;
  error: string | null;
  /** Connect or create a WDK wallet. */
  connectWallet: () => Promise<void>;
  /** Run the sign→verify handshake for the connected wallet. */
  signIn: () => Promise<void>;
  /** Clear the session and disconnect the wallet. */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  // Guards against re-running the handshake for an address already in flight.
  const signingFor = useRef<string | null>(null);

  // 1. On mount, check for existing session AND existing WDK wallet.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Check session
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        const json = (await res.json()) as { address: string | null };
        if (cancelled) return;
        
        if (json.address) {
          setAddress(json.address);
          setStatus("authenticated");
        } else {
          setStatus("unauthenticated");
        }

        // Check for stored WDK wallet
        if (wdkWallet.hasStoredWallet()) {
          try {
            const { address: wAddress } = await wdkWallet.connect();
            if (!cancelled) {
              setWalletAddress(wAddress.toLowerCase());
            }
          } catch (e) {
            console.warn("[AuthContext] Failed to auto-connect WDK wallet:", e);
          }
        }
      } catch {
        if (!cancelled) setStatus("unauthenticated");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const connectWallet = useCallback(async () => {
    setError(null);
    try {
      let wAddress: string;
      
      if (wdkWallet.hasStoredWallet()) {
        // Connect to existing wallet
        const result = await wdkWallet.connect();
        wAddress = result.address;
      } else {
        // Create new wallet
        const result = await wdkWallet.createWallet();
        wAddress = result.address;
        
        // Show seed phrase to user (they MUST back this up)
        // In a real app, show this in a proper modal with confirmation
        console.warn(
          "[WDK] New wallet created! Back up your seed phrase:",
          result.seedPhrase
        );
        alert(
          `🔐 IMPORTANT: Back up your seed phrase!\n\n${result.seedPhrase}\n\nStore it safely. You'll need it to recover your wallet.`
        );
      }
      
      setWalletAddress(wAddress.toLowerCase());
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to connect wallet.";
      setError(msg);
      throw e;
    }
  }, []);

  const signIn = useCallback(async () => {
    if (!walletAddress) {
      setError("Connect a wallet first.");
      return;
    }
    if (signingFor.current === walletAddress) return;
    signingFor.current = walletAddress;
    setError(null);
    setStatus("signing");

    try {
      // a. Get a fresh challenge.
      const nonceRes = await fetch("/api/auth/nonce", { cache: "no-store" });
      const { message } = (await nonceRes.json()) as { message: string };

      // b. Ask the WDK wallet to sign it.
      const signature = await wdkWallet.signMessage(message);

      // c. Verify server-side → sets the session cookie.
      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          address: walletAddress,
          signature,
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
  }, [walletAddress]);

  // 2. When a wallet connects and we're not yet authenticated, auto-run the
  //    handshake so "connect" flows straight into "sign in".
  useEffect(() => {
    if (
      walletAddress &&
      (status === "unauthenticated" || status === "error") &&
      signingFor.current === null &&
      // Don't re-prompt if the connected wallet already matches the session.
      walletAddress !== address
    ) {
      void signIn();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress, status]);

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // best-effort — clear local state regardless
    }
    wdkWallet.disconnect();
    setAddress(null);
    setWalletAddress(null);
    setStatus("unauthenticated");
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ address, walletAddress, status, error, connectWallet, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>.");
  return ctx;
}
