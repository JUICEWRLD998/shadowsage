"use client";

/**
 * useShadowState — client view of the Shadow.
 *
 * Reads the Shadow's status from /api/shadow and exposes the actions the chat
 * surface needs: refresh the status, trigger emergence, and ask the Shadow for
 * an interjection. State-only; the dramatic UI lives in ShadowAwakening and the
 * chat thread.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";

export interface ShadowPublic {
  active: boolean;
  activatedAt: string;
  tone: string;
  catchphrase: string;
  emergenceMessage: string;
  record: { wins: number; losses: number; draws: number };
}

export interface ShadowEligibility {
  eligible: boolean;
  predictionCount: number;
  biasTypeCount: number;
  needed: { predictions: number; biasTypes: number };
}

interface ShadowStatus {
  active: boolean;
  shadow: ShadowPublic | null;
  eligibility: ShadowEligibility | null;
}

export function useShadowState() {
  const [status, setStatus] = useState<ShadowStatus>({
    active: false,
    shadow: null,
    eligibility: null,
  });
  const [loading, setLoading] = useState(true);
  // Guards against firing emergence twice while a spawn is mid-flight.
  const emerging = useRef(false);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/shadow", { signal });
      const data = await res.json();
      setStatus({
        active: Boolean(data.active),
        shadow: data.shadow ?? null,
        eligibility: data.eligibility ?? null,
      });
    } catch {
      // Network/abort — keep whatever we had.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    void refresh(ctrl.signal);
    return () => ctrl.abort();
  }, [refresh]);

  /**
   * Spawn the Shadow. Returns the persona plus `fresh` — true only when THIS
   * call birthed it (so the caller can play the awakening exactly once, not on
   * a reload where the Shadow already existed).
   */
  const emerge = useCallback(async (): Promise<{
    shadow: ShadowPublic | null;
    fresh: boolean;
  }> => {
    if (emerging.current) return { shadow: null, fresh: false };
    emerging.current = true;
    try {
      const res = await fetch("/api/shadow", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "emerge" }),
      });
      const data = await res.json();
      if (data.shadow) {
        setStatus({ active: true, shadow: data.shadow, eligibility: null });
        return { shadow: data.shadow as ShadowPublic, fresh: Boolean(data.emerged) };
      }
      if (data.eligibility) {
        setStatus((s) => ({ ...s, eligibility: data.eligibility }));
      }
      return { shadow: null, fresh: false };
    } catch {
      return { shadow: null, fresh: false };
    } finally {
      emerging.current = false;
    }
  }, []);

  /** Ask the Shadow to interject on the current conversation. */
  const respond = useCallback(
    async (messages: UIMessage[]): Promise<string> => {
      try {
        const res = await fetch("/api/shadow", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "respond", messages }),
        });
        const data = await res.json();
        return typeof data.text === "string" ? data.text : "";
      } catch {
        return "";
      }
    },
    [],
  );

  return {
    active: status.active,
    shadow: status.shadow,
    eligibility: status.eligibility,
    loading,
    refresh,
    emerge,
    respond,
  };
}
