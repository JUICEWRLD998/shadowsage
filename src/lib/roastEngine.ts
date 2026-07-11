/**
 * Roast engine — turns a busted prediction into the Shadow's victory lap.
 *
 * Given a resolved, WRONG prediction (and optionally the bias that drove it),
 * it generates a short roast in the Shadow's voice and scores how much it should
 * hurt. The "pain score" rewards confident misses: being sure and wrong is the
 * most roastable thing a predictor can do.
 *
 * Best-effort: returns null if generation fails so callers degrade gracefully.
 *
 * Server only.
 */

import { qvacGenerateText } from "./qvac";
import { buildRoastPrompt } from "@/prompts/roastGeneration";
import type { BiasType, RoastPayload } from "@/types";
import type { ResolvedPrediction } from "./scoring";
import { biasLabel } from "./biasDetector";

export interface RoastInput {
  resolved: ResolvedPrediction;
  /** The bias the Shadow pins the miss on, if known. */
  bias?: BiasType;
}

/**
 * Pain score, 0–100. A confident, wrong call is maximally painful; a hedged one
 * barely registers. (10 − accuracy)×confidence from the spec, where a miss has
 * accuracy 0, normalised to a 0–100 scale.
 */
export function painScore(confidence: number, correct: boolean): number {
  if (correct) return 0;
  const c = Math.min(10, Math.max(0, confidence));
  return Math.round((10 - 0) * c); // 0–100
}

/** Generate the Shadow's roast for one busted prediction. Null on failure. */
export async function generateRoast(input: RoastInput): Promise<RoastPayload | null> {
  const { resolved, bias } = input;
  if (resolved.verdict !== "wrong") return null;

  const label = bias ? biasLabel(bias) : "";

  try {
    const text = await qvacGenerateText({
      messages: [
        {
          role: "user",
          content: buildRoastPrompt({
            match: resolved.match,
            userPick: resolved.pick,
            predictedScore: resolved.predictedScore,
            confidence: resolved.confidence,
            reasoning: resolved.reasoning,
            actualScore: resolved.actualScore,
            biasLabel: label,
          }),
        },
      ],
      temperature: 0.9,
    });

    const roast = text.trim();
    if (!roast) return null;

    return {
      text: roast,
      painScore: painScore(resolved.confidence, false),
      userQuote: resolved.reasoning,
      biasExploited: bias ?? "recency_bias",
    } satisfies RoastPayload;
  } catch (error) {
    console.error("[roastEngine] generation failed:", error);
    return null;
  }
}

/** Pick the most roastable prediction from a set: a wrong call, most painful first. */
export function pickMostPainful(
  resolved: ResolvedPrediction[],
): ResolvedPrediction | null {
  const misses = resolved
    .filter((r) => r.verdict === "wrong")
    .sort((a, b) => b.confidence - a.confidence);
  return misses[0] ?? null;
}
