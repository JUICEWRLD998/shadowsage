"use client";

/**
 * ReportCardSection — assembles and presents the shareable Shadow Report Card.
 *
 * Pulls the head-to-head accuracy + Shadow record from /api/arena, the detected
 * biases (passed in from the Profile, already loaded), and the single most
 * painful roast from /api/roast. Renders the card into a ref and mounts a
 * ShareButton (kept OUTSIDE the captured node) to export it as a PNG.
 *
 * Best-effort throughout: a dormant Shadow, no roast, or unconfigured memory all
 * degrade to a still-meaningful card rather than an error.
 */

import { useEffect, useRef, useState } from "react";
import type { BiasProfile } from "@/types";
import { useArena } from "@/hooks/useArena";
import { ShadowReportCard } from "./ShadowReportCard";
import { ShareButton } from "@/components/ui/ShareButton";
import styles from "./ReportCardSection.module.css";

export function ReportCardSection({ biases }: { biases: BiasProfile[] }) {
  const { data, loading } = useArena();
  const cardRef = useRef<HTMLDivElement>(null);
  const [roast, setRoast] = useState<string | null>(null);

  // Fetch the top roast once. Failure (no settled misses, no memory) is fine —
  // the card just omits the roast block.
  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/roast", { method: "POST", signal: ctrl.signal });
        const json = await res.json();
        if (typeof json?.roast?.text === "string") setRoast(json.roast.text);
      } catch {
        // aborted or failed — leave roast null
      }
    })();
    return () => ctrl.abort();
  }, []);

  if (loading) {
    return <div className={styles.skeleton} aria-hidden />;
  }

  return (
    <section className={styles.wrap} aria-label="Shareable report card">
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>Your report card</h2>
          <p className={styles.lede}>
            One card, the whole rivalry. Export it and let the Shadow do your
            bragging — or your roasting.
          </p>
        </div>
        <ShareButton targetRef={cardRef} label="Share report card" />
      </div>

      <div className={styles.cardHolder}>
        <ShadowReportCard
          ref={cardRef}
          summary={data.summary}
          shadow={data.shadow}
          biases={biases}
          resolved={data.resolved}
          roast={roast}
        />
      </div>
    </section>
  );
}
