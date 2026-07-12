/**
 * POST /api/stakes — create a new stake commitment.
 * GET  /api/stakes — retrieve all stakes for the authenticated user.
 */

import { randomUUID } from "crypto";
import { requireSession } from "@/lib/auth/session";
import { saveStake, getStakesForWallet } from "@/lib/stakes";
import type { Stake } from "@/types";

interface CreateStakeBody {
  predictionId?: string;
  matchId?: string;
  amount?: string;
  asset?: "USDt" | "ETH";
  signature?: string;
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (session instanceof Response) return session;

  let body: CreateStakeBody;
  try {
    body = (await req.json()) as CreateStakeBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { predictionId, matchId, amount, asset, signature } = body;

  if (!predictionId || !matchId || !amount || !asset || !signature) {
    return Response.json(
      { error: "`predictionId`, `matchId`, `amount`, `asset`, and `signature` are required." },
      { status: 400 },
    );
  }

  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    return Response.json({ error: "`amount` must be a positive number." }, { status: 400 });
  }

  const stake: Stake = {
    id: randomUUID(),
    predictionId,
    matchId,
    walletAddress: session,
    amount,
    asset,
    status: "signed",
    signature,
    createdAt: new Date().toISOString(),
  };

  saveStake(stake);

  return Response.json({ stakeId: stake.id, stake }, { status: 201 });
}

export async function GET() {
  const session = await requireSession();
  if (session instanceof Response) return session;

  const stakes = getStakesForWallet(session)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return Response.json({ stakes });
}
