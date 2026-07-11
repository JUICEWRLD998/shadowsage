/**
 * /api/roast — the Shadow's victory lap.
 *
 *   POST (no body) → auto-pick the user's most painful settled miss from memory,
 *                    pin it on their top bias, and roast it.
 *
 *   → { roast: RoastPayload, target: { match, pick, actualScore } } | { roast: null, reason }
 *
 * Best-effort: needs MemWal configured, at least one wrong settled prediction,
 * and a working model. Any gap yields { roast: null, reason } rather than a 500.
 */

import { isMemWalConfigured } from "@/lib/memwal";
import { recallPredictions } from "@/lib/predictions";
import { getMatches, getCompletedMatches } from "@/lib/worldcup";
import { resolveAll } from "@/lib/scoring";
import { generateRoast, pickMostPainful } from "@/lib/roastEngine";
import { recallBiasProfiles } from "@/lib/biasDetector";
import { requireSession } from "@/lib/auth/session";

export const maxDuration = 30;

export async function POST() {
  const auth = await requireSession();
  if (auth instanceof Response) return auth;

  if (!isMemWalConfigured()) {
    return Response.json({ roast: null, reason: "Memory not configured." });
  }

  const [predictions, matches, biases] = await Promise.all([
    recallPredictions(undefined, 50, auth).catch(() => []),
    getMatches().catch(() => []),
    recallBiasProfiles(12, auth).catch(() => []),
  ]);

  const resolved = resolveAll(predictions, getCompletedMatches(matches, 200));
  const target = pickMostPainful(resolved);

  if (!target) {
    return Response.json({
      roast: null,
      reason: "No settled misses to roast yet — make some calls and let them play out.",
    });
  }

  const topBias = biases[0]?.type;
  const roast = await generateRoast({ resolved: target, bias: topBias });

  if (!roast) {
    return Response.json({ roast: null, reason: "Roast generation failed." });
  }

  return Response.json({
    roast,
    target: {
      match: target.match,
      pick: target.pick,
      predictedScore: target.predictedScore,
      actualScore: target.actualScore,
      confidence: target.confidence,
    },
  });
}
