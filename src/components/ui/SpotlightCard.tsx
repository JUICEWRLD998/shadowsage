"use client";

/**
 * SpotlightCard — adds a pointer-tracked glow + subtle 3D tilt to a card.
 *
 * It renders the card surface itself: pass the card's visual classes via
 * `className` (e.g. "glass duelCard") and it layers an interactive glow that
 * follows the cursor plus a small tilt toward it. Tone picks the glow colour
 * (YOU = blue, SHADOW = violet). Purely additive — the children render exactly
 * as before; only motion/lighting is new.
 *
 * Tilt is disabled under prefers-reduced-motion (CSS) and on touch (no hover).
 */

import { useRef, type ReactNode } from "react";
import styles from "./SpotlightCard.module.css";

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  tone?: "you" | "shadow" | "neutral";
  /** Max tilt in degrees. 0 disables tilt but keeps the glow. */
  tilt?: number;
}

export function SpotlightCard({
  children,
  className,
  tone = "neutral",
  tilt = 5,
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    el.style.setProperty("--mx", `${x}px`);
    el.style.setProperty("--my", `${y}px`);
    if (tilt > 0) {
      el.style.setProperty("--rx", `${(0.5 - y / r.height) * tilt}deg`);
      el.style.setProperty("--ry", `${(x / r.width - 0.5) * tilt}deg`);
    }
  }

  function handleEnter() {
    ref.current?.style.setProperty("--spot", "1");
  }

  function handleLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--spot", "0");
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }

  return (
    <div
      ref={ref}
      className={[styles.card, styles[tone], className].filter(Boolean).join(" ")}
      onPointerMove={handleMove}
      onPointerEnter={handleEnter}
      onPointerLeave={handleLeave}
    >
      <span className={styles.glow} aria-hidden />
      {children}
    </div>
  );
}
