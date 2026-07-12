/**
 * PATCH /api/stakes/[id] — update a stake (status, transactionId, payout).
 */

import { requireSession } from "@/lib/auth/session";
import { getStakeById, updateStake } from "@/lib/stakes";
import type { Stake } from "@/types";

interface UpdateStakeBody {
  transactionId?: string;
  status?: Stake["status"];
  payout?: string;
  resolvedAt?: string;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
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

  const existing = getStakeById(id);
  if (!existing) {
    return Response.json({ error: "Stake not found." }, { status: 404 });
  }

  if (existing.walletAddress.toLowerCase() !== session.toLowerCase()) {
    return Response.json({ error: "You can only update your own stakes." }, { status: 403 });
  }

  const patch: Partial<Stake> = { ...body };
  if (body.status === "confirmed" && !existing.confirmedAt) {
    patch.confirmedAt = new Date().toISOString();
  }

  const updated = updateStake(id, patch);
  return Response.json({ stake: updated });
}
