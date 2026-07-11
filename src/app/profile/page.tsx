import type { Metadata } from "next";
import { ProfileView } from "@/components/profile/ProfileView";

export const metadata: Metadata = {
  title: "Your Bias DNA",
  description:
    "The cognitive fingerprint your Shadow reads — every bias detected from your World Cup 2026 predictions.",
};

export default function ProfilePage() {
  return <ProfileView />;
}
