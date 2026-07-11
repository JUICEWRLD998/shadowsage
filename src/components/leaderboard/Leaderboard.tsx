"use client";

/**
 * Leaderboard — the /leaderboard surface: the cross-user Shadow rivalry.
 *
 * Top: three category champions (sharpest Shadow, most roasted, best defiance).
 * Below: the ranked field, with the real user's row highlighted. The board is
 * the real user's live memory-derived stats ranked against a fixed rival field
 * (see lib/leaderboard.ts) — the "memory at scale" proof the spec asks for.
 */

import { Crosshair, Flame, ShieldCheck, Trophy } from "lucide-react";
import type { BiasType, LeaderboardEntry } from "@/types";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/Reveal";
import styles from "./Leaderboard.module.css";

/** Client-safe bias label (the server biasDetector pulls in heavy deps). */
function prettyBias(type: BiasType): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function ChampionCard({
  icon,
  label,
  entry,
  stat,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  entry: LeaderboardEntry;
  stat: string;
  tone: "you" | "shadow" | "gold";
}) {
  return (
    <article className={`${styles.champ} ${styles[`champ_${tone}`]}`}>
      <p className={styles.champLabel}>
        {icon} {label}
      </p>
      <p className={styles.champName}>
        {entry.displayName}
        {entry.isYou && <span className={styles.youTag}>you</span>}
      </p>
      <p className={styles.champStat}>{stat}</p>
    </article>
  );
}

export function Leaderboard() {
  const { data, loading } = useLeaderboard();
  const { entries, categories, youRank, configured } = data;

  return (
    <main className={styles.page}>
      <div className="u-container">
        <header className={styles.head}>
          <p className={styles.kicker}>
            <Trophy size={14} aria-hidden /> Shadow Leaderboard
          </p>
          <h1 className={styles.title}>Whose twin is sharpest?</h1>
          <p className={styles.lede}>
            Every Shadow is forged from a real predictor&apos;s blind spots. Here&apos;s
            how the field stacks up — ranked by how often each Shadow out-calls its
            human.
          </p>
        </header>

        {loading ? (
          <div className={styles.skeletonWrap} aria-hidden>
            <div className={styles.champGridSkeleton}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={styles.champSkeleton} />
              ))}
            </div>
            <div className={styles.tableSkeleton}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={styles.rowSkeleton} />
              ))}
            </div>
          </div>
        ) : (
          <>
            {categories && (
              <Stagger className={styles.champGrid} stagger={0.07} immediate>
                <StaggerItem>
                  <ChampionCard
                    icon={<Crosshair size={13} aria-hidden />}
                    label="Sharpest Shadow"
                    entry={categories.sharpestShadow}
                    stat={`${categories.sharpestShadow.shadowAccuracy}% shadow accuracy`}
                    tone="shadow"
                  />
                </StaggerItem>
                <StaggerItem>
                  <ChampionCard
                    icon={<Flame size={13} aria-hidden />}
                    label="Most Roasted"
                    entry={categories.mostRoasted}
                    stat={`${categories.mostRoasted.roastCount} roasts taken`}
                    tone="gold"
                  />
                </StaggerItem>
                <StaggerItem>
                  <ChampionCard
                    icon={<ShieldCheck size={13} aria-hidden />}
                    label="Best Defiance"
                    entry={categories.bestDefiance}
                    stat={`${categories.bestDefiance.defianceRate}% defiance rate`}
                    tone="you"
                  />
                </StaggerItem>
              </Stagger>
            )}

            <Reveal immediate>
              <div className={styles.tableCard}>
                <div className={`${styles.row} ${styles.headerRow}`} role="row">
                  <span className={styles.cRank}>#</span>
                  <span className={styles.cName}>Predictor</span>
                  <span className={styles.cNum}>Shadow</span>
                  <span className={styles.cNum}>You</span>
                  <span className={`${styles.cNum} ${styles.hideSm}`}>Calls</span>
                  <span className={`${styles.cNum} ${styles.hideSm}`}>Roasts</span>
                  <span className={`${styles.cBias} ${styles.hideMd}`}>Top bias</span>
                  <span className={`${styles.cNum} ${styles.hideMd}`}>Defiance</span>
                </div>

                <Stagger stagger={0.03} immediate>
                  {entries.map((e) => (
                    <StaggerItem key={e.userId}>
                      <div
                        className={`${styles.row} ${e.isYou ? styles.youRow : ""} ${
                          e.rank === 1 ? styles.topRow : ""
                        }`}
                        role="row"
                      >
                        <span className={styles.cRank}>
                          {e.rank === 1 ? <Trophy size={14} aria-hidden /> : e.rank}
                        </span>
                        <span className={styles.cName}>
                          {e.displayName}
                          {e.isYou && <span className={styles.youTag}>you</span>}
                        </span>
                        <span className={`${styles.cNum} ${styles.shadowNum}`}>
                          {e.shadowAccuracy}%
                        </span>
                        <span className={`${styles.cNum} ${styles.youNum}`}>
                          {e.userAccuracy}%
                        </span>
                        <span className={`${styles.cNum} ${styles.hideSm}`}>
                          {e.totalPredictions}
                        </span>
                        <span className={`${styles.cNum} ${styles.hideSm}`}>
                          {e.roastCount}
                        </span>
                        <span className={`${styles.cBias} ${styles.hideMd}`}>
                          {prettyBias(e.topBias)}
                        </span>
                        <span className={`${styles.cNum} ${styles.hideMd}`}>
                          {e.defianceRate}%
                        </span>
                      </div>
                    </StaggerItem>
                  ))}
                </Stagger>
              </div>
            </Reveal>

            <p className={styles.note}>
              {!configured
                ? "Connect your wallet to enter the field — your stats rank in live."
                : youRank
                  ? `You're #${youRank} of ${entries.length}. This board ranks Shadows — beat yours consistently and you'll top Best Defiance instead.`
                  : "Make a few predictions in the chat and you'll join the field, ranked against every other Shadow."}
              <span className={styles.walrus}>
                {" "}
                · Powered by QVAC local AI + WDK self-custody
              </span>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
