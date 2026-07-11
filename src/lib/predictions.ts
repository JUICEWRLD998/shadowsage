/**
 * Prediction service — the bridge between extracted predictions, the Walrus
 * `predictions` namespace, and the rest of the app.
 *
 * Both the chat flow (auto-capture after a turn) and the /api/predictions route
 * (explicit CRUD) go through here so storage format and recall logic live in
 * exactly one place.
 *
 * Server only.
 */

import { randomUUID } from "node:crypto";
import type { Prediction } from "@/types";
import type { ParsedPrediction } from "./predictionParser";
import { countryFlag } from "./flags";
import {
  formatPredictionMemory,
  parsePredictionMemory,
  type RecalledPrediction,
} from "./predictionMemory";
import { recallMemories, rememberAsync, isMemWalConfigured, scopeNs } from "./memwal";

/** Promote a loosely-extracted prediction into a full, persistable record. */
export function buildPrediction(
  parsed: ParsedPrediction,
  opts: { matchId?: string; timestamp?: string } = {},
): Prediction {
  return {
    id: randomUUID(),
    matchId: opts.matchId ?? "",
    teamA: parsed.teamA,
    teamB: parsed.teamB,
    teamAFlag: countryFlag(parsed.teamA),
    teamBFlag: countryFlag(parsed.teamB),
    stage: parsed.stage,
    userPick: parsed.userPick,
    predictedScore: parsed.predictedScore,
    confidence: parsed.confidence,
    reasoning: parsed.reasoning,
    timestamp: opts.timestamp ?? new Date().toISOString(),
  };
}

/**
 * Persist a prediction to Walrus Memory (fire-and-forget — the relayer finishes
 * embedding/encrypting in the background). Returns false when memory isn't
 * configured or the relayer rejects the job, so callers can react if needed.
 */
export async function storePrediction(
  prediction: Prediction,
  userId?: string | null,
): Promise<boolean> {
  if (!isMemWalConfigured()) return false;
  return rememberAsync(
    formatPredictionMemory(prediction),
    scopeNs("predictions", userId),
  );
}

/**
 * Recall stored predictions as structured views, newest first. `query` steers
 * the semantic search; the default pulls broadly across the user's history.
 * `userId` scopes recall to a single wallet's memory.
 */
export async function recallPredictions(
  query = "all of the user's match predictions and reasoning",
  limit = 20,
  userId?: string | null,
): Promise<RecalledPrediction[]> {
  const memories = await recallMemories(query, scopeNs("predictions", userId), limit);
  return memories
    .filter((m) => /^PREDICTION \[/im.test(m))
    .map(parsePredictionMemory)
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}
