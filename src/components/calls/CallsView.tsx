"use client";

/**
 * CallsView — the full prediction-history surface for /calls.
 *
 * Pulls every stored pick back from wallet-scoped memory (newest first) and lays them
 * out as a responsive grid of PredictionCards. Now includes stake information for
 * predictions that have been backed with USDt.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, History } from "lucide-react";
import { useRecentPredictions } from "@/hooks/usePredictions";
import { PredictionCard } from "@/components/chat/PredictionCard";
import { Stagger, StaggerItem } from "@/components/ui/Reveal";
import type { Stake } from "@/types";
import styles from "./CallsView.module.css";

export function CallsView() {
  const { predictions, loading } = useRecentPredictions(50);
  const [stakes, setStakes] = useState<Stake[]>([]);
  const [stakesLoading, setStakesLoading] = useState(false);

  // Fetch stakes for all predictions
  useEffect(() => {
    if (predictions.length === 0) return;

    setStakesLoading(true);
    fetch("/api/stakes")
      .then((res) => res.json())
      .then((data) => setStakes(data.stakes || []))
      .catch((err) => console.error("[CallsView] Failed to fetch stakes:", err))
      .finally(() => setStakesLoading(false));
  }, [predictions]);

  // Helper to find stake for a prediction
  const getStakeForPrediction = (predictionId: string): Stake | undefined => {
    return stakes.find((stake) => stake.predictionId === predictionId);
  };

  return (
    <main className={styles.page}>
      <div className="u-container">
        <header className={styles.head}>
          <div>
            <p className={styles.kicker}>
              <History size={14} aria-hidden />
              Your track record
            </p>
            <h1 className={styles.title}>Your calls</h1>
            <p className={styles.lede}>
              Every prediction you&apos;ve made, ready for QVAC-powered local recall.
              Your Shadow studies these — and it never forgets.
            </p>
          </div>
          {!loading && predictions.length > 0 && (
            <span className={`${styles.total} u-tnum`}>
              {predictions.length}
              <span className={styles.totalLabel}>
                {predictions.length === 1 ? "call" : "calls"}
              </span>
            </span>
          )}
        </header>

        {loading ? (
          <div className={styles.grid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        ) : predictions.length > 0 ? (
          <Stagger className={styles.grid} stagger={0.05}>
            {predictions.map((p, i) => (
              <StaggerItem key={`${p.timestamp}-${i}`}>
                <PredictionCard
                  match={p.match}
                  pick={p.pick}
                  predictedScore={p.predictedScore}
                  confidence={p.confidence}
                  reasoning={p.reasoning}
                  stake={getStakeForPrediction(p.id || "")}
                />
              </StaggerItem>
            ))}
          </Stagger>
        ) : (
          <div className={styles.empty}>
            <span className={styles.emptyIcon} aria-hidden>
              <History size={24} />
            </span>
            <h2 className={styles.emptyTitle}>No calls yet</h2>
            <p className={styles.emptyBody}>
              Head to the chat and make your first prediction — who wins, the
              score, and why. It&apos;ll show up here for your Shadow to study.
            </p>
            <Link href="/chat" className={styles.cta}>
              Make your first call
              <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
