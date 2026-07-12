"use client";

/**
 * StakePrompt — post-prediction action to back a call with USDt.
 *
 * Shows after a prediction is extracted, allowing users to commit USDt to
 * back their prediction. Supports two modes:
 *   1. On-chain transfer (preferred) — real USDt transaction
 *   2. Signed commitment (fallback) — cryptographic stake intent
 *
 * Client-only.
 */

import { useState } from "react";
import { Coins, Loader2, TrendingUp, AlertCircle } from "lucide-react";
import { wdkWallet } from "@/lib/wdk";
import { useAuth } from "@/context/AuthContext";
import type { Prediction } from "@/types";
import styles from "./StakePrompt.module.css";

// Fixed demo-safe amount presets (in USDt)
const STAKE_PRESETS = [1, 5, 10];

interface StakePromptProps {
  prediction: Prediction;
  onStakeCreated?: (stakeId: string) => void;
  onDismiss?: () => void;
}

export function StakePrompt({ prediction, onStakeCreated, onDismiss }: StakePromptProps) {
  const { address } = useAuth();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [isStaking, setIsStaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usdtBalance, setUsdtBalance] = useState<bigint | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Fetch USDt balance when component mounts
  useState(() => {
    if (address) {
      setBalanceLoading(true);
      wdkWallet
        .getUSDtBalance()
        .then(setUsdtBalance)
        .catch((err) => {
          console.warn("[StakePrompt] Failed to fetch USDt balance:", err);
          setUsdtBalance(null);
        })
        .finally(() => setBalanceLoading(false));
    }
  });

  const handleStake = async () => {
    if (!selectedAmount || !address) return;

    setIsStaking(true);
    setError(null);

    try {
      // Sign stake commitment (creates binding proof)
      const signature = await wdkWallet.signStakeCommitment(
        prediction.id,
        selectedAmount.toString(),
        "USDt"
      );

      // Create stake record via API
      const response = await fetch("/api/stakes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          predictionId: prediction.id,
          matchId: prediction.matchId,
          amount: selectedAmount.toString(),
          asset: "USDt",
          signature,
        }),
      });

      if (!response.ok) {
        const { error: errMsg } = await response.json().catch(() => ({}));
        throw new Error(errMsg || "Failed to create stake");
      }

      const { stakeId } = (await response.json()) as { stakeId: string };

      // Optional: Try on-chain transfer (if user has balance)
      // This is a "best effort" — if it fails, the signed commitment remains valid
      if (usdtBalance && usdtBalance > BigInt(selectedAmount * 1_000_000)) {
        try {
          // Convert to smallest unit (6 decimals for USDt)
          const amountInSmallestUnit = BigInt(selectedAmount * 1_000_000);
          
          // Treasury address (replace with actual treasury)
          const treasuryAddress = process.env.NEXT_PUBLIC_STAKE_TREASURY ||
            "0x0000000000000000000000000000000000000000";

          const txHash = await wdkWallet.transferUSDt(
            treasuryAddress,
            amountInSmallestUnit
          );

          // Update stake with transaction hash
          await fetch(`/api/stakes/${stakeId}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ transactionId: txHash, status: "confirmed" }),
          });
        } catch (txError) {
          console.warn("[StakePrompt] On-chain transfer failed, stake remains signed:", txError);
          // Stake still valid as signed commitment
        }
      }

      onStakeCreated?.(stakeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create stake");
    } finally {
      setIsStaking(false);
    }
  };

  const formatBalance = (wei: bigint): string => {
    // USDt typically has 6 decimals
    const usdt = Number(wei) / 1_000_000;
    return usdt.toFixed(2);
  };

  return (
    <div className={styles.prompt}>
      <div className={styles.header}>
        <Coins size={20} aria-hidden />
        <h3 className={styles.title}>Back this call with USDt</h3>
      </div>

      <p className={styles.description}>
        Confident in your prediction? Put USDt behind it. If you're right, you
        keep your stake. If you're wrong, you lose it to the treasury.
      </p>

      {/* Prediction summary */}
      <div className={styles.predictionCard}>
        <div className={styles.matchup}>
          <span className={styles.team}>
            {prediction.teamAFlag} {prediction.teamA}
          </span>
          <span className={styles.vs}>vs</span>
          <span className={styles.team}>
            {prediction.teamBFlag} {prediction.teamB}
          </span>
        </div>
        <div className={styles.pick}>
          Your pick: <strong>{prediction.predictedScore}</strong>
        </div>
        <div className={styles.confidence}>
          Confidence: {prediction.confidence}/10
        </div>
      </div>

      {/* Balance display */}
      {balanceLoading ? (
        <div className={styles.balanceLoading}>
          <Loader2 className={styles.spinner} size={14} />
          <span>Checking USDt balance...</span>
        </div>
      ) : usdtBalance !== null ? (
        <div className={styles.balance}>
          <TrendingUp size={14} aria-hidden />
          <span>Available: {formatBalance(usdtBalance)} USDt</span>
        </div>
      ) : (
        <div className={styles.balanceWarning}>
          <AlertCircle size={14} aria-hidden />
          <span>Unable to fetch USDt balance</span>
        </div>
      )}

      {/* Amount selection */}
      <div className={styles.amountSection}>
        <label className={styles.label}>Select stake amount:</label>
        <div className={styles.presets}>
          {STAKE_PRESETS.map((amount) => (
            <button
              key={amount}
              className={`${styles.preset} ${selectedAmount === amount ? styles.presetSelected : ""}`}
              onClick={() => setSelectedAmount(amount)}
              disabled={isStaking}
            >
              {amount} USDt
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className={styles.actions}>
        <button
          className={styles.stakeButton}
          onClick={handleStake}
          disabled={!selectedAmount || isStaking}
        >
          {isStaking ? (
            <>
              <Loader2 className={styles.spinner} size={16} />
              Signing stake...
            </>
          ) : (
            <>
              <Coins size={16} />
              Stake {selectedAmount || "—"} USDt
            </>
          )}
        </button>

        {onDismiss && (
          <button className={styles.dismissButton} onClick={onDismiss} disabled={isStaking}>
            Skip for now
          </button>
        )}
      </div>

      {error && (
        <div className={styles.error}>
          <AlertCircle size={14} aria-hidden />
          {error}
        </div>
      )}

      <p className={styles.disclaimer}>
        Stakes are binding commitments. Your wallet will sign a cryptographic
        proof. If on-chain transfer succeeds, it's confirmed. Otherwise, your
        signed commitment remains valid for resolution.
      </p>
    </div>
  );
}
