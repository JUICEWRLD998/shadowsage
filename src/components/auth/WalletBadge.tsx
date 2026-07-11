"use client";

/**
 * WalletBadge — the signed-in identity chip for the Navbar.
 *
 * Shows the verified wallet's anonymous display name + truncated address with a
 * disconnect action. Renders nothing until there's a verified session, so it
 * never competes with the AuthGate's connect panel.
 *
 * Client-only.
 */

import { LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { displayNameForAddress } from "@/lib/leaderboard";
import styles from "./WalletBadge.module.css";

function truncate(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletBadge() {
  const { address, status, signOut } = useAuth();

  if (status !== "authenticated" || !address) return null;

  return (
    <span className={styles.badge}>
      <span className={styles.dot} aria-hidden />
      <span className={styles.meta}>
        <span className={styles.name}>{displayNameForAddress(address)}</span>
        <span className={styles.addr}>{truncate(address)}</span>
      </span>
      <button
        className={styles.logout}
        onClick={() => void signOut()}
        aria-label="Disconnect wallet"
        title="Disconnect"
      >
        <LogOut size={14} aria-hidden />
      </button>
    </span>
  );
}
