"use client";

/**
 * Route transition wrapper. In the App Router, template.tsx re-mounts on every
 * navigation, so a fresh enter animation plays each time.
 *
 * Layout note: this sits between `.app-shell` (a flex column) and each page's
 * `<main>`. We make it a transparent flex pass-through (grow + min-height:0) so
 * the chat page's full-height/internal-scroll layout is preserved exactly. Only
 * opacity animates — no transform — so nothing about sizing or scroll shifts.
 *
 * Honours reduced motion (renders the same wrapper with no animation).
 */

import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { DURATION, EASE } from "@/lib/motion";

const passthrough = {
  display: "flex",
  flexDirection: "column",
  flexGrow: 1,
  minHeight: 0,
} as const;

export default function Template({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const pathname = usePathname();

  if (reduceMotion) return <div style={passthrough}>{children}</div>;

  return (
    <motion.div
      key={pathname}
      style={passthrough}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: DURATION.base, ease: EASE.outQuart }}
    >
      {children}
    </motion.div>
  );
}
