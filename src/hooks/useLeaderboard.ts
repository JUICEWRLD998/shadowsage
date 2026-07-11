"use client";

/**
 * useLeaderboard — client feed for the Shadow Leaderboard.
 *
 * Pulls the ranked field + category champions from /api/leaderboard. Same shape
 * as the other data hooks: AbortController-guarded load, `{ data, loading,
 * refresh }`.
 */

import { useCallback, useEffect, useState } from "react";
import type { LeaderboardEntry } from "@/types";

export interface LeaderboardCategories {
  sharpestShadow: LeaderboardEntry;
  mostRoasted: LeaderboardEntry;
  bestDefiance: LeaderboardEntry;
}

export interface LeaderboardData {
  entries: LeaderboardEntry[];
  categories: LeaderboardCategories | null;
  youRank: number | null;
  configured: boolean;
}

const EMPTY: LeaderboardData = {
  entries: [],
  categories: null,
  youRank: null,
  configured: false,
};

export function useLeaderboard() {
  const [data, setData] = useState<LeaderboardData>(EMPTY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/leaderboard", { signal });
      const json = (await res.json()) as Partial<LeaderboardData>;
      setData({ ...EMPTY, ...json });
    } catch {
      // Aborted or failed — keep whatever we have, stop the spinner.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    void load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  const refresh = useCallback(() => {
    void load();
  }, [load]);

  return { data, loading, refresh };
}
