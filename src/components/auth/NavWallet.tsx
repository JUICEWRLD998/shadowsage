"use client";

/**
 * NavWallet — the wallet control that lives in the Navbar's right cluster.
 *
 * It collapses the connect → sign → session handshake into one slot:
 *   - authenticated  → the WalletBadge (name + address + disconnect)
 *   - signing        → a "Signing…" indicator while the wallet prompt is open
 *   - otherwise      → dapp-kit's ConnectButton, plus a "Sign to enter" nudge
 *                      if a wallet is connected but no session exists yet
 *
 * Connecting a wallet auto-triggers the sign-in handshake (see AuthContext), so
 * in the common case the user only clicks once.
 *
 * Client-only.
 */

import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { WalletBadge } from "./WalletBadge";
import styles from "./NavWallet.module.css";

export function NavWallet() {
  const { address, status, signIn } = useAuth();
  const account = useCurrentAccount();

  // Verified session → show the identity chip.
  if (status === "authenticated" && address) {
    return <WalletBadge />;
  }

  // Handshake in flight — wallet prompt is open.
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
  if (account) {
    return (
      <button className={styles.signBtn} onClick={() => void signIn()}>
        Sign to enter
      </button>
    );
  }

  // No wallet yet — dapp-kit's connect modal. Connecting auto-runs sign-in.
  return (
    <span className={styles.connect}>
      <ConnectButton connectText="Connect Wallet" />
    </span>
  );
}
