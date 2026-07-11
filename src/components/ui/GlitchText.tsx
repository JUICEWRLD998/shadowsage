"use client";

/**
 * GlitchText — RGB-split / scanline glitch effect for the Shadow's voice.
 *
 * Two clipped colour-offset copies of the text jitter over the base text. Used
 * on the landing "Binary Emergence" line now, and reserved for the Shadow's
 * first words when the emergence engine lands (Phase 3).
 *
 * Honours prefers-reduced-motion (renders as plain, static text). The colour
 * copies are decorative and aria-hidden via the pseudo-elements (data-text).
 */

import styles from "./GlitchText.module.css";

interface GlitchTextProps {
  children: string;
  className?: string;
  /** Continuously glitch vs only on hover/focus. */
  active?: boolean;
}

export function GlitchText({
  children,
  className,
  active = true,
}: GlitchTextProps) {
  return (
    <span
      className={[styles.glitch, active && styles.active, className]
        .filter(Boolean)
        .join(" ")}
      data-text={children}
    >
      {children}
    </span>
  );
}
