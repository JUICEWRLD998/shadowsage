/**
 * POST /api/stakes — create a new stake commitment.
 *
 * Body: { predictionId, matchId, amount, asset, signature }
 *
 * Creates a stake record in local memory, scoped to the authenticated wallet.
 * The signature proves the user's commitment to stake the specified amount.
 */

import { randomUUID } from "crypto";
import { requireSession } from "@/lib/auth/session";
import { rememberAsync, recallMemories } from "@/lib/memory";
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
      {
        error:
          "`predictionId`, `matchId`, `amount`, `asset`, and `signature` are required.",
      },
      { status: 400 }
    );
  }

  // Validate amount is a valid decimal string
  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    return Response.json(
      { error: "`amount` must be a positive number." },
      { status: 400 }
    );
  }

  // Create stake record
  const stake: Stake = {
    id: randomUUID(),
    predictionId,
    matchId,
    walletAddress: session.address,
    amount,
    asset,
    status: "signed", // Starts as signed commitment
    signature,
    createdAt: new Date().toISOString(),
  };

  // Store in memory under stakes namespace
  await rememberAsync("stakes", stake.id, stake);

  return Response.json({ stakeId: stake.id, stake }, { status: 201 });
}

/**
 * GET /api/stakes — retrieve all stakes for the authenticated user.
 */
export async function GET() {
  const session = await requireSession();
  if (session instanceof Response) return session;

  // Retrieve all stakes from memory
  const allStakes = await recallMemories<Stake>("stakes");

  // Filter to only this user's stakes
  const userStakes = allStakes.filter(
    (stake) => stake.walletAddress === session.address
  );

  // Sort by creation date (newest first)
  userStakes.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return Response.json({ stakes: userStakes });
}
