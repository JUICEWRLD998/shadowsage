"use client";

/**
 * useUpcomingMatches — client hook for the live fixture rail.
 *
 * Hits /api/matches (which proxies + normalises football-data.org) and exposes
 * a simple { matches, loading, error } shape. Never throws into render; on
 * failure it resolves to an empty list so the sidebar degrades cleanly.
 */

import { useEffect, useState } from "react";
import type { MatchDataSource, WorldCupMatch } from "@/types";

interface MatchesResponse {
  matches?: WorldCupMatch[];
  source?: MatchDataSource;
  configured?: boolean;
}

export function useUpcomingMatches(limit = 5) {
  const [matches, setMatches] = useState<WorldCupMatch[]>([]);
  const [source, setSource] = useState<MatchDataSource | null>(null);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetch(`/api/matches?filter=upcoming&limit=${limit}`)
      .then((r) => r.json())
      .then((data: MatchesResponse) => {
        if (!active) return;
        setMatches(Array.isArray(data.matches) ? data.matches : []);
        setSource(data.source ?? null);
        setConfigured(Boolean(data.configured));
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError("Couldn't load fixtures.");
        setMatches([]);
        setSource(null);
        setConfigured(false);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [limit]);

  return { matches, source, configured, loading, error };
}
