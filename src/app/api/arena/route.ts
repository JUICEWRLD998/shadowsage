/**
 * /api/arena — the Prediction Arena's data feed.
 *
 *   GET → { resolved: ResolvedPrediction[], summary: AccuracySummary,
 *           shadow: { record, accuracy } | null, configured }
 *
 * Pulls the user's stored predictions, resolves each against real completed
 * World Cup fixtures, and pairs the result with the Shadow's win record. Memory
 * is best-effort: with MemWal unconfigured this returns an empty, zeroed board
 * instead of failing, so the Arena always renders.
 */

import { isMemWalConfigured } from "@/lib/memwal";
import { recallPredictions } from "@/lib/predictions";
import { getMatches, getCompletedMatches } from "@/lib/worldcup";
import { resolveAll, summarize } from "@/lib/scoring";
import { getShadowSnapshot } from "@/lib/shadowEngine";
import { requireSession } from "@/lib/auth/session";

export const maxDuration = 30;

export async function GET() {
  const auth = await requireSession();
  if (auth instanceof Response) return auth;

  const [predictions, matches, shadow] = await Promise.all([
    recallPredictions(undefined, 50, auth).catch(() => []),
    getMatches().catch(() => []),
    getShadowSnapshot(auth).catch(() => null),
  ]);

  const completed = getCompletedMatches(matches, 200);
  const resolved = resolveAll(predictions, completed);
  const summary = summarize(resolved);

  const shadowBlock = shadow
    ? (() => {
        const { wins, losses, draws } = shadow.record;
        const played = wins + losses;
        return {
          record: shadow.record,
          accuracy: played === 0 ? 0 : Math.round((wins / played) * 100),
          tone: shadow.personality.tone,
          catchphrase: shadow.personality.catchphrase,
          draws,
        };
      })()
    : null;

  return Response.json({
    resolved,
    summary,
    shadow: shadowBlock,
    configured: isMemWalConfigured(),
  });
}
