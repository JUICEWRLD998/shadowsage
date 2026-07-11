"use client";

/**
 * useArena — client feed for the Prediction Arena.
 *
 * Pulls resolved predictions + accuracy summary + Shadow record from
 * /api/arena. Mirrors the other data hooks: AbortController-guarded load,
 * `{ data, loading, refresh }`.
 */

import { useCallback, useEffect, useState } from "react";

export type Verdict = "correct" | "wrong" | "pending";

export interface ResolvedPrediction {
  timestamp: string;
  match: string;
  teamA: string;
  teamB: string;
  pick: string;
  predictedScore: string;
  confidence: number;
  reasoning: string;
  verdict: Verdict;
  actualScore: string;
  exactScore: boolean;
}

export interface AccuracySummary {
  total: number;
  resolved: number;
  pending: number;
  correct: number;
  wrong: number;
  exact: number;
  accuracy: number;
}

export interface ShadowBlock {
  record: { wins: number; losses: number; draws: number };
  accuracy: number;
  tone: string;
  catchphrase: string;
  draws: number;
}

export interface ArenaData {
  resolved: ResolvedPrediction[];
  summary: AccuracySummary;
  shadow: ShadowBlock | null;
  configured: boolean;
}

const EMPTY: ArenaData = {
  resolved: [],
  summary: {
    total: 0,
    resolved: 0,
    pending: 0,
    correct: 0,
    wrong: 0,
    exact: 0,
    accuracy: 0,
  },
  shadow: null,
  configured: false,
};

export function useArena() {
  const [data, setData] = useState<ArenaData>(EMPTY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/arena", { signal });
      const json = (await res.json()) as Partial<ArenaData>;
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
