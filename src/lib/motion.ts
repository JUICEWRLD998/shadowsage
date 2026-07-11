/**
 * Shared motion tokens + Framer Motion variants.
 *
 * Single source of truth for animation rhythm across the app. The easings and
 * durations mirror the CSS custom properties in globals.css (--ease-out-expo,
 * --t-base, …) so CSS, Framer Motion, and GSAP all move with the same feel.
 *
 * Pure data — safe to import anywhere (server or client).
 */

import type { Variants } from "framer-motion";

/** Durations in SECONDS (Framer/GSAP use seconds; CSS vars are the ms twins). */
export const DURATION = {
  fast: 0.15, // --t-fast
  base: 0.25, // --t-base
  slow: 0.4, // --t-slow
  slower: 0.7,
} as const;

/** Cubic-bezier easings, matching the CSS easing tokens. */
export const EASE = {
  outExpo: [0.16, 1, 0.3, 1], // --ease-out-expo
  outQuart: [0.25, 1, 0.5, 1], // --ease-out-quart
  inOut: [0.65, 0, 0.35, 1], // --ease-in-out
} as const;

/** Spring presets for physics-based motion (bubbles, pops, magnetic cards). */
export const SPRING = {
  soft: { type: "spring", stiffness: 260, damping: 26, mass: 0.9 },
  snappy: { type: "spring", stiffness: 420, damping: 30 },
  gentle: { type: "spring", stiffness: 140, damping: 20 },
} as const;

/* ----------------------------------------------------------------- variants -- */

/** Fade + rise — the canonical entrance. Mirrors the CSS `rise` keyframe. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.slow, ease: EASE.outExpo },
  },
};

/** Smaller rise for dense items (cards in a grid, list rows). */
export const fadeUpSm: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.base, ease: EASE.outExpo },
  },
};

/** Container that staggers its children's entrance. */
export const staggerContainer = (stagger = 0.08, delay = 0): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren: delay },
  },
});

/** Spring-based pop-in for emphasis (badges, the live pulse, counters). */
export const springPop: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: SPRING.snappy },
};

/** Page/route transition — gentle cross-fade + small lift. */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE.outQuart } },
  exit: { opacity: 0, y: -8, transition: { duration: DURATION.fast, ease: EASE.outQuart } },
};
