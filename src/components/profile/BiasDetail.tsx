"use client";

/**
 * BiasDetail — a single detected bias, expanded.
 *
 * Shows the bias name, a severity meter (colored by tier), the plain-language
 * pattern, and the concrete evidence the detector pulled from the user's own
 * predictions. One card per bias on the Profile page.
 */

import { AlertTriangle } from "lucide-react";
import type { BiasProfile } from "@/types";
import styles from "./BiasDetail.module.css";

function tierLabel(severity: number): string {
  if (severity >= 7) return "severe";
  if (severity >= 4) return "moderate";
  return "mild";
}

export function BiasDetail({ bias }: { bias: BiasProfile }) {
  return (
    <article
      className={styles.card}
      style={{ ["--dna" as string]: bias.dnaColor }}
    >
      <header className={styles.head}>
        <span className={styles.dot} aria-hidden />
        <div className={styles.titleWrap}>
          <h3 className={styles.name}>{bias.label}</h3>
          <span className={styles.tier}>
            {tierLabel(bias.severity)} · {bias.severity}/10
          </span>
        </div>
      </header>

      <div
        className={styles.meter}
        role="meter"
        aria-valuenow={bias.severity}
        aria-valuemin={0}
        aria-valuemax={10}
        aria-label={`${bias.label} severity`}
      >
        <span
          className={styles.meterFill}
          style={{ width: `${bias.severity * 10}%` }}
        />
      </div>

      <p className={styles.desc}>{bias.description}</p>

      {bias.evidence.length > 0 && (
        <div className={styles.evidence}>
          <p className={styles.evidenceLabel}>
            <AlertTriangle size={12} aria-hidden /> Caught in the act
          </p>
          <ul>
            {bias.evidence.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
