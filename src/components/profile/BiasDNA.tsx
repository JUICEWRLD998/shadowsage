"use client";

/**
 * BiasDNA — the user's cognitive fingerprint as a double helix.
 *
 * Two sine-wave strands with one rung per detected bias, each rung colored by
 * that bias's severity tier (dnaColor). The helix draws itself in and breathes;
 * reduced-motion users get the same static structure (the global animation
 * kill-switch in globals.css handles it).
 *
 * Pure presentational — give it the BiasProfile[] from useBiasProfile.
 */

import type { BiasProfile } from "@/types";
import styles from "./BiasDNA.module.css";

interface BiasDNAProps {
  profiles: BiasProfile[];
}

const W = 220;
const PAD_Y = 28;
const ROW = 46; // vertical gap between rungs
const AMP = 64; // strand amplitude
const CX = W / 2;
const TURNS = 0.9; // helix twists across its height

export function BiasDNA({ profiles }: BiasDNAProps) {
  // Always render at least a few base-pairs so the helix reads as a helix.
  const count = Math.max(profiles.length, 6);
  const height = PAD_Y * 2 + (count - 1) * ROW;

  const nodes = Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0 : i / (count - 1);
    const y = PAD_Y + i * ROW;
    const angle = t * TURNS * Math.PI * 2;
    const dx = Math.sin(angle) * AMP;
    const x1 = CX + dx;
    const x2 = CX - dx;
    // Front strand has the larger x when sin>0 — fade the back node slightly.
    const frontLeft = dx < 0;
    const bias = profiles[i];
    return { i, y, x1, x2, frontLeft, bias, t };
  });

  // Build smooth strand paths through each strand's points.
  const strand = (key: "x1" | "x2") =>
    nodes
      .map((n, idx) => `${idx === 0 ? "M" : "L"} ${n[key].toFixed(1)} ${n.y}`)
      .join(" ");

  return (
    <div className={styles.wrap}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${W} ${height}`}
        role="img"
        aria-label="Your bias DNA — a double helix with one rung per detected bias"
        preserveAspectRatio="xMidYMid meet"
      >
        <path className={styles.backbone} d={strand("x2")} />
        <path className={styles.backbone} d={strand("x1")} />

        {nodes.map((n) => {
          const color = n.bias?.dnaColor ?? "var(--n-700)";
          const active = Boolean(n.bias);
          return (
            <g
              key={n.i}
              className={styles.rung}
              style={{ animationDelay: `${n.i * 0.09}s` }}
            >
              <line
                x1={n.x1}
                y1={n.y}
                x2={n.x2}
                y2={n.y}
                stroke={color}
                strokeWidth={active ? 3 : 1.5}
                strokeOpacity={active ? 0.7 : 0.25}
                strokeLinecap="round"
              />
              <circle
                cx={n.x1}
                cy={n.y}
                r={active ? 6 : 3.5}
                fill={color}
                fillOpacity={active ? 1 : 0.4}
              />
              <circle
                cx={n.x2}
                cy={n.y}
                r={active ? 6 : 3.5}
                fill={color}
                fillOpacity={active ? 1 : 0.4}
              />
            </g>
          );
        })}
      </svg>

      <p className={styles.caption}>
        {profiles.length > 0
          ? `${profiles.length} ${profiles.length === 1 ? "bias" : "biases"} encoded`
          : "Strand forming…"}
      </p>
    </div>
  );
}
