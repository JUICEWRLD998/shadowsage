/**
 * Stakes helper — utility functions for stake management.
 *
 * Handles stake retrieval, summary calculation, and resolution logic.
 */

import { recallMemories, rememberAsync } from "@/lib/memory";
import type { Stake, StakeSummary, Prediction, MatchResult } from "@/types";

/**
 * Get all stakes for a specific wallet address.
 */
export async function getStakesForWallet(
  walletAddress: string
): Promise<Stake[]> {
  const allStakes = await recallMemories<Stake>("stakes");
  return allStakes.filter((stake) => stake.walletAddress === walletAddress);
}

/**
 * Get a specific stake by ID.
 */
export async function getStakeById(stakeId: string): Promise<Stake | null> {
  const allStakes = await recallMemories<Stake>("stakes");
  return allStakes.find((stake) => stake.id === stakeId) || null;
}

/**
 * Get stakes for a specific prediction.
 */
export async function getStakesForPrediction(
  predictionId: string
): Promise<Stake[]> {
  const allStakes = await recallMemories<Stake>("stakes");
  return allStakes.filter((stake) => stake.predictionId === predictionId);
}

/**
 * Calculate stake summary for a wallet.
 */
export async function calculateStakeSummary(
  walletAddress: string
): Promise<StakeSummary> {
  const stakes = await getStakesForWallet(walletAddress);

  let totalStaked = 0;
  let totalWon = 0;
  let totalLost = 0;
  let wonCount = 0;
  let lostCount = 0;
  let pendingCount = 0;

  for (const stake of stakes) {
    const amount = parseFloat(stake.amount);

    // Count towards total staked if confirmed or signed
    if (stake.status === "confirmed" || stake.status === "signed") {
      totalStaked += amount;
    }

    // Count resolved stakes
    if (stake.status === "won") {
      totalWon += stake.payout ? parseFloat(stake.payout) : amount;
      wonCount++;
    } else if (stake.status === "lost") {
      totalLost += amount;
      lostCount++;
    } else if (
      stake.status === "pending" ||
      stake.status === "signed" ||
      stake.status === "confirmed"
    ) {
      pendingCount++;
    }
  }

  const resolvedCount = wonCount + lostCount;
  const winRate = resolvedCount > 0 ? (wonCount / resolvedCount) * 100 : 0;

  return {
    totalStaked: totalStaked.toFixed(2),
    totalWon: totalWon.toFixed(2),
    totalLost: totalLost.toFixed(2),
    pendingStakes: pendingCount,
    winRate: Math.round(winRate * 10) / 10, // Round to 1 decimal
  };
}

/**
 * Resolve a stake based on match result.
 * Updates stake status to "won" or "lost" and sets payout if won.
 */
export async function resolveStake(
  stakeId: string,
  prediction: Prediction,
  result: MatchResult
): Promise<Stake | null> {
  const stake = await getStakeById(stakeId);
  if (!stake) return null;

  // Already resolved
  if (stake.status === "won" || stake.status === "lost") {
    return stake;
  }

  // Determine outcome
  const won = result.userCorrect;
  const amount = parseFloat(stake.amount);

  // Simple 1:1 payout for demo (in real app, odds would determine payout)
  const payout = won ? (amount * 2).toFixed(2) : undefined;

  const updatedStake: Stake = {
    ...stake,
    status: won ? "won" : "lost",
    payout,
    resolvedAt: new Date().toISOString(),
  };

  // Save updated stake
  await rememberAsync("stakes", stakeId, updatedStake);

  return updatedStake;
}

/**
 * Resolve all stakes for a specific match when results are available.
 */
export async function resolveStakesForMatch(
  matchId: string,
  predictions: Prediction[]
): Promise<number> {
  const allStakes = await recallMemories<Stake>("stakes");
  const matchStakes = allStakes.filter((stake) => stake.matchId === matchId);

  let resolvedCount = 0;

  for (const stake of matchStakes) {
    // Find corresponding prediction
    const prediction = predictions.find((p) => p.id === stake.predictionId);
    if (!prediction || !prediction.result) continue;

    // Resolve the stake
    await resolveStake(stake.id, prediction, prediction.result);
    resolvedCount++;
  }

  return resolvedCount;
}

/**
 * Format stake amount for display.
 */
export function formatStakeAmount(amount: string, asset: string): string {
  const num = parseFloat(amount);
  return `${num.toFixed(2)} ${asset}`;
}

/**
 * Get stake status display label.
 */
export function getStakeStatusLabel(status: Stake["status"]): string {
  const labels: Record<Stake["status"], string> = {
    pending: "Pending",
    signed: "Signed",
    confirmed: "Confirmed",
    won: "Won",
    lost: "Lost",
    cancelled: "Cancelled",
  };
  return labels[status];
}

/**
 * Get stake status color for UI.
 */
export function getStakeStatusColor(status: Stake["status"]): string {
  const colors: Record<Stake["status"], string> = {
    pending: "var(--text-muted)",
    signed: "var(--you-400)",
    confirmed: "var(--you-300)",
    won: "oklch(0.7 0.16 145)", // Green
    lost: "var(--negative)",
    cancelled: "var(--text-faint)",
  };
  return colors[status];
}
