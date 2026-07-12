"use client";

/**
 * WalletBadge — the signed-in identity chip for the Navbar.
 *
 * Shows the verified wallet's anonymous display name + truncated address with
 * optional balance display and a disconnect action. Renders nothing until
 * there's a verified session, so it never competes with the AuthGate's connect
 * panel.
 *
 * Client-only.
 */

import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { displayNameForAddress } from "@/lib/leaderboard";
import { wdkWallet } from "@/lib/wdk";
import styles from "./WalletBadge.module.css";

function truncate(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function formatBalance(wei: bigint): string {
  // Convert wei to ETH and format to 4 decimal places
  const eth = Number(wei) / 1e18;
  if (eth < 0.0001) return "0 ETH";
  return `${eth.toFixed(4)} ETH`;
}

export function WalletBadge() {
  const { address, walletAddress, status, signOut } = useAuth();
  const [balance, setBalance] = useState<bigint | null>(null);

  // Fetch wallet balance on mount and every 30 seconds
  useEffect(() => {
    if (status !== "authenticated" || !walletAddress) return;

    let cancelled = false;
    const fetchBalance = async () => {
      try {
        const bal = await wdkWallet.getBalance();
        if (!cancelled) setBalance(bal);
      } catch (error) {
        console.warn("[WalletBadge] Failed to fetch balance:", error);
      }
    };

    void fetchBalance();
    const interval = setInterval(() => void fetchBalance(), 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [status, walletAddress]);

  if (status !== "authenticated" || !address) return null;

  return (
    <span className={styles.badge}>
      <span className={styles.dot} aria-hidden />
      <span className={styles.meta}>
        <span className={styles.name}>{displayNameForAddress(address)}</span>
        <span className={styles.addr}>{truncate(address)}</span>
        {balance !== null && (
          <span className={styles.balance}>{formatBalance(balance)}</span>
        )}
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
