import type { Metadata } from "next";
import { CallsView } from "@/components/calls/CallsView";

export const metadata: Metadata = {
  title: "Your Calls",
  description:
    "Every World Cup 2026 prediction you've made, ready for local ShadowSage analysis.",
};

export default function CallsPage() {
  return <CallsView />;
}
