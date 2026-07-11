"use client";

/**
 * useUpcomingMatches — client hook for the live fixture rail.
 *
 * Hits /api/matches (which proxies + normalises WorldCup26.ir) and exposes a
 * simple { matches, loading, error } shape. Never throws into render; on
 * failure it resolves to an empty list so the sidebar degrades cleanly.
 */

import { useEffect, useState } from "react";
import type { WorldCupMatch } from "@/types";

export function useUpcomingMatches(limit = 5) {
  const [matches, setMatches] = useState<WorldCupMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetch(`/api/matches?filter=upcoming&limit=${limit}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        setMatches(Array.isArray(data.matches) ? data.matches : []);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError("Couldn't load fixtures.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [limit]);

  return { matches, loading, error };
}
