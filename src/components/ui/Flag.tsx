/**
 * Flag — a country flag that renders identically on every OS and browser.
 *
 * Emoji flags are unreliable: Windows' system emoji font omits them entirely,
 * so Chrome/Edge show a bare two-letter code ("AR") instead of 🇦🇷. We sidestep
 * that by rendering an SVG from flagcdn, resolving the country code from the
 * team name via `flagCode`. Unknown teams / knockout placeholders fall back to
 * the neutral emoji so nothing ever breaks.
 *
 * Pure presentational (no hooks) — safe in server or client components.
 */

import { flagCode } from "@/lib/flags";
import styles from "./Flag.module.css";

interface FlagProps {
  /** Team / country name, e.g. "Argentina". */
  name: string;
  /** Flag width in px (height follows the 4:3 flag ratio). Default 22. */
  size?: number;
  className?: string;
}

export function Flag({ name, size = 22, className }: FlagProps) {
  const code = flagCode(name);

  // No reliable code (e.g. "Winner Group A") — show a neutral placeholder.
  if (!code) {
    return (
      <span
        className={`${styles.fallback} ${className ?? ""}`}
        style={{ width: size, height: Math.round((size * 3) / 4) }}
        aria-hidden
      >
        🏳️
      </span>
    );
  }

  return (
    <img
      className={`${styles.flag} ${className ?? ""}`}
      src={`https://flagcdn.com/${code}.svg`}
      width={size}
      height={Math.round((size * 3) / 4)}
      alt=""
      aria-hidden
      loading="lazy"
      decoding="async"
    />
  );
}
