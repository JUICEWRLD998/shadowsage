"use client";

/**
 * HeroBackground — lazy, capability-gated mount point for the WebGL hero.
 *
 * Loads HeroCanvas only on capable, non-touch, wide viewports and only when the
 * user hasn't asked for reduced motion. Otherwise it renders nothing and the
 * section's existing `.mesh-bg` gradient remains the (perfectly good) static
 * backdrop. The 3D bundle is code-split via next/dynamic and never SSR'd, so it
 * stays out of the initial payload.
 */

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import styles from "./HeroBackground.module.css";

const HeroCanvas = dynamic(() => import("./HeroCanvas"), { ssr: false });

export function HeroBackground() {
  const reduceMotion = useReducedMotion();
  const [capable, setCapable] = useState(false);

  useEffect(() => {
    setCapable(
      window.matchMedia("(min-width: 768px) and (pointer: fine)").matches,
    );
  }, []);

  if (reduceMotion || !capable) return null;

  return (
    <div className={styles.wrap} aria-hidden>
      <ErrorBoundary>
        <HeroCanvas />
      </ErrorBoundary>
    </div>
  );
}
