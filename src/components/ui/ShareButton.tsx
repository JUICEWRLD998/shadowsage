"use client";

/**
 * ShareButton — exports a target DOM node (a ref) to PNG and shares/downloads it.
 *
 * Give it a ref to the element you want captured (the Shadow Report Card). It
 * handles the busy/done states and the native-share-vs-download fork. Designed to
 * sit outside the captured node so it never appears in the image.
 */

import { useState, type RefObject } from "react";
import { Check, Download, Loader2, Share2 } from "lucide-react";
import { shareNodeAsImage } from "@/lib/imageExport";
import styles from "./ShareButton.module.css";

interface ShareButtonProps {
  targetRef: RefObject<HTMLElement | null>;
  filename?: string;
  title?: string;
  text?: string;
  label?: string;
  className?: string;
}

type State = "idle" | "working" | "done" | "error";

export function ShareButton({
  targetRef,
  filename = "shadow-report.png",
  title = "My Shadow Report Card",
  text = "My Shadow read my World Cup predictions and this is the verdict.",
  label = "Share report card",
  className,
}: ShareButtonProps) {
  const [state, setState] = useState<State>("idle");

  async function handleClick() {
    if (!targetRef.current || state === "working") return;
    setState("working");
    try {
      await shareNodeAsImage(targetRef.current, { filename, title, text });
      setState("done");
      setTimeout(() => setState("idle"), 2200);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2600);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === "working"}
      className={`${styles.btn} ${className ?? ""}`}
      aria-busy={state === "working"}
    >
      {state === "working" ? (
        <Loader2 size={16} className={styles.spin} aria-hidden />
      ) : state === "done" ? (
        <Check size={16} aria-hidden />
      ) : (
        <Share2 size={16} aria-hidden />
      )}
      <span>
        {state === "working"
          ? "Rendering…"
          : state === "done"
            ? "Saved!"
            : state === "error"
              ? "Try again"
              : label}
      </span>
      {state === "idle" && <Download size={14} className={styles.hint} aria-hidden />}
    </button>
  );
}
