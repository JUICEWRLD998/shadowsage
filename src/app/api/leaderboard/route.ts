/**
 * /api/leaderboard — the cross-user rivalry board.
 *
 *   GET → { entries: LeaderboardEntry[], categories, youRank, configured }
 *
 * On each load the caller's row is recomputed from local memory (accuracy,
 * Shadow record, top bias) and written to a GLOBAL `leaderboard` namespace — one
 * row per wallet, latest-wins. We then recall every row and rank real connected
 * users against each other, padded with a deterministic field of seeded rivals
 * (see lib/leaderboard.ts) so the board always looks alive. Requires a session.
 */

import { isMemoryConfigured, recallMemories, rememberAsync } from "@/lib/memory";
import { recallPredictions } from "@/lib/predictions";
import { getMatches, getCompletedMatches } from "@/lib/worldcup";
import { resolveAll, summarize } from "@/lib/scoring";
import { getShadowSnapshot } from "@/lib/shadowEngine";
import { recallBiasProfiles } from "@/lib/biasDetector";
import {
  buildLeaderboard,
  formatLeaderboardRow,
  pickCategories,
  type UserStats,
} from "@/lib/leaderboard";
import { requireSession } from "@/lib/auth/session";
import type { BiasType } from "@/types";

export const maxDuration = 30;

export async function GET() {
  const auth = await requireSession();
  if (auth instanceof Response) return auth;

  const configured = isMemoryConfigured();

  // 1. Recompute the caller's own stats from their (per-user) memory.
  if (configured) {
    const [predictions, matches, shadow, biases] = await Promise.all([
      recallPredictions(undefined, 50, auth).catch(() => []),
      getMatches().catch(() => []),
      getShadowSnapshot(auth).catch(() => null),
      recallBiasProfiles(12, auth).catch(() => []),
    ]);

    if (predictions.length > 0) {
      const resolved = resolveAll(predictions, getCompletedMatches(matches, 200));
      const summary = summarize(resolved);

      const rec = shadow?.record ?? { wins: 0, losses: 0, draws: 0 };
      const shadowPlayed = rec.wins + rec.losses;
      const shadowAccuracy =
        shadowPlayed === 0 ? 0 : Math.round((rec.wins / shadowPlayed) * 100);

      const topBias: BiasType = biases[0]?.type ?? "recency_bias";

      const stats: UserStats = {
        userAccuracy: summary.accuracy,
        shadowAccuracy,
        totalPredictions: summary.total,
        // Every settled miss is a roast the Shadow gets to claim.
        roastCount: summary.wrong,
        topBias,
        // Defiance ≈ how often the user's own call was vindicated.
        defianceRate: summary.accuracy,
      };

      // 2. Publish the caller's row to the GLOBAL board namespace (best-effort).
      await rememberAsync(
        formatLeaderboardRow(auth, stats, new Date().toISOString()),
        "leaderboard",
      ).catch(() => false);
    }
  }

  // 3. Recall every published row and rank real users + seeded filler.
  const rows = configured
    ? await recallMemories(
        "predictor leaderboard rows: shadow accuracy, predictions, roasts",
        "leaderboard",
        100,
      ).catch(() => [] as string[])
    : [];

  const entries = buildLeaderboard(rows, auth);
  const categories = pickCategories(entries);
  const youRank = entries.find((e) => e.isYou)?.rank ?? null;

  return Response.json({ entries, categories, youRank, configured });
}
