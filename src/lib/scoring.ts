/**
 * Scoring — resolve stored predictions against real World Cup results.
 *
 * Predictions live in Walrus memory as text (see predictionMemory.ts); the
 * actual outcomes come from the WorldCup26.ir client (worldcup.ts). This module
 * is the bridge: it matches each recalled prediction to a *completed* fixture by
 * team names, decides whether the user's pick was right, and rolls the whole set
 * up into an accuracy summary the Arena renders.
 *
 * Everything is best-effort and pure: unmatched or still-scheduled predictions
 * are reported as "pending" rather than dropped, and nothing throws.
 *
 * Server only.
 */

import type { PickSide, WorldCupMatch } from "@/types";
import type { RecalledPrediction } from "./predictionMemory";

/**
 * Normalize a team name for tolerant matching. Strips diacritics, case, and
 * punctuation, then sorts the remaining words so different word orderings of
 * the same name match — e.g. "DR Congo" and "Congo DR" (both → "congo dr"),
 * which differ between fixture providers. Only neutral filler words are
 * dropped; distinguishing tokens like "republic"/"dr" are kept so distinct
 * nations (Congo vs Congo DR, Czech Republic) never collide.
 */
function norm(name: string): string {
  const STOP = new Set(["of", "the", "and"]);
  const words = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w));
  return words.sort().join(" ");
}

/** Split a recalled "Team A vs Team B" matchup into its two sides. */
function splitMatchup(matchup: string): [string, string] | null {
  const parts = matchup.split(/\s+vs\.?\s+/i);
  if (parts.length !== 2) return null;
  const a = parts[0].trim();
  const b = parts[1].trim();
  if (!a || !b) return null;
  return [a, b];
}

/** Flip "2-1" → "1-2" when the prediction's team order is reversed vs the fixture. */
function flipScore(score: string): string {
  const m = score.match(/^(\d+)\s*-\s*(\d+)$/);
  if (!m) return score;
  return `${m[2]}-${m[1]}`;
}

export type Verdict = "correct" | "wrong" | "pending";

export interface ResolvedPrediction {
  timestamp: string;
  match: string;
  teamA: string;
  teamB: string;
  pick: string; // team name or "Draw"
  predictedScore: string;
  confidence: number;
  reasoning: string;
  verdict: Verdict;
  /** Final scoreline, oriented to the prediction's team order. Empty if pending. */
  actualScore: string;
  /** True only when verdict is "correct" AND the exact scoreline was nailed. */
  exactScore: boolean;
}

/** Which side won, expressed as the winning team's name (or "Draw"). */
function winnerName(match: WorldCupMatch): string {
  if (match.winner === "teamA") return match.teamA;
  if (match.winner === "teamB") return match.teamB;
  return "Draw";
}

/**
 * Find the completed fixture a prediction refers to. Matches on the unordered
 * pair of team names so "Brazil vs Morocco" and "Morocco vs Brazil" both hit.
 */
function findCompleted(
  pred: RecalledPrediction,
  completed: WorldCupMatch[],
): WorldCupMatch | null {
  const pair = splitMatchup(pred.match);
  if (!pair) return null;
  const [pa, pb] = [norm(pair[0]), norm(pair[1])];

  return (
    completed.find((m) => {
      const [ma, mb] = [norm(m.teamA), norm(m.teamB)];
      return (pa === ma && pb === mb) || (pa === mb && pb === ma);
    }) ?? null
  );
}

/** Resolve a single prediction against the set of completed matches. */
export function resolvePrediction(
  pred: RecalledPrediction,
  completed: WorldCupMatch[],
): ResolvedPrediction {
  const pair = splitMatchup(pred.match);
  const teamA = pair?.[0] ?? pred.match;
  const teamB = pair?.[1] ?? "";

  const base: ResolvedPrediction = {
    timestamp: pred.timestamp,
    match: pred.match,
    teamA,
    teamB,
    pick: pred.pick,
    predictedScore: pred.predictedScore,
    confidence: pred.confidence,
    reasoning: pred.reasoning,
    verdict: "pending",
    actualScore: "",
    exactScore: false,
  };

  const match = findCompleted(pred, completed);
  if (!match || !match.score) return base;

  // Orient the fixture's scoreline to the prediction's team order.
  const sameOrder = norm(teamA) === norm(match.teamA);
  const actualScore = sameOrder ? match.score : flipScore(match.score);

  const pickIsRight = norm(pred.pick) === norm(winnerName(match));
  const exactScore =
    pickIsRight &&
    pred.predictedScore.trim() !== "" &&
    pred.predictedScore.replace(/\s/g, "") === actualScore.replace(/\s/g, "");

  return {
    ...base,
    verdict: pickIsRight ? "correct" : "wrong",
    actualScore,
    exactScore,
  };
}

export interface AccuracySummary {
  total: number; // predictions we have
  resolved: number; // matched to a finished fixture
  pending: number; // not yet playable / unmatched
  correct: number;
  wrong: number;
  exact: number;
  /** Win rate over *resolved* predictions, 0–100. 0 when none resolved. */
  accuracy: number;
}

/** Roll a set of resolved predictions into a headline accuracy summary. */
export function summarize(resolved: ResolvedPrediction[]): AccuracySummary {
  const correct = resolved.filter((r) => r.verdict === "correct").length;
  const wrong = resolved.filter((r) => r.verdict === "wrong").length;
  const exact = resolved.filter((r) => r.exactScore).length;
  const played = correct + wrong;

  return {
    total: resolved.length,
    resolved: played,
    pending: resolved.filter((r) => r.verdict === "pending").length,
    correct,
    wrong,
    exact,
    accuracy: played === 0 ? 0 : Math.round((correct / played) * 100),
  };
}

/** Convenience: resolve a whole list, newest first. */
export function resolveAll(
  predictions: RecalledPrediction[],
  completed: WorldCupMatch[],
): ResolvedPrediction[] {
  return predictions
    .map((p) => resolvePrediction(p, completed))
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}

/** Map a recalled pick string back to a PickSide given the matchup order. */
export function pickSideOf(resolved: ResolvedPrediction): PickSide {
  if (norm(resolved.pick) === "draw") return "draw";
  if (norm(resolved.pick) === norm(resolved.teamA)) return "teamA";
  return "teamB";
}
