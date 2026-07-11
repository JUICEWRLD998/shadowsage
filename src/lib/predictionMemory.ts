/**
 * Prediction ⇄ local-memory serialization.
 *
 * Memories are stored as compact text blocks plus local metadata, so each
 * prediction remains human- and model-readable. Keeping the read/write format in one module means the
 * shape can evolve without hunting through routes.
 */

import type { PickSide, Prediction } from "@/types";

/** Map an internal pick side to a readable label given the two teams. */
export function pickLabel(pick: PickSide, teamA: string, teamB: string): string {
  if (pick === "teamA") return teamA;
  if (pick === "teamB") return teamB;
  return "Draw";
}

/**
 * Serialize a prediction into the canonical memory block stored under the
 * `predictions` namespace. The leading `PREDICTION [iso]` line makes records
 * easy to spot and count when recalled.
 */
export function formatPredictionMemory(p: Prediction): string {
  const matchup = `${p.teamA} vs ${p.teamB}`;
  const pick = pickLabel(p.userPick, p.teamA, p.teamB);
  return [
    `PREDICTION [${p.timestamp}]`,
    `Match: ${matchup}`,
    `Stage: ${p.stage}`,
    `Pick: ${pick}${p.predictedScore ? ` (${p.predictedScore})` : ""}`,
    `Confidence: ${p.confidence}/10`,
    `Reasoning: "${p.reasoning}"`,
  ].join("\n");
}

/**
 * A lightweight view of a recalled prediction, parsed back from its memory
 * block. Best-effort: any field the regex can't find is left blank/0 rather
 * than throwing, because recalled text should never crash a request.
 */
export interface RecalledPrediction {
  timestamp: string;
  match: string;
  pick: string;
  predictedScore: string;
  confidence: number;
  reasoning: string;
  raw: string;
}

function field(block: string, label: string): string {
  const m = block.match(new RegExp(`^${label}:\\s*(.+)$`, "mi"));
  return m ? m[1].trim() : "";
}

/** Parse one recalled memory block back into a structured view. */
export function parsePredictionMemory(raw: string): RecalledPrediction {
  const tsMatch = raw.match(/PREDICTION \[([^\]]+)\]/i);
  const pickRaw = field(raw, "Pick");
  const scoreMatch = pickRaw.match(/\(([^)]+)\)/);
  const confMatch = field(raw, "Confidence").match(/(\d+)/);

  return {
    timestamp: tsMatch?.[1] ?? "",
    match: field(raw, "Match"),
    pick: pickRaw.replace(/\s*\([^)]*\)\s*/, "").trim(),
    predictedScore: scoreMatch?.[1] ?? "",
    confidence: confMatch ? Number(confMatch[1]) : 0,
    reasoning: field(raw, "Reasoning").replace(/^"|"$/g, ""),
    raw,
  };
}

/** Count how many recalled memory strings are actual prediction records. */
export function countPredictions(memories: string[]): number {
  return memories.filter((m) => /^PREDICTION \[/im.test(m)).length;
}

/**
 * Condense recalled prediction memories into a compact history block for the
 * system prompt — newest first, capped, and stripped of noise so the model
 * gets signal without burning context.
 */
export function summarizePredictionsForPrompt(
  memories: string[],
  limit = 8,
): string {
  const records = memories
    .filter((m) => /^PREDICTION \[/im.test(m))
    .map(parsePredictionMemory)
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
    .slice(0, limit);

  if (records.length === 0) return "";

  return records
    .map((r) => {
      const score = r.predictedScore ? ` ${r.predictedScore}` : "";
      const why = r.reasoning ? ` — "${r.reasoning}"` : "";
      return `- ${r.match}: ${r.pick}${score} (conf ${r.confidence}/10)${why}`;
    })
    .join("\n");
}
