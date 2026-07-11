import type { Metadata } from "next";
import { PredictionArena } from "@/components/arena/PredictionArena";

export const metadata: Metadata = {
  title: "The Arena",
  description:
    "Your World Cup 2026 predictions, scored against real results — you versus your Shadow.",
};

export default function ArenaPage() {
  return <PredictionArena />;
}
