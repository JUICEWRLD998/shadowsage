/**
 * GET /api/matches — World Cup fixtures for the client (sidebar, arena).
 *
 * Query params:
 *   ?filter=upcoming | completed | all   (default: upcoming)
 *   ?limit=<n>                           (default: 6, max: 48)
 *
 * Always returns 200 with a (possibly empty) array — the data source is
 * best-effort and the UI degrades gracefully on an empty list.
 */

import {
  getCompletedMatches,
  getMatches,
  getUpcomingMatches,
} from "@/lib/worldcup";

export const revalidate = 300;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") ?? "upcoming";
  const limit = Math.min(
    Math.max(Number(searchParams.get("limit")) || 6, 1),
    48,
  );

  const all = await getMatches();

  const matches =
    filter === "all"
      ? all.slice(0, limit)
      : filter === "completed"
        ? getCompletedMatches(all, limit)
        : getUpcomingMatches(all, limit);

  return Response.json(
    { matches, count: matches.length },
    { headers: { "cache-control": "public, max-age=60, s-maxage=300" } },
  );
}
