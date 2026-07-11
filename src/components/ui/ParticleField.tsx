"use client";

/**
 * ParticleField — a violet particle burst for the Shadow Awakening (Phase 3).
 *
 * On mount the cloud erupts outward from the centre (eased scale-in) and then
 * settles into a slow rotating drift, fading to a steady glow. Built as a
 * default export so it can be code-split with next/dynamic and dropped into the
 * awakening overlay. Pure atmosphere — pointer-events stay off, DPR is capped.
 *
 * Wire-up (Phase 3): mount briefly when the emergence fires, ideally alongside
 * <ScreenGlitch active /> and the Shadow's first <GlitchText> line.
 */

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const COUNT = 1400;
const SPREAD = 6;

function build() {
  const positions = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    const r = SPREAD * Math.cbrt(Math.random());
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  return positions;
}

function Burst() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(build, []);

  useFrame((state, delta) => {
    const pts = ref.current;
    if (!pts) return;
    pts.rotation.y += delta * 0.15;
    pts.rotation.x += delta * 0.04;
    // Eased outward burst over ~1.2s, then hold.
    const t = Math.min(state.clock.elapsedTime / 1.2, 1);
    const scale = 0.15 + (1 - Math.pow(1 - t, 3)) * 0.85;
    pts.scale.setScalar(scale);
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#a855f7"
        size={0.04}
        sizeAttenuation
        transparent
        opacity={0.85}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default function ParticleField() {
  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 60 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <Burst />
    </Canvas>
  );
}
