"use client";

/**
 * HeroCanvas — the landing page's living background.
 *
 * A drifting particle cloud that fades from YOU-blue (left) to SHADOW-violet
 * (right), rotating slowly and parallax-tilting toward the cursor. Rendered via
 * React Three Fiber. Lazy-loaded by HeroBackground (never SSR'd), capped DPR,
 * and only mounted on capable desktops — so it's pure atmosphere, never a tax.
 *
 * Default export so it can be code-split with next/dynamic.
 */

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const COUNT = 1600;
const RADIUS = 5;

function buildField() {
  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const you = new THREE.Color("#5a8cff"); // warm blue
  const shadow = new THREE.Color("#a855f7"); // cold violet

  for (let i = 0; i < COUNT; i++) {
    // Even-ish distribution inside a sphere.
    const r = RADIUS * Math.cbrt(Math.random());
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const x = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3] = x;
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    // Colour by horizontal position: left = blue, right = violet.
    const t = THREE.MathUtils.clamp((x / RADIUS + 1) / 2, 0, 1);
    const c = you.clone().lerp(shadow, t);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  return { positions, colors };
}

function ParticleField() {
  const ref = useRef<THREE.Points>(null);
  const { positions, colors } = useMemo(buildField, []);

  useFrame((state, delta) => {
    const pts = ref.current;
    if (!pts) return;
    // Slow constant drift.
    pts.rotation.y += delta * 0.025;
    // Ease toward a cursor-driven tilt (pointer is normalised -1..1).
    pts.rotation.x = THREE.MathUtils.lerp(pts.rotation.x, state.pointer.y * 0.12, 0.04);
    pts.rotation.z = THREE.MathUtils.lerp(pts.rotation.z, state.pointer.x * 0.06, 0.04);
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        size={0.035}
        sizeAttenuation
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default function HeroCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 60 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <ParticleField />
    </Canvas>
  );
}
