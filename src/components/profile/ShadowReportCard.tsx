"use client";

/**
 * ShadowReportCard — the shareable, one-page verdict.
 *
 * A self-contained visual summary of the You-vs-Shadow rivalry: the head-to-head
 * accuracy, the top biases the Shadow exploits, the best and worst calls, and the
 * single most painful roast. Built to be captured to PNG (see imageExport.ts), so
 * it forwards a ref and renders with inline-safe, screenshot-friendly styling —
 * no animations, fixed width, everything self-contained.
 *
 * Pure presentation: all data is passed in. Renders sensibly even with sparse
 * data (no roast yet, dormant Shadow, zero settled predictions).
 */

import { forwardRef } from "react";
import type { BiasProfile } from "@/types";
import type { AccuracySummary, ResolvedPrediction, ShadowBlock } from "@/hooks/useArena";
import styles from "./ShadowReportCard.module.css";

export interface ReportCardData {
  summary: AccuracySummary;
  shadow: ShadowBlock | null;
  biases: BiasProfile[];
  resolved: ResolvedPrediction[];
  roast: string | null;
}

/** Highest-confidence correct call — the user's flex. */
function bestCall(resolved: ResolvedPrediction[]): ResolvedPrediction | null {
  return (
    resolved
      .filter((r) => r.verdict === "correct")
      .sort((a, b) => b.confidence - a.confidence)[0] ?? null
  );
}

/** Highest-confidence miss — the one that aged worst. */
function worstCall(resolved: ResolvedPrediction[]): ResolvedPrediction | null {
  return (
    resolved
      .filter((r) => r.verdict === "wrong")
      .sort((a, b) => b.confidence - a.confidence)[0] ?? null
  );
}

export const ShadowReportCard = forwardRef<HTMLDivElement, ReportCardData>(
  function ShadowReportCard({ summary, shadow, biases, resolved, roast }, ref) {
    const best = bestCall(resolved);
    const worst = worstCall(resolved);
    const topBiases = biases.slice(0, 3);
    const shadowPlayed = shadow
      ? shadow.record.wins + shadow.record.losses + shadow.record.draws
      : 0;
    const shadowActive = Boolean(shadow && shadowPlayed > 0);

    return (
      <div ref={ref} className={styles.card}>
        {/* Header */}
        <header className={styles.header}>
          <p className={styles.brandKicker}>ShadowSage</p>
          <h2 className={styles.brandTitle}>Report Card</h2>
        </header>

        {/* Head-to-head scoreboard */}
        <section className={styles.scoreboard}>
          <div className={`${styles.score} ${styles.you}`}>
            <span className={styles.scoreLabel}>You</span>
            <span className={styles.scoreBig}>{summary.accuracy}%</span>
            <span className={styles.scoreSub}>
              {summary.correct}W · {summary.wrong}L
              {summary.resolved > 0 ? ` · ${summary.resolved} settled` : ""}
            </span>
          </div>

          <div className={styles.vs}>VS</div>

          <div className={`${styles.score} ${styles.shadow}`}>
            <span className={styles.scoreLabel}>Your Shadow</span>
            {shadowActive ? (
              <>
                <span className={styles.scoreBig}>{shadow!.accuracy}%</span>
                <span className={styles.scoreSub}>
                  {shadow!.record.wins}W · {shadow!.record.losses}L · {shadow!.record.draws}D
                </span>
              </>
            ) : (
              <>
                <span className={styles.scoreBig}>—</span>
                <span className={styles.scoreSub}>dormant</span>
              </>
            )}
          </div>
        </section>

        {/* Top biases */}
        <section className={styles.section}>
          <p className={styles.sectionTitle}>Top biases detected</p>
          {topBiases.length > 0 ? (
            <ul className={styles.biasList}>
              {topBiases.map((b) => (
                <li key={b.type} className={styles.biasRow} style={{ ["--dna" as string]: b.dnaColor }}>
                  <span className={styles.biasDot} />
                  <span className={styles.biasName}>{b.label}</span>
                  <span className={styles.biasSev}>{b.severity}/10</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.muted}>No biases crystallised yet.</p>
          )}
        </section>

        {/* Best / worst calls */}
        <section className={styles.callsGrid}>
          <div className={styles.call}>
            <p className={styles.callLabel}>Best call</p>
            {best ? (
              <>
                <p className={styles.callMatch}>{best.match}</p>
                <p className={styles.callMeta}>
                  {best.pick}
                  {best.actualScore ? ` · ${best.actualScore}` : ""} · {best.confidence}/10
                </p>
              </>
            ) : (
              <p className={styles.muted}>None yet</p>
            )}
          </div>
          <div className={styles.call}>
            <p className={`${styles.callLabel} ${styles.callLabelBad}`}>Worst call</p>
            {worst ? (
              <>
                <p className={styles.callMatch}>{worst.match}</p>
                <p className={styles.callMeta}>
                  {worst.pick}
                  {worst.actualScore ? ` → ${worst.actualScore}` : ""} · {worst.confidence}/10
                </p>
              </>
            ) : (
              <p className={styles.muted}>None yet</p>
            )}
          </div>
        </section>

        {/* Top roast */}
        {roast && (
          <section className={styles.roast}>
            <p className={styles.roastLabel}>The Shadow says</p>
            <p className={styles.roastText}>“{roast}”</p>
          </section>
        )}

        {/* Footer / branding */}
        <footer className={styles.footer}>
          <span className={styles.walrus}>
            Powered by QVAC local AI + WDK self-custody
          </span>
          <span className={styles.url}>shadowsage.vercel.app</span>
        </footer>
      </div>
    );
  },
);
