/**
 * GET /api/matches — World Cup fixtures for the client (sidebar, arena).
 *
 * Query params:
 *   ?filter=upcoming | completed | all   (default: upcoming)
 *   ?limit=<n>                           (default: 6, all defaults to 200)
 *   ?format=json | prompt                (default: json)
 *
 * Always returns 200 with a (possibly empty) array — the data source is
 * best-effort and the UI degrades gracefully on an empty list.
 */

import {
  getCompletedMatches,
  getMatchFeed,
  getUpcomingMatches,
  formatMatchesForPrompt,
} from "@/lib/worldcup";
import type { WorldCupMatch } from "@/types";

export const revalidate = 300;

type MatchFilter = "upcoming" | "completed" | "all";

function readFilter(value: string | null): MatchFilter {
  return value === "completed" || value === "all" ? value : "upcoming";
}

function readLimit(value: string | null, filter: MatchFilter): number {
  const fallback = filter === "all" ? 200 : 6;
  const parsed = Number(value);
  const requested = Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  return Math.min(Math.max(Math.round(requested), 1), 200);
}

function selectMatches(
  all: WorldCupMatch[],
  filter: MatchFilter,
  limit: number,
): WorldCupMatch[] {
  if (filter === "all") return all.slice(0, limit);
  if (filter === "completed") return getCompletedMatches(all, limit);
  return getUpcomingMatches(all, limit);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filter = readFilter(searchParams.get("filter"));
  const format = searchParams.get("format") === "prompt" ? "prompt" : "json";
  const limit = readLimit(searchParams.get("limit"), filter);

  const feed = await getMatchFeed();
  const matches = selectMatches(feed.matches, filter, limit);

  const prompt =
    format === "prompt"
      ? formatMatchesForPrompt(matches, { source: feed.source })
      : undefined;

  return Response.json(
    {
      matches,
      count: matches.length,
      filter,
      source: feed.source,
      configured: feed.configured,
      competition: feed.competition,
      season: feed.season,
      updatedAt: feed.updatedAt,
      reason: feed.reason,
      ...(prompt !== undefined ? { prompt } : {}),
    },
    { headers: { "cache-control": "public, max-age=60, s-maxage=300" } },
  );
}
