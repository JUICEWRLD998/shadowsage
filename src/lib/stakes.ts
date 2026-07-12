/**
 * Stakes helper — in-memory store + utility functions for stake management.
 *
 * Intentionally does NOT import memory.ts (which uses node:fs/promises and
 * cannot be bundled for the browser). Stakes are kept in a server-side
 * in-memory Map that survives the process lifetime (dev/demo scope).
 *
 * Safe to import from both client components and API routes because the Map
 * itself only lives in the server process — client code only ever calls the
 * /api/stakes HTTP endpoints, never this module directly.
 */

import type { Stake, StakeSummary } from "@/types";

// ── In-memory store ───────────────────────────────────────────────────────────

const stakeStore = new Map<string, Stake>();

export function saveStake(stake: Stake): void {
  stakeStore.set(stake.id, stake);
}

export function getStakeById(stakeId: string): Stake | null {
  return stakeStore.get(stakeId) ?? null;
}

export function getAllStakes(): Stake[] {
  return Array.from(stakeStore.values());
}

export function getStakesForWallet(walletAddress: string): Stake[] {
  return getAllStakes().filter(
    (s) => s.walletAddress.toLowerCase() === walletAddress.toLowerCase(),
  );
}

export function getStakesForPrediction(predictionId: string): Stake[] {
  return getAllStakes().filter((s) => s.predictionId === predictionId);
}

export function updateStake(stakeId: string, patch: Partial<Stake>): Stake | null {
  const existing = stakeStore.get(stakeId);
  if (!existing) return null;
  const updated = { ...existing, ...patch };
  stakeStore.set(stakeId, updated);
  return updated;
}

// ── Summary ───────────────────────────────────────────────────────────────────

export function calculateStakeSummary(walletAddress: string): StakeSummary {
  const stakes = getStakesForWallet(walletAddress);

  let totalStaked = 0;
  let totalWon = 0;
  let totalLost = 0;
  let wonCount = 0;
  let lostCount = 0;
  let pendingCount = 0;

  for (const stake of stakes) {
    const amount = parseFloat(stake.amount);
    if (stake.status === "confirmed" || stake.status === "signed") totalStaked += amount;
    if (stake.status === "won") {
      totalWon += stake.payout ? parseFloat(stake.payout) : amount;
      wonCount++;
    } else if (stake.status === "lost") {
      totalLost += amount;
      lostCount++;
    } else if (["pending", "signed", "confirmed"].includes(stake.status)) {
      pendingCount++;
    }
  }

  const resolved = wonCount + lostCount;
  const winRate = resolved > 0 ? Math.round(((wonCount / resolved) * 100) * 10) / 10 : 0;

  return {
    totalStaked: totalStaked.toFixed(2),
    totalWon: totalWon.toFixed(2),
    totalLost: totalLost.toFixed(2),
    pendingStakes: pendingCount,
    winRate,
  };
}

// ── Resolution ────────────────────────────────────────────────────────────────

export function resolveStake(
  stakeId: string,
  won: boolean,
): Stake | null {
  const stake = stakeStore.get(stakeId);
  if (!stake) return null;
  if (stake.status === "won" || stake.status === "lost") return stake;

  const amount = parseFloat(stake.amount);
  const payout = won ? (amount * 2).toFixed(2) : undefined;

  return updateStake(stakeId, {
    status: won ? "won" : "lost",
    payout,
    resolvedAt: new Date().toISOString(),
  });
}

// ── Display helpers ───────────────────────────────────────────────────────────

export function formatStakeAmount(amount: string, asset: string): string {
  return `${parseFloat(amount).toFixed(2)} ${asset}`;
}

export function getStakeStatusLabel(status: Stake["status"]): string {
  const labels: Record<Stake["status"], string> = {
    pending:   "Pending",
    signed:    "Signed",
    confirmed: "Confirmed",
    won:       "Won",
    lost:      "Lost",
    cancelled: "Cancelled",
  };
  return labels[status];
}

export function getStakeStatusColor(status: Stake["status"]): string {
  const colors: Record<Stake["status"], string> = {
    pending:   "var(--text-muted)",
    signed:    "var(--you-400)",
    confirmed: "var(--you-300)",
    won:       "oklch(0.7 0.16 145)",
    lost:      "var(--negative)",
    cancelled: "var(--text-faint)",
  };
  return colors[status];
}
