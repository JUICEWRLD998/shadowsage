"use client";

/**
 * Scroll-reveal primitives built on Framer Motion's in-view detection.
 *
 *   <Reveal>            — a single element that fades + rises when scrolled into
 *                         view (once).
 *   <Stagger><StaggerItem/>…  — a container whose children enter in sequence.
 *
 * All three collapse to a plain, fully-visible element when the user prefers
 * reduced motion, so nothing depends on animation to be readable.
 */

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { fadeUp, fadeUpSm, staggerContainer } from "@/lib/motion";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Override the default fade-up variant. */
  variants?: Variants;
  /** Fraction of the element that must be visible before it animates (0–1). */
  amount?: number;
  /** Delay before the entrance, seconds. */
  delay?: number;
  /**
   * Animate on mount instead of on scroll-into-view. Use for primary content
   * that renders after an async load (e.g. a fetched table): `whileInView`'s
   * IntersectionObserver can miss the initial in-view event for late-mounting
   * elements, leaving them stuck at opacity 0. `immediate` sidesteps that.
   */
  immediate?: boolean;
}

export function Reveal({
  children,
  className,
  variants = fadeUp,
  amount = 0.2,
  delay = 0,
  immediate = false,
}: RevealProps) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  const trigger = immediate
    ? { animate: "visible" as const }
    : { whileInView: "visible" as const, viewport: { once: true, amount } };

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      {...trigger}
      transition={delay ? { delay } : undefined}
    >
      {children}
    </motion.div>
  );
}

interface StaggerProps {
  children: ReactNode;
  className?: string;
  /** Seconds between each child's entrance. */
  stagger?: number;
  delay?: number;
  amount?: number;
  /** Animate on mount instead of on scroll-into-view. See Reveal's `immediate`. */
  immediate?: boolean;
}

export function Stagger({
  children,
  className,
  stagger = 0.08,
  delay = 0,
  amount = 0.2,
  immediate = false,
}: StaggerProps) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  const trigger = immediate
    ? { animate: "visible" as const }
    : { whileInView: "visible" as const, viewport: { once: true, amount } };

  return (
    <motion.div
      className={className}
      variants={staggerContainer(stagger, delay)}
      initial="hidden"
      {...trigger}
    >
      {children}
    </motion.div>
  );
}

/** A child of <Stagger>. Inherits the container's hidden/visible state. */
export function StaggerItem({
  children,
  className,
  variants = fadeUpSm,
}: {
  children: ReactNode;
  className?: string;
  variants?: Variants;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  );
}
