"use client";

/**
 * useBiasProfile — client feed for the Profile / Bias-DNA surface.
 *
 * Pulls the user's detected biases (structured) from /api/bias. Same shape as
 * the other data hooks: AbortController-guarded load, `{ profiles, loading,
 * configured, refresh }`.
 */

import { useCallback, useEffect, useState } from "react";
import type { BiasProfile } from "@/types";

export function useBiasProfile() {
  const [profiles, setProfiles] = useState<BiasProfile[]>([]);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/bias", { signal });
      const data = await res.json();
      setProfiles(Array.isArray(data.profiles) ? data.profiles : []);
      setConfigured(Boolean(data.configured));
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

  return { profiles, configured, loading, refresh };
}
