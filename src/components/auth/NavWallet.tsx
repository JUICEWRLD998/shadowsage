"use client";

/**
 * NavWallet — the wallet control that lives in the Navbar's right cluster.
 *
 * It collapses the connect → sign → session handshake into one slot:
 *   - authenticated  → the WalletBadge (name + address + disconnect)
 *   - signing        → a "Signing…" indicator while the wallet prompt is open
 *   - otherwise      → "Connect Wallet" button, plus a "Sign to enter" nudge
 *                      if a wallet is connected but no session exists yet
 *
 * Connecting a WDK wallet auto-triggers the sign-in handshake (see AuthContext),
 * so in the common case the user only clicks once.
 *
 * Client-only.
 */

import { Loader2, Wallet } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { WalletBadge } from "./WalletBadge";
import styles from "./NavWallet.module.css";

export function NavWallet() {
  const { address, walletAddress, status, connectWallet, signIn } = useAuth();

  // Verified session → show the identity chip.
  if (status === "authenticated" && address) {
    return <WalletBadge />;
  }

  // Handshake in flight — signing message.
  if (status === "signing") {
    return (
      <span className={styles.signing}>
        <Loader2 className={styles.spinner} size={15} aria-hidden />
        <span className={styles.signingText}>Signing…</span>
      </span>
    );
  }

  // Wallet connected but no session (e.g. user dismissed the prompt) — let them
  // retry the signature without reconnecting.
  if (walletAddress) {
    return (
      <button className={styles.signBtn} onClick={() => void signIn()}>
        Sign to enter
      </button>
    );
  }

  // No wallet yet — show connect button. Connecting auto-runs sign-in.
  return (
    <button className={styles.connectBtn} onClick={() => void connectWallet()}>
      <Wallet size={16} aria-hidden />
      <span>Connect</span>
    </button>
  );
}
