"use client";

/**
 * ProfileView — the /profile surface: the user's "Bias DNA".
 *
 * Left: the animated double-helix (BiasDNA). Right: a card per detected bias
 * (BiasDetail). Below: the shareable Shadow Report Card (ReportCardSection).
 * Empty state nudges the user to make more predictions so detection has
 * something to chew on.
 */

import Link from "next/link";
import { ArrowRight, Dna } from "lucide-react";
import { useBiasProfile } from "@/hooks/useBiasProfile";
import { BiasDNA } from "./BiasDNA";
import { BiasDetail } from "./BiasDetail";
import { ReportCardSection } from "./ReportCardSection";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/Reveal";
import styles from "./ProfileView.module.css";

export function ProfileView() {
  const { profiles, loading } = useBiasProfile();

  return (
    <main className={styles.page}>
      <div className="u-container">
        <header className={styles.head}>
          <p className={styles.kicker}>
            <Dna size={14} aria-hidden /> Bias DNA
          </p>
          <h1 className={styles.title}>Your cognitive fingerprint</h1>
          <p className={styles.lede}>
            Every prediction leaves a trace. Your Shadow reads these patterns —
            and uses them against you. Here&apos;s what it&apos;s found so far.
          </p>
        </header>

        {loading ? (
          <div className={styles.layout}>
            <div className={styles.helixSkeleton} />
            <div className={styles.listSkeleton}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={styles.cardSkeleton} />
              ))}
            </div>
          </div>
        ) : profiles.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon} aria-hidden>
              <Dna size={24} />
            </span>
            <h2 className={styles.emptyTitle}>No patterns detected yet</h2>
            <p className={styles.emptyBody}>
              Your DNA forms as you predict. Make a handful of calls in the chat
              and your biases will start to crystallise here.
            </p>
            <Link href="/chat" className={styles.cta}>
              Make some predictions <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        ) : (
          <div className={styles.layout}>
            <Reveal className={styles.helixCol}>
              <div className={styles.helixCard}>
                <BiasDNA profiles={profiles} />
              </div>
            </Reveal>

            <Stagger className={styles.list} stagger={0.06}>
              {profiles.map((b) => (
                <StaggerItem key={b.type}>
                  <BiasDetail bias={b} />
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        )}

        {!loading && (
          <Reveal>
            <ReportCardSection biases={profiles} />
          </Reveal>
        )}
      </div>
    </main>
  );
}
