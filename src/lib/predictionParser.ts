/**
 * Prediction extraction — turn a free-form chat exchange into a structured
 * prediction, or decide there isn't one yet.
 *
 * The friendly agent never asks the user to fill a form; predictions emerge
 * conversationally ("I'll say Brazil 2-1, their midfield is just too much").
 * After each assistant turn we run this extractor over the recent transcript.
 * It uses a constrained `generateObject` call so the model must return our
 * exact schema — no brittle string parsing — and reports its own confidence
 * that a *complete* prediction was actually made, which gates whether we store.
 *
 * Server only.
 */

import { generateObject } from "ai";
import { z } from "zod";
import { analysisModel } from "./gemini";
import type { MatchStage, PickSide } from "@/types";

/** A prediction the model successfully lifted out of the conversation. */
export interface ParsedPrediction {
  teamA: string;
  teamB: string;
  userPick: PickSide;
  predictedScore: string;
  confidence: number;
  reasoning: string;
  stage: MatchStage;
}

const STAGES: [MatchStage, ...MatchStage[]] = [
  "group-matchday1",
  "group-matchday2",
  "group-matchday3",
  "round-of-32",
  "round-of-16",
  "quarter-final",
  "semi-final",
  "third-place",
  "final",
];

const extractionSchema = z.object({
  hasPrediction: z
    .boolean()
    .describe(
      "True ONLY if the user has committed to a definite pick for a specific match (a winner or a draw). Idle football chat, questions, or the agent's own takes do not count.",
    ),
  teamA: z.string().describe("First team named in the matchup (home/left side). Empty if no prediction."),
  teamB: z.string().describe("Second team named in the matchup (away/right side). Empty if no prediction."),
  userPick: z
    .enum(["teamA", "teamB", "draw", "none"])
    .describe("Who the USER picked, relative to teamA/teamB. 'none' if unclear."),
  predictedScore: z
    .string()
    .describe("Scoreline the user gave as 'A-B' (e.g. '2-1'), or empty if they didn't give one."),
  confidence: z
    .number()
    .min(0)
    .max(10)
    .describe("The user's stated confidence 1-10. Use 0 if they never gave one."),
  reasoning: z
    .string()
    .describe("The user's own reasoning for the pick, summarised in their spirit. Empty if none given."),
  stage: z
    .enum(STAGES)
    .describe("Tournament stage of the match. Default to 'group-matchday1' if not stated."),
});

const SYSTEM = `You extract structured football predictions from a chat transcript.
You are precise and conservative: only mark hasPrediction=true when the USER (not the assistant) has clearly committed to a specific match outcome. Capture their reasoning faithfully without inventing detail. If multiple predictions appear, extract the most recent complete one.`;

/** Minimum transcript length worth sending to the model. */
const MIN_CHARS = 12;

/**
 * Extract the most recent complete prediction from a transcript, or null.
 *
 * @param transcript  Recent conversation, e.g. "User: ...\nCompanion: ...".
 * @returns the parsed prediction, or null if none was made / extraction failed.
 */
export async function extractPrediction(
  transcript: string,
): Promise<ParsedPrediction | null> {
  if (!transcript || transcript.trim().length < MIN_CHARS) return null;

  try {
    const { object } = await generateObject({
      model: analysisModel,
      schema: extractionSchema,
      system: SYSTEM,
      prompt: `Transcript:\n${transcript}\n\nExtract the prediction.`,
      temperature: 0,
    });

    // Gate: need a real, attributable pick for a named matchup.
    if (!object.hasPrediction) return null;
    if (object.userPick === "none") return null;
    if (!object.teamA.trim() || !object.teamB.trim()) return null;

    return {
      teamA: object.teamA.trim(),
      teamB: object.teamB.trim(),
      userPick: object.userPick as PickSide,
      predictedScore: object.predictedScore.trim(),
      confidence: Math.round(object.confidence),
      reasoning: object.reasoning.trim(),
      stage: object.stage,
    };
  } catch (error) {
    console.error("[predictionParser] extraction failed:", error);
    return null;
  }
}
