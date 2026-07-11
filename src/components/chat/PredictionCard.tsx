/**
 * PredictionCard — a single stored prediction, rendered on the /calls history
 * page. Presentational only; accepts already-parsed fields so it can show either
 * a freshly-made pick or one recalled from Walrus Memory.
 *
 * The recalled `match` is a plain "TeamA vs TeamB" string, so we split it and
 * resolve flags ourselves to keep the card visually consistent with fixtures.
 */

import { Flag } from "@/components/ui/Flag";
import styles from "./PredictionCard.module.css";

export interface PredictionCardProps {
  match: string;
  pick: string;
  predictedScore?: string;
  confidence?: number;
  reasoning?: string;
}

/** Split "TeamA vs TeamB" into its two sides (tolerant of casing/spacing). */
function splitMatch(match: string): [string, string] | null {
  const parts = match.split(/\s+vs\.?\s+/i);
  if (parts.length !== 2) return null;
  const [a, b] = parts.map((s) => s.trim());
  return a && b ? [a, b] : null;
}

export function PredictionCard({
  match,
  pick,
  predictedScore,
  confidence,
  reasoning,
}: PredictionCardProps) {
  const teams = splitMatch(match);

  return (
    <article className={styles.card}>
      <div className={styles.head}>
        <span className={styles.match}>
          {teams ? (
            <>
              <Flag name={teams[0]} size={18} className={styles.flag} />
              {teams[0]}
              <span className={styles.vs}>vs</span>
              <Flag name={teams[1]} size={18} className={styles.flag} />
              {teams[1]}
            </>
          ) : (
            match || "Prediction"
          )}
        </span>
        {confidence ? (
          <span className={`${styles.conf} u-tnum`}>{confidence}/10</span>
        ) : null}
      </div>

      <div className={styles.pickRow}>
        <span className={styles.pick}>{pick}</span>
        {predictedScore ? (
          <span className={`${styles.score} u-tnum`}>{predictedScore}</span>
        ) : null}
      </div>

      {reasoning ? <p className={styles.reason}>“{reasoning}”</p> : null}
    </article>
  );
}
