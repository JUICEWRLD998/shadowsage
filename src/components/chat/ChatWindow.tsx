"use client";

/**
 * The conversation surface. Owns the AI SDK v6 `useChat` instance and renders
 * the running transcript + composer.
 *
 * v6 notes (these tripped up the old plan, which predates the UIMessage model):
 *   - useChat no longer hands you `input`/`handleSubmit`. You drive it with
 *     `sendMessage({ text })` and manage the draft yourself (ChatInput does).
 *   - Message content lives in `message.parts`, not `message.content`. We
 *     flatten the text parts to a string for rendering.
 *   - `status` is "submitted" → "streaming" → "ready" (or "error").
 */

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { AnimatePresence } from "framer-motion";
import { DefaultChatTransport, type UIMessage } from "ai";
import type { ChatRole } from "@/types";
import { useShadowState } from "@/hooks/useShadowState";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { ShadowAwakening } from "./ShadowAwakening";
import { StakePrompt } from "@/components/stake/StakePrompt";
import styles from "./ChatWindow.module.css";

/** localStorage flag so the awakening ceremony plays at most once per browser. */
const AWAKENED_KEY = "sp_shadow_awakened";
const hasAwakened = () =>
  typeof window !== "undefined" && window.localStorage.getItem(AWAKENED_KEY) === "1";
const markAwakened = () => {
  try {
    window.localStorage.setItem(AWAKENED_KEY, "1");
  } catch {
    /* private mode / storage disabled — overlay may replay, harmless */
  }
};

/** A Shadow interjection, anchored to the assistant message it follows. */
interface ShadowTurn {
  content: string;
  pending: boolean;
}

interface QvacStatusResponse {
  configured: boolean;
  modelId: string;
  localOnly: boolean;
  cloudKeysUsed: boolean;
  state: "ready" | "unconfigured";
}

/** Conversation openers shown on the empty state. */
const SUGGESTIONS = [
  "Who are the favourites to win the World Cup this year?",
  "Brazil vs Croatia — I'm backing Brazil to win 3–1, Neymar to lead them. Confidence 9/10.",
  "Which group-stage games should I watch this weekend?",
  "France vs Senegal — I'm backing France to win 3–2, Mbappé to lead them. Confidence 8/10.",
];

/** Collapse a UIMessage's text parts into one string for display. */
function messageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

/** UIMessage roles are user/assistant/system; map to our display roles. */
function displayRole(message: UIMessage): ChatRole | null {
  if (message.role === "user") return "user";
  if (message.role === "assistant") return "assistant";
  return null; // system messages aren't rendered
}

export function ChatWindow() {
  const { messages, sendMessage, status, error, data } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const { emerge, respond } = useShadowState();
  const [qvacStatus, setQvacStatus] = useState<QvacStatusResponse | null>(null);
  const [latestPrediction, setLatestPrediction] = useState<any | null>(null);
  const [showStakePrompt, setShowStakePrompt] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Shadow interjections live outside useChat (which only knows user/assistant),
  // keyed by the assistant message id they follow so they render in-place.
  const [shadowTurns, setShadowTurns] = useState<Record<string, ShadowTurn>>({});
  const [awakening, setAwakening] = useState<{
    message: string;
    anchorId: string;
  } | null>(null);

  // Mirror of the Shadow's active state, readable synchronously inside effects.
  const shadowActiveRef = useRef(false);
  // Assistant message ids already handled, so each turn triggers the Shadow once.
  const processedRef = useRef<Set<string>>(new Set());
  const prevStatusRef = useRef(status);

  const isBusy = status === "submitted" || status === "streaming";
  const isEmpty = messages.length === 0;

  // Show a standalone "thinking" bubble only while we wait for the first token
  // (once streaming begins, the assistant message itself carries the text).
  const awaitingFirstToken = status === "submitted";

  useEffect(() => {
    let active = true;
    fetch("/api/qvac/status")
      .then((res) => res.json())
      .then((data: QvacStatusResponse) => {
        if (active) setQvacStatus(data);
      })
      .catch(() => {
        if (active) {
          setQvacStatus({
            configured: false,
            modelId: "",
            localOnly: true,
            cloudKeysUsed: false,
            state: "unconfigured",
          });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleMessages = useMemo(
    () => messages.filter((m) => displayRole(m) !== null),
    [messages],
  );

  // Keep the latest turn in view as content (or a Shadow interjection) arrives.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [visibleMessages, awaitingFirstToken, shadowTurns]);

  // After the last assistant message, any "thinking" bubble continues that same
  // run — so the assistant's trailing message should not show its meta if a
  // pending bubble follows it.
  const lastVisibleRole =
    visibleMessages.length > 0
      ? displayRole(visibleMessages[visibleMessages.length - 1]!)
      : null;

  /**
   * Runs once after each assistant turn settles. Either spawns the Shadow (the
   * first time the user crosses the emergence threshold) or, once it's awake,
   * lets it interject with a counter-take anchored under that assistant turn.
   */
  const handleAfterTurn = useCallback(
    async (anchorId: string, convo: UIMessage[]) => {
      let active = shadowActiveRef.current;

      if (!active) {
        const { shadow, fresh } = await emerge();
        if (shadow) {
          active = true;
          shadowActiveRef.current = true;
          if (fresh && !hasAwakened()) {
            markAwakened();
            setAwakening({ message: shadow.emergenceMessage, anchorId });
            return; // the ceremony delivers the Shadow's first words
          }
        }
      }

      if (!active) return;

      // Interject: show a thinking bubble, then fill it (or drop it if silent).
      setShadowTurns((t) => ({ ...t, [anchorId]: { content: "", pending: true } }));
      const text = await respond(convo);
      setShadowTurns((t) => {
        if (!text) {
          const next = { ...t };
          delete next[anchorId];
          return next;
        }
        return { ...t, [anchorId]: { content: text, pending: false } };
      });
    },
    [emerge, respond],
  );

  // Detect the streaming→ready transition and trigger the Shadow exactly once.
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;

    const justFinished =
      (prev === "streaming" || prev === "submitted") && status === "ready";
    if (!justFinished) return;

    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant || processedRef.current.has(lastAssistant.id)) return;
    processedRef.current.add(lastAssistant.id);

    void handleAfterTurn(lastAssistant.id, messages);
  }, [status, messages, handleAfterTurn]);

  // Detect prediction data and show stake prompt
  useEffect(() => {
    if (data && Array.isArray(data) && data.length > 0) {
      const predictionData = data.find((d: any) => d.prediction);
      if (predictionData?.prediction && predictionData.prediction !== latestPrediction) {
        setLatestPrediction(predictionData.prediction);
        setShowStakePrompt(true);
      }
    }
  }, [data, latestPrediction]);

  return (
    <section className={styles.window}>
      <div className={styles.scroll} ref={scrollRef}>
        <div className={styles.thread}>
          <QvacStatusBadge status={qvacStatus} />

          {isEmpty ? (
            <EmptyState onPick={(text) => sendMessage({ text })} disabled={isBusy} />
          ) : (
            <>
              <div className={styles.divider} aria-hidden>
                <span>Today</span>
              </div>

              {visibleMessages.map((m, i) => {
                const role = displayRole(m)!;
                const prevRole =
                  i > 0 ? displayRole(visibleMessages[i - 1]!) : null;
                const isLast = i === visibleMessages.length - 1;
                const streaming =
                  isLast && role === "assistant" && status === "streaming";
                // First message of a same-role run shows the avatar + label;
                // grouped continuations hide them and tuck in tighter.
                const grouped = role === prevRole;
                const shadowTurn = shadowTurns[m.id];
                return (
                  <Fragment key={m.id}>
                    <MessageBubble
                      role={role}
                      content={messageText(m)}
                      streaming={streaming}
                      grouped={grouped}
                    />
                    {shadowTurn && (
                      <MessageBubble
                        role="shadow"
                        content={shadowTurn.content}
                        pending={shadowTurn.pending}
                      />
                    )}
                  </Fragment>
                );
              })}
            </>
          )}

          {awaitingFirstToken && (
            <MessageBubble
              role="assistant"
              content=""
              pending
              grouped={lastVisibleRole === "assistant"}
            />
          )}

          {error && (
            <p className={styles.error} role="alert">
              {error.message || "The companion went quiet. Try again in a moment."}
            </p>
          )}

          <div ref={endRef} />
        </div>
      </div>

      <div className={styles.composer}>
        <div className={styles.composerInner}>
          <ChatInput onSend={(text) => sendMessage({ text })} disabled={isBusy} />
        </div>
      </div>

      <AnimatePresence>
        {showStakePrompt && latestPrediction && (
          <StakePrompt
            prediction={latestPrediction}
            onClose={() => setShowStakePrompt(false)}
            onStakeCreated={() => {
              setShowStakePrompt(false);
              // Optionally refresh predictions or stakes
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {awakening && (
          <ShadowAwakening
            message={awakening.message}
            onDismiss={() => {
              // Drop the Shadow's first words into the thread, anchored to the
              // turn that triggered the emergence.
              setShadowTurns((t) => ({
                ...t,
                [awakening.anchorId]: { content: awakening.message, pending: false },
              }));
              setAwakening(null);
            }}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

function QvacStatusBadge({ status }: { status: QvacStatusResponse | null }) {
  const configured = status?.configured === true;
  const label = configured ? "QVAC local" : "QVAC offline";
  const detail = configured
    ? `${status?.modelId || "local model"} · private inference · no cloud AI`
    : "Start local model";

  return (
    <div
      className={styles.qvacStatus}
      data-state={configured ? "ready" : "unconfigured"}
      aria-label={`QVAC status: ${label}`}
    >
      <span className={styles.qvacDot} aria-hidden="true" />
      <span className={styles.qvacLabel}>{label}</span>
      <span className={styles.qvacDetail}>{detail}</span>
    </div>
  );
}

function EmptyState({
  onPick,
  disabled,
}: {
  onPick: (text: string) => void;
  disabled: boolean;
}) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyBadge}>
        <span className={styles.emptyDot} />
        Your companion is listening
      </div>
      <h2 className={styles.emptyTitle}>
        Talk me through your <span className="u-gradient-text">World Cup</span> calls.
      </h2>
      <p className={styles.emptyLede}>
        Make a prediction — who wins, the score, and the reasoning behind it.
        I&apos;ll push back where it&apos;s thin. Every take you make is remembered.
      </p>
      <div className={styles.suggestions}>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            className={styles.suggestion}
            onClick={() => onPick(s)}
            disabled={disabled}
          >
            <span>{s}</span>
            <ArrowUpRight size={15} aria-hidden className={styles.suggestionIcon} />
          </button>
        ))}
      </div>
    </div>
  );
}
