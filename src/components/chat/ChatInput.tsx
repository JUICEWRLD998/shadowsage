"use client";

/**
 * The message composer: an auto-growing textarea + send button.
 *
 * Owns only its own draft text. The parent passes `onSend` and the current
 * `disabled` state (true while the model is streaming). Enter sends;
 * Shift+Enter inserts a newline — the expected feel for a chat box.
 */

import {
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Send } from "lucide-react";
import styles from "./ChatInput.module.css";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const MAX_ROWS_PX = 200;

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Make your call… who wins, and why?",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = value.trim().length > 0 && !disabled;

  const resize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_ROWS_PX)}px`;
  };

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
    // Reset the textarea height after clearing.
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.focus();
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={`${styles.shell} glass`}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={value}
          rows={1}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => {
            setValue(e.target.value);
            resize(e.target);
          }}
          onKeyDown={handleKeyDown}
          aria-label="Message"
        />
        <button
          type="submit"
          className={styles.send}
          disabled={!canSend}
          aria-label="Send message"
        >
          <Send size={18} strokeWidth={2.25} />
        </button>
      </div>
      <p className={styles.hint}>
        <kbd>Enter</kbd> to send · <kbd>Shift</kbd>+<kbd>Enter</kbd> for a new line
      </p>
    </form>
  );
}
