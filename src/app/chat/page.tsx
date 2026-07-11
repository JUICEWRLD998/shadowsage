import type { Metadata } from "next";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { Sidebar } from "@/components/layout/Sidebar";
import styles from "./chat.module.css";

export const metadata: Metadata = {
  title: "Chat",
  description:
    "Talk through your World Cup 2026 predictions with the ShadowSage companion.",
};

export default function ChatPage() {
  return (
    <main className="app-surface">
      <div className={styles.layout}>
        <div className={styles.conversation}>
          <ChatWindow />
        </div>
        <Sidebar />
      </div>
    </main>
  );
}
