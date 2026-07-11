"use client";

/**
 * AuthGate — the wallet connection wall.
 *
 * Wraps the app's protected surfaces. The landing page (/) stays public so
 * first-time visitors can read the pitch before connecting. Everywhere else,
 * an unauthenticated visitor sees the connect/sign panel instead of the page.
 *
 * "Authenticated" means a verified server session (see AuthContext) — not merely
 * a connected wallet — so the gate can't be bypassed by faking a connection.
 *
 * Client-only.
 */

import { usePathname } from "next/navigation";
import { Ghost, Loader2, ShieldAlert, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import styles from "./AuthGate.module.css";

/** Routes anyone can see without signing in. */
const PUBLIC_PATHS = ["/"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname);
}

export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { address, walletAddress, status, error, connectWallet, signIn } = useAuth();

  // Landing page is always open; verified sessions pass through everywhere.
  if (isPublic(pathname) || (status === "authenticated" && address)) {
    return <>{children}</>;
  }

  // Still resolving an existing session — avoid flashing the gate.
  if (status === "loading") {
    return (
      <div className={styles.wrap}>
        <Loader2 className={styles.spinner} size={28} aria-hidden />
        <p className={styles.muted}>Checking your session…</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <span className={styles.badge}>
          <Ghost size={16} aria-hidden /> ShadowSage
        </span>

        <h1 className={styles.title}>Connect your Tether-compatible wallet</h1>
        <p className={styles.lede}>
          Your predictions, bias profile, and USDt stake intents are scoped to
          this wallet. ShadowSage uses WDK self-custodial wallets — your keys
          never leave your device.
        </p>

        <div className={styles.actions}>
          {!walletAddress && (
            <button
              className={styles.signBtn}
              onClick={() => void connectWallet()}
              disabled={status === "signing"}
            >
              <Wallet size={16} aria-hidden />
              Create or Restore Wallet
            </button>
          )}

          {walletAddress && status !== "signing" && (
            <button className={styles.signBtn} onClick={() => void signIn()}>
              Sign to enter
            </button>
          )}

          {status === "signing" && (
            <span className={styles.signing}>
              <Loader2 className={styles.spinner} size={16} aria-hidden />
              Signing message…
            </span>
          )}
        </div>

        {status === "error" && error && (
          <p className={styles.error}>
            <ShieldAlert size={15} aria-hidden /> {error}
          </p>
        )}

        {walletAddress && (
          <p className={styles.muted}>
            Connected: {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
          </p>
        )}

        <p className={styles.fine}>
          Signing is free, proves you own the wallet, and never submits a
          transaction.{" "}
          <span className={styles.poweredBy}>
            Powered by QVAC local AI + WDK self-custody
          </span>
        </p>
      </div>
    </div>
  );
}
