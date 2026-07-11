/**
 * /api/bias — the silent bias layer's control surface.
 *
 *   GET  → { notes, configured }
 *          The condensed bias notes recalled from memory (for a future profile
 *          view). Never exposed to the chat user directly.
 *
 *   POST → { detected: BiasProfile[], stored: number, analysed: number }
 *          Re-run detection over the user's current prediction history and
 *          persist any confident findings. Safe to call after each prediction.
 *
 * Bias analysis only runs once enough predictions exist; below that threshold
 * POST returns an empty result with a reason rather than calling the model.
 */

import { isMemWalConfigured } from "@/lib/memwal";
import { recallPredictions } from "@/lib/predictions";
import { summarizePredictionsForPrompt } from "@/lib/predictionMemory";
import {
  detectBiases,
  recallBiasNotes,
  recallBiasProfiles,
  storeBiasProfiles,
  MIN_PREDICTIONS_FOR_BIAS,
} from "@/lib/biasDetector";
import { requireSession } from "@/lib/auth/session";

export const maxDuration = 30;

export async function GET() {
  const auth = await requireSession();
  if (auth instanceof Response) return auth;

  const [notes, profiles] = await Promise.all([
    recallBiasNotes(10, auth),
    recallBiasProfiles(12, auth),
  ]);
  return Response.json({ notes, profiles, configured: isMemWalConfigured() });
}

export async function POST() {
  const auth = await requireSession();
  if (auth instanceof Response) return auth;

  const predictions = await recallPredictions(undefined, 30, auth);

  if (predictions.length < MIN_PREDICTIONS_FOR_BIAS) {
    return Response.json({
      detected: [],
      stored: 0,
      analysed: predictions.length,
      reason: `Need at least ${MIN_PREDICTIONS_FOR_BIAS} predictions before analysing.`,
    });
  }

  const history = summarizePredictionsForPrompt(
    predictions.map((p) => p.raw),
    30,
  );
  const detected = await detectBiases(history);
  const stored = await storeBiasProfiles(detected, auth);

  return Response.json({ detected, stored, analysed: predictions.length });
}
