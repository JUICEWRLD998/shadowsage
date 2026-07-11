"use client";

/**
 * Sidebar — the chat page's context rail.
 *
 * One focused section: upcoming fixtures (football-data.org via
 * /api/matches). The user's prediction history lives on its own /calls page now,
 * so this rail stays single-purpose and uncluttered beside the conversation.
 *
 * Responsive behaviour:
 *   - Desktop (>1024px): a static rail beside the chat.
 *   - Mobile (≤1024px): the rail is an off-canvas drawer. A floating "Fixtures"
 *     button opens it over the chat; a backdrop / Escape / the × closes it. The
 *     chat keeps the full screen until the user asks for context.
 */

import { useEffect, useState } from "react";
import { Calendar, X } from "lucide-react";
import { useUpcomingMatches } from "@/hooks/useWorldCup";
import { MatchCard } from "@/components/arena/MatchCard";
import { Stagger, StaggerItem } from "@/components/ui/Reveal";
import styles from "./Sidebar.module.css";

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const { matches, source, loading: matchesLoading } = useUpcomingMatches(8);

  // Close the mobile drawer on Escape for accessibility.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Mobile-only toggle — hidden on desktop via CSS */}
      <button
        type="button"
        className={styles.fab}
        onClick={() => setOpen(true)}
        aria-label="Show upcoming fixtures"
        aria-expanded={open}
        aria-controls="context-rail"
      >
        <Calendar size={16} aria-hidden="true" />
        <span>Fixtures</span>
      </button>

      {/* Mobile-only backdrop */}
      {open && (
        <div
          className={styles.backdrop}
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        id="context-rail"
        className={styles.sidebar}
        data-open={open}
        aria-label="World Cup context"
      >
        <button
          type="button"
          className={styles.close}
          onClick={() => setOpen(false)}
          aria-label="Close panel"
        >
          <X size={18} aria-hidden="true" />
        </button>

        <section className={styles.block}>
          <header className={styles.blockHead}>
            <h3 className={styles.title}>Upcoming fixtures</h3>
            {!matchesLoading && matches.length > 0 && (
              <span className={styles.count}>
                {source === "fallback" ? "seeded" : matches.length}
              </span>
            )}
          </header>
          {matchesLoading ? (
            <div className={styles.list}>
              <SkeletonRows count={5} />
            </div>
          ) : matches.length > 0 ? (
            <Stagger className={styles.list} stagger={0.06}>
              {matches.map((m) => (
                <StaggerItem key={m.id}>
                  <MatchCard match={m} />
                </StaggerItem>
              ))}
            </Stagger>
          ) : (
            <p className={styles.empty}>No fixtures to show right now.</p>
          )}
        </section>
      </aside>
    </>
  );
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.skeleton} />
      ))}
    </>
  );
}
