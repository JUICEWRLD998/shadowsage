/**
 * PATCH /api/stakes/[id] — update a stake record.
 *
 * Used to update stake status (e.g., add transaction hash when confirmed).
 */

import { requireSession } from "@/lib/auth/session";
import { rememberAsync, recallMemories } from "@/lib/memory";
import type { Stake } from "@/types";

interface UpdateStakeBody {
  transactionId?: string;
  status?: Stake["status"];
  payout?: string;
  resolvedAt?: string;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (session instanceof Response) return session;

  const { id } = await params;

  let body: UpdateStakeBody;
  try {
    body = (await req.json()) as UpdateStakeBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Retrieve existing stake
  const stakes = await recallMemories<Stake>("stakes");
  const existingStake = stakes.find((s) => s.id === id);

  if (!existingStake) {
    return Response.json({ error: "Stake not found." }, { status: 404 });
  }

  // Verify ownership
  if (existingStake.walletAddress !== session.address) {
    return Response.json(
      { error: "You can only update your own stakes." },
      { status: 403 }
    );
  }

  // Update stake
  const updatedStake: Stake = {
    ...existingStake,
    ...body,
    confirmedAt:
      body.status === "confirmed" && !existingStake.confirmedAt
        ? new Date().toISOString()
        : existingStake.confirmedAt,
  };

  // Store updated stake
  await rememberAsync("stakes", id, updatedStake);

  return Response.json({ stake: updatedStake });
}
