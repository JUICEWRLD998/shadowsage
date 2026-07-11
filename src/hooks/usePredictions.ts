"use client";

/**
 * useRecentPredictions — client hook for the "your recent calls" rail.
 *
 * Reads the user's stored predictions back from wallet-scoped memory via
 * /api/predictions. Returns newest-first records already shaped for display.
 * `refresh()` lets callers re-pull after a new prediction is likely stored.
 */

import { useCallback, useEffect, useState } from "react";

/** Display shape returned by GET /api/predictions (RecalledPrediction). */
export interface RecentPrediction {
  timestamp: string;
  match: string;
  pick: string;
  predictedScore: string;
  confidence: number;
  reasoning: string;
  raw: string;
}

export function useRecentPredictions(limit = 4) {
  const [predictions, setPredictions] = useState<RecentPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const res = await fetch(`/api/predictions?limit=${limit}`, { signal });
        const data = await res.json();
        const list: RecentPrediction[] = Array.isArray(data.predictions)
          ? data.predictions
          : [];
        setPredictions(list.slice(0, limit));
      } catch {
        // Aborted or failed — leave whatever we have, stop the spinner.
      } finally {
        setLoading(false);
      }
    },
    [limit],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    void load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  const refresh = useCallback(() => {
    void load();
  }, [load]);

  return { predictions, loading, refresh };
}
