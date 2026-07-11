"use client";

/**
 * A single chat turn. Three visual identities:
 *   - user      → warm blue, right-aligned (the protagonist)
 *   - assistant → neutral glass, left-aligned (the friendly companion)
 *   - shadow    → cold violet + mono type, left-aligned (reserved for Phase 3)
 *
 * When `pending` is true and there's no text yet, it renders an animated
 * "thinking" indicator instead of an empty bubble.
 */

import { Ghost, Bot } from "lucide-react";
import type { ChatRole } from "@/types";
import styles from "./MessageBubble.module.css";

interface MessageBubbleProps {
  role: ChatRole;
  content: string;
  pending?: boolean;
  /** Show a blinking caret after the text while this message streams in. */
  streaming?: boolean;
  /** Continuation of a same-role run — hides the avatar + label and tucks in. */
  grouped?: boolean;
}

const ROLE_LABEL: Record<ChatRole, string> = {
  user: "You",
  assistant: "ShadowPundit",
  shadow: "The Shadow",
};

export function MessageBubble({
  role,
  content,
  pending = false,
  streaming = false,
  grouped = false,
}: MessageBubbleProps) {
  const showThinking = pending && content.length === 0;

  return (
    <div
      className={`${styles.row} ${styles[role]} ${grouped ? styles.grouped : ""}`}
      data-role={role}
    >
      {role !== "user" &&
        (grouped ? (
          <span className={styles.avatarSpacer} aria-hidden />
        ) : (
          <span className={styles.avatar} aria-hidden>
            {role === "shadow" ? <Ghost size={16} /> : <Bot size={16} />}
          </span>
        ))}

      <div className={styles.stack}>
        {!grouped && <span className={styles.label}>{ROLE_LABEL[role]}</span>}
        <div className={`${styles.bubble} glass`}>
          {showThinking ? (
            <span className={styles.thinking} aria-label="Thinking">
              <span />
              <span />
              <span />
            </span>
          ) : (
            <p className={styles.text}>
              {content}
              {streaming && <span className={styles.caret} aria-hidden />}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
