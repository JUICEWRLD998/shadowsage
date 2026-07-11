import type { Metadata } from "next";
import { Leaderboard } from "@/components/leaderboard/Leaderboard";

export const metadata: Metadata = {
  title: "Shadow Leaderboard",
  description:
    "Whose twin is sharpest? Every Shadow is forged from a real predictor's blind spots — ranked by how often each out-calls its human.",
};

export default function LeaderboardPage() {
  return <Leaderboard />;
}
