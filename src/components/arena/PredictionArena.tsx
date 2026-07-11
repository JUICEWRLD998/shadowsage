"use client";

/**
 * PredictionArena — the /arena surface.
 *
 * Top: the YOU-vs-SHADOW AccuracyBoard. Below: every prediction resolved
 * against real World Cup results — settled calls (correct / wrong, with the
 * final scoreline) and still-pending calls awaiting kickoff. This is where the
 * user's track record stops being a list and becomes a contest.
 */

import Link from "next/link";
import { ArrowRight, Check, Swords, X, Clock, Zap } from "lucide-react";
import { useArena, type ResolvedPrediction } from "@/hooks/useArena";
import { AccuracyBoard } from "./AccuracyBoard";
import { Stagger, StaggerItem } from "@/components/ui/Reveal";
import styles from "./PredictionArena.module.css";

function VerdictRow({ p }: { p: ResolvedPrediction }) {
  const settled = p.verdict !== "pending";
  return (
    <article
      className={`${styles.row} ${styles[p.verdict]}`}
      data-verdict={p.verdict}
    >
      <div className={styles.rowMain}>
        <p className={styles.matchup}>{p.match}</p>
        <p className={styles.pick}>
          Your call: <strong>{p.pick}</strong>
          {p.predictedScore && <span className={styles.score}> {p.predictedScore}</span>}
          <span className={styles.conf}> · conf {p.confidence}/10</span>
        </p>
        {p.reasoning && <p className={styles.reason}>&ldquo;{p.reasoning}&rdquo;</p>}
      </div>

      <div className={styles.rowResult}>
        {settled ? (
          <>
            <span className={`${styles.badge} ${styles[`badge_${p.verdict}`]}`}>
              {p.verdict === "correct" ? <Check size={14} /> : <X size={14} />}
              {p.verdict === "correct" ? "Hit" : "Miss"}
            </span>
            <span className={styles.finalScore}>{p.actualScore}</span>
            {p.exactScore && (
              <span className={styles.exact}>
                <Zap size={11} aria-hidden /> exact score
              </span>
            )}
          </>
        ) : (
          <span className={styles.pending}>
            <Clock size={13} aria-hidden /> awaiting result
          </span>
        )}
      </div>
    </article>
  );
}

export function PredictionArena() {
  const { data, loading } = useArena();
  const { resolved, summary, shadow } = data;

  const settled = resolved.filter((r) => r.verdict !== "pending");
  const pending = resolved.filter((r) => r.verdict === "pending");

  return (
    <main className={styles.page}>
      <div className="u-container">
        <header className={styles.head}>
          <p className={styles.kicker}>
            <Swords size={14} aria-hidden /> The Arena
          </p>
          <h1 className={styles.title}>You vs your Shadow</h1>
          <p className={styles.lede}>
            Every call you&apos;ve made, weighed against real results. Your Shadow
            is keeping score — and it&apos;s building a case against you.
          </p>
        </header>

        {loading ? (
          <div className={styles.loading}>
            <div className={styles.boardSkeleton} />
            <div className={styles.listSkeleton}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={styles.rowSkeleton} />
              ))}
            </div>
          </div>
        ) : resolved.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon} aria-hidden>
              <Swords size={24} />
            </span>
            <h2 className={styles.emptyTitle}>The Arena is empty</h2>
            <p className={styles.emptyBody}>
              Make a few predictions in the chat. Once their matches kick off,
              they&apos;ll be scored here and your Shadow will start fighting back.
            </p>
            <Link href="/chat" className={styles.cta}>
              Make your first call <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        ) : (
          <>
            <AccuracyBoard summary={summary} shadow={shadow} />

            {settled.length > 0 && (
              <section className={styles.group}>
                <h2 className={styles.groupTitle}>Settled calls</h2>
                <Stagger className={styles.list} stagger={0.04}>
                  {settled.map((p, i) => (
                    <StaggerItem key={`${p.timestamp}-${i}`}>
                      <VerdictRow p={p} />
                    </StaggerItem>
                  ))}
                </Stagger>
              </section>
            )}

            {pending.length > 0 && (
              <section className={styles.group}>
                <h2 className={styles.groupTitle}>Awaiting kickoff</h2>
                <Stagger className={styles.list} stagger={0.04}>
                  {pending.map((p, i) => (
                    <StaggerItem key={`${p.timestamp}-${i}`}>
                      <VerdictRow p={p} />
                    </StaggerItem>
                  ))}
                </Stagger>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
