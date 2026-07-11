"use client";

/**
 * ShadowAwakening — the Binary Emergence Event, rendered.
 *
 * A full-screen takeover that plays exactly once, the moment the Shadow spawns:
 * particles erupt, the screen glitches, and the Shadow types out its first words
 * (quoting the user's real history). Dismissing it drops the user back into the
 * chat with the Shadow now present.
 *
 * Respects prefers-reduced-motion: the particles/typewriter collapse to a calm,
 * fully-legible static reveal.
 */

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { Ghost } from "lucide-react";
import { GlitchText } from "@/components/ui/GlitchText";
import styles from "./ShadowAwakening.module.css";

// Particle field is WebGL — load it only on the client, only when it mounts.
const ParticleField = dynamic(
  () => import("@/components/ui/ParticleField"),
  { ssr: false },
);

interface ShadowAwakeningProps {
  /** The Shadow's first words — quotes the user's real history. */
  message: string;
  /** Called when the user dismisses the overlay to face the Shadow. */
  onDismiss: () => void;
}

const TYPE_SPEED_MS = 18;

export function ShadowAwakening({ message, onDismiss }: ShadowAwakeningProps) {
  const reduce = useReducedMotion();
  const [typed, setTyped] = useState(reduce ? message : "");
  const [done, setDone] = useState(reduce);

  // Typewriter the emergence message (skipped under reduced motion).
  useEffect(() => {
    if (reduce) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setTyped(message.slice(0, i));
      if (i >= message.length) {
        clearInterval(id);
        setDone(true);
      }
    }, TYPE_SPEED_MS);
    return () => clearInterval(id);
  }, [message, reduce]);

  // Let the user skip the typewriter by clicking anywhere in the message area.
  const revealAll = () => {
    if (done) return;
    setTyped(message);
    setDone(true);
  };

  return (
    <motion.div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Your Shadow has awakened"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {!reduce && (
        <div className={styles.particles} aria-hidden>
          <ParticleField />
        </div>
      )}
      <div className={styles.scrim} aria-hidden />
      {!reduce && <div className={styles.glitchFlash} aria-hidden />}

      <motion.div
        className={styles.content}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.25, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        onClick={revealAll}
      >
        <span className={styles.kicker}>Binary Emergence Event</span>

        <motion.div
          className={styles.avatar}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.35, type: "spring", stiffness: 220, damping: 18 }}
        >
          <Ghost size={40} strokeWidth={1.75} aria-hidden />
        </motion.div>

        <h2 className={styles.title}>
          <GlitchText active>Your Shadow has awakened.</GlitchText>
        </h2>

        <p className={styles.message}>
          {typed}
          {!done && <span className={styles.caret} aria-hidden />}
        </p>

        <motion.button
          type="button"
          className={styles.cta}
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: done ? 1 : 0.4 }}
          transition={{ duration: 0.3 }}
        >
          Face your Shadow
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
