/**
 * /api/predictions — read and write the user's prediction history.
 *
 *   GET  ?query=<semantic query>&limit=<n>
 *        → { predictions: RecalledPrediction[], count }
 *
 *   POST { teamA, teamB, userPick, predictedScore?, confidence?, reasoning?, stage? }
 *        → { stored: boolean, prediction }
 *        Stores a structured prediction directly (used by UI surfaces that let
 *        the user log a pick explicitly, rather than via chat).
 *
 * Memory is best-effort: when MemWal isn't configured, GET returns an empty
 * list and POST reports stored:false instead of failing the request.
 */

import { z } from "zod";
import type { PickSide } from "@/types";
import { isMemWalConfigured } from "@/lib/memwal";
import {
  buildPrediction,
  recallPredictions,
  storePrediction,
} from "@/lib/predictions";
import { requireSession } from "@/lib/auth/session";

export const maxDuration = 30;

export async function GET(req: Request) {
  const auth = await requireSession();
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(req.url);
  const query =
    searchParams.get("query") ??
    "all of the user's match predictions and reasoning";
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 20, 1), 50);

  const predictions = await recallPredictions(query, limit, auth);
  return Response.json({
    predictions,
    count: predictions.length,
    memoryConfigured: isMemWalConfigured(),
  });
}

const postSchema = z.object({
  teamA: z.string().min(1),
  teamB: z.string().min(1),
  userPick: z.enum(["teamA", "teamB", "draw"]),
  predictedScore: z.string().default(""),
  confidence: z.number().min(0).max(10).default(0),
  reasoning: z.string().default(""),
  stage: z
    .enum([
      "group-matchday1",
      "group-matchday2",
      "group-matchday3",
      "round-of-32",
      "round-of-16",
      "quarter-final",
      "semi-final",
      "third-place",
      "final",
    ])
    .default("group-matchday1"),
  matchId: z.string().optional(),
});

export async function POST(req: Request) {
  const auth = await requireSession();
  if (auth instanceof Response) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid prediction.", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const prediction = buildPrediction(
    {
      teamA: parsed.data.teamA,
      teamB: parsed.data.teamB,
      userPick: parsed.data.userPick as PickSide,
      predictedScore: parsed.data.predictedScore,
      confidence: parsed.data.confidence,
      reasoning: parsed.data.reasoning,
      stage: parsed.data.stage,
    },
    { matchId: parsed.data.matchId },
  );

  const stored = await storePrediction(prediction, auth);
  return Response.json({ stored, prediction }, { status: stored ? 201 : 200 });
}
