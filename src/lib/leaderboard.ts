/**
 * Leaderboard — the cross-user rivalry board.
 *
 * Each signed-in wallet writes a single summary row to a GLOBAL `leaderboard`
 * namespace (one row per user, latest-wins by address), so the board ranks real
 * connected users against each other — the "memory at scale" proof. A fixed
 * roster of seeded rivals pads the field so it always looks alive in a demo with
 * only a handful of real users.
 *
 * The rival roster is deterministic (no randomness): the same seed every load,
 * so the board is stable across refreshes and demos. Each real row is computed
 * from that user's actual predictions, Shadow record, and biases.
 *
 * Server only (consumed by /api/leaderboard).
 */

import type { BiasType, LeaderboardEntry } from "@/types";

/** The user's own numbers, distilled from wallet-scoped memory. */
export interface UserStats {
  userAccuracy: number; // %
  shadowAccuracy: number; // %
  totalPredictions: number;
  roastCount: number;
  topBias: BiasType;
  defianceRate: number; // %
}

/**
 * Seeded rivals — a believable field the real user gets ranked against. Hand-
 * tuned so the spread feels organic (a couple of sharp Shadows up top, some
 * roasted stragglers below). Names are anonymous + memorable, the way the spec
 * wants them.
 */
const RIVALS: Omit<LeaderboardEntry, "rank">[] = [
  { userId: "r-aurelius", displayName: "Stoic Sentinel", shadowAccuracy: 81, userAccuracy: 47, totalPredictions: 34, roastCount: 18, topBias: "star_player_bias", defianceRate: 22 },
  { userId: "r-nostromo", displayName: "Reckless Captain", shadowAccuracy: 73, userAccuracy: 58, totalPredictions: 27, roastCount: 11, topBias: "underdog_syndrome", defianceRate: 44 },
  { userId: "r-pandora", displayName: "Curious Box", shadowAccuracy: 62, userAccuracy: 59, totalPredictions: 30, roastCount: 9, topBias: "bandwagon_bias", defianceRate: 41 },
  { userId: "r-sisyphus", displayName: "Eternal Optimist", shadowAccuracy: 49, userAccuracy: 66, totalPredictions: 33, roastCount: 6, topBias: "group_stage_fatigue", defianceRate: 57 },
];

/* --------------------------------------------------- anonymous identity -- */

const NAME_ADJECTIVES = [
  "Stoic", "Reckless", "Cunning", "Doomed", "Fearless", "Restless",
  "Cold", "Burning", "Silent", "Iron", "Crimson", "Phantom",
  "Wandering", "Vengeful", "Lucid", "Feral",
] as const;
const NAME_NOUNS = [
  "Sentinel", "Oracle", "Captain", "Prophet", "Gambit", "Specter",
  "Analyst", "Tactician", "Outsider", "Visionary", "Maverick", "Scout",
  "Diviner", "Strategist", "Contrarian", "Augur",
] as const;

/** Stable hash of a string → non-negative int (FNV-1a). */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * A deterministic, anonymous display name for a wallet address — same address
 * always yields the same name, with a 2-char address suffix to disambiguate
 * collisions. Keeps the board readable without exposing raw addresses.
 */
export function displayNameForAddress(address: string): string {
  const h = hashString(address.toLowerCase());
  const adj = NAME_ADJECTIVES[h % NAME_ADJECTIVES.length];
  const noun = NAME_NOUNS[(h >> 8) % NAME_NOUNS.length];
  const suffix = address.toLowerCase().replace(/^0x/, "").slice(-2);
  return `${adj} ${noun} ${suffix}`;
}

/* ----------------------------------------------------- row serialization -- */

/** Build a real user's row from their live stats. */
export function statsToEntry(
  address: string,
  stats: UserStats,
): Omit<LeaderboardEntry, "rank"> {
  return {
    userId: address.toLowerCase(),
    displayName: displayNameForAddress(address),
    shadowAccuracy: stats.shadowAccuracy,
    userAccuracy: stats.userAccuracy,
    totalPredictions: stats.totalPredictions,
    roastCount: stats.roastCount,
    topBias: stats.topBias,
    defianceRate: stats.defianceRate,
  };
}

/** Serialize a user's row into a `leaderboard` memory block (one per user). */
export function formatLeaderboardRow(
  address: string,
  stats: UserStats,
  updatedAt: string,
): string {
  return [
    `LEADERBOARD [${updatedAt}]`,
    `User: ${address.toLowerCase()}`,
    `ShadowAccuracy: ${stats.shadowAccuracy}`,
    `UserAccuracy: ${stats.userAccuracy}`,
    `TotalPredictions: ${stats.totalPredictions}`,
    `RoastCount: ${stats.roastCount}`,
    `TopBias: ${stats.topBias}`,
    `DefianceRate: ${stats.defianceRate}`,
  ].join("\n");
}

function rowField(block: string, label: string): string {
  const m = block.match(new RegExp(`^${label}:\\s*(.+)$`, "mi"));
  return m ? m[1].trim() : "";
}

const BIAS_SLUGS = new Set<BiasType>([
  "recency_bias", "home_team_bias", "underdog_syndrome", "group_stage_fatigue",
  "knockout_panic", "continental_bias", "star_player_bias", "revenge_picking",
  "bandwagon_bias", "time_of_day_bias",
]);

interface ParsedRow {
  address: string;
  updatedAt: string;
  entry: Omit<LeaderboardEntry, "rank">;
}

/** Parse one stored `LEADERBOARD [...]` block back into a row, or null. */
export function parseLeaderboardRow(raw: string): ParsedRow | null {
  if (!/^LEADERBOARD \[/im.test(raw)) return null;
  const address = rowField(raw, "User").toLowerCase();
  if (!address) return null;

  const num = (label: string) => {
    const n = Number(rowField(raw, label));
    return Number.isFinite(n) ? Math.round(n) : 0;
  };
  const biasRaw = rowField(raw, "TopBias") as BiasType;
  const topBias: BiasType = BIAS_SLUGS.has(biasRaw) ? biasRaw : "recency_bias";

  return {
    address,
    updatedAt: raw.match(/^LEADERBOARD \[([^\]]+)\]/im)?.[1] ?? "",
    entry: {
      userId: address,
      displayName: displayNameForAddress(address),
      shadowAccuracy: num("ShadowAccuracy"),
      userAccuracy: num("UserAccuracy"),
      totalPredictions: num("TotalPredictions"),
      roastCount: num("RoastCount"),
      topBias,
      defianceRate: num("DefianceRate"),
    },
  };
}

/**
 * Assemble the full board from recalled real rows + seeded filler.
 *
 * `rows` are raw `leaderboard` memory blocks (possibly several per user across
 * updates); we keep the newest per address. `viewerAddress` marks the caller's
 * own row with `isYou`. Seeded rivals pad the field so it always looks alive.
 *
 * Ranked by the Shadow's accuracy — the board celebrates the sharpest twins —
 * with total predictions as the tiebreak so an active user edges a dormant one.
 */
export function buildLeaderboard(
  rows: string[],
  viewerAddress?: string | null,
): LeaderboardEntry[] {
  const viewer = viewerAddress?.toLowerCase() ?? null;

  // Newest row per address wins.
  const byAddress = new Map<string, ParsedRow>();
  for (const raw of rows) {
    const parsed = parseLeaderboardRow(raw);
    if (!parsed) continue;
    const existing = byAddress.get(parsed.address);
    if (!existing || parsed.updatedAt > existing.updatedAt) {
      byAddress.set(parsed.address, parsed);
    }
  }

  const realEntries = [...byAddress.values()].map((r) => ({
    ...r.entry,
    isYou: viewer != null && r.address === viewer,
  }));

  const field: Omit<LeaderboardEntry, "rank">[] = [...RIVALS, ...realEntries];

  return field
    .slice()
    .sort(
      (a, b) =>
        b.shadowAccuracy - a.shadowAccuracy ||
        b.totalPredictions - a.totalPredictions,
    )
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

/** The three category champions the spec calls out. */
export interface LeaderboardCategories {
  sharpestShadow: LeaderboardEntry; // highest shadow accuracy
  mostRoasted: LeaderboardEntry; // highest roast count
  bestDefiance: LeaderboardEntry; // highest defiance rate
}

export function pickCategories(entries: LeaderboardEntry[]): LeaderboardCategories | null {
  if (entries.length === 0) return null;
  const by = (sel: (e: LeaderboardEntry) => number) =>
    entries.reduce((best, e) => (sel(e) > sel(best) ? e : best), entries[0]);
  return {
    sharpestShadow: by((e) => e.shadowAccuracy),
    mostRoasted: by((e) => e.roastCount),
    bestDefiance: by((e) => e.defianceRate),
  };
}
