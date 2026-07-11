"use client";

/**
 * AccuracyBoard — the head-to-head scoreboard at the top of the Arena.
 *
 * YOU (blue) vs SHADOW (violet): each side shows its accuracy as a big
 * count-up number, with the supporting tallies beneath. The Shadow column
 * stays dormant until it has spawned and actually has a record.
 */

import { Crosshair, Ghost, Target, Zap } from "lucide-react";
import type { AccuracySummary, ShadowBlock } from "@/hooks/useArena";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import styles from "./AccuracyBoard.module.css";

interface AccuracyBoardProps {
  summary: AccuracySummary;
  shadow: ShadowBlock | null;
}

export function AccuracyBoard({ summary, shadow }: AccuracyBoardProps) {
  const shadowPlayed = shadow
    ? shadow.record.wins + shadow.record.losses + shadow.record.draws
    : 0;

  return (
    <section className={styles.board} aria-label="Accuracy scoreboard">
      {/* YOU */}
      <div className={`${styles.side} ${styles.you}`}>
        <p className={styles.sideLabel}>
          <Target size={14} aria-hidden /> You
        </p>
        <p className={styles.big}>
          <AnimatedCounter value={summary.accuracy} suffix="%" />
        </p>
        <p className={styles.subLabel}>accuracy over {summary.resolved} settled</p>
        <ul className={styles.tallies}>
          <li>
            <span className={styles.tallyNum}>
              <AnimatedCounter value={summary.correct} />
            </span>
            <span className={styles.tallyLabel}>correct</span>
          </li>
          <li>
            <span className={styles.tallyNum}>
              <AnimatedCounter value={summary.wrong} />
            </span>
            <span className={styles.tallyLabel}>wrong</span>
          </li>
          <li>
            <span className={`${styles.tallyNum} ${styles.gold}`}>
              <AnimatedCounter value={summary.exact} />
            </span>
            <span className={styles.tallyLabel}>
              <Zap size={11} aria-hidden /> exact
            </span>
          </li>
        </ul>
      </div>

      <div className={styles.versus} aria-hidden>
        <span>VS</span>
      </div>

      {/* SHADOW */}
      <div className={`${styles.side} ${styles.shadow}`}>
        <p className={styles.sideLabel}>
          <Ghost size={14} aria-hidden /> Your Shadow
        </p>
        {shadow && shadowPlayed > 0 ? (
          <>
            <p className={styles.big}>
              <AnimatedCounter value={shadow.accuracy} suffix="%" />
            </p>
            <p className={styles.subLabel}>
              {shadow.record.wins}W · {shadow.record.losses}L · {shadow.record.draws}D
            </p>
            <ul className={styles.tallies}>
              <li>
                <span className={styles.tallyNum}>
                  <AnimatedCounter value={shadow.record.wins} />
                </span>
                <span className={styles.tallyLabel}>beat you</span>
              </li>
              <li>
                <span className={styles.tallyNum}>
                  <AnimatedCounter value={shadow.record.losses} />
                </span>
                <span className={styles.tallyLabel}>you won</span>
              </li>
            </ul>
          </>
        ) : (
          <div className={styles.dormant}>
            <Crosshair size={20} aria-hidden />
            <p>Dormant — keep predicting and it will awaken to contest your calls.</p>
          </div>
        )}
      </div>
    </section>
  );
}
