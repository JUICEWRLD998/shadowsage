"use client";

/**
 * ScreenGlitch — a full-screen tear/distort overlay for dramatic transitions.
 *
 * Mount it with `active` to play a brief scanline + RGB-tear + flicker pass
 * over the whole viewport. Built for the Shadow Awakening moment (Phase 3); it
 * sits above everything, ignores pointer events, and never blocks interaction.
 *
 * Under prefers-reduced-motion it degrades to a single soft violet flash.
 */

import styles from "./ScreenGlitch.module.css";

export function ScreenGlitch({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className={styles.overlay} aria-hidden>
      <div className={styles.scan} />
      <div className={styles.tearA} />
      <div className={styles.tearB} />
    </div>
  );
}
