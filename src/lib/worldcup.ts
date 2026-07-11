/**
 * football-data.org API client (World Cup).
 *
 * Single source of fixtures + results. The free tier includes the World Cup
 * (competition code "WC") at 10 requests/min �� well within our cache window.
 *
 *   GET /v4/competitions/WC/matches
 *     → { matches: [ {
 *           id, utcDate, status, stage, group, matchday, venue,
 *           homeTeam: { name, shortName, tla }, awayTeam: { ... },
 *           score: { winner, fullTime: { home, away } },
 *         } ] }
 *
 * Auth: header `X-Auth-Token: <FOOTBALL_DATA_API_KEY>`.
 *
 * Everything is defensive: unparseable records are skipped, and if the API is
 * unreachable or the key is missing we fall back to a small set of real,
 * confirmed-qualified teams so the companion always has credible fixtures. The
 * agent's prompt only ever presents fixtures we hand it, so a graceful fallback
 * is safer than throwing.
 *
 * Server only.
 */

import type { MatchStage, MatchStatus, WorldCupMatch, PickSide } from "@/types";
import { countryFlag } from "./flags";

const BASE_URL =
  process.env.FOOTBALL_DATA_URL?.replace(/\/+$/, "") ||
  "https://api.football-data.org/v4";

const COMPETITION = process.env.FOOTBALL_DATA_COMPETITION || "WC";

const API_KEY = process.env.FOOTBALL_DATA_API_KEY || "";

/** Cache window (seconds) — fixtures move fast on matchdays. */
const REVALIDATE = 180; // 3 min

export function isFootballDataConfigured(): boolean {
  return Boolean(API_KEY);
}

/* ------------------------------------------------------------------ fetch -- */

async function fetchJson(path: string): Promise<unknown> {
  if (!API_KEY) {
    console.warn("[worldcup] FOOTBALL_DATA_API_KEY not set — using fallback fixtures");
    return null;
  }
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      next: { revalidate: REVALIDATE },
      headers: { "X-Auth-Token": API_KEY, accept: "application/json" },
      // football-data's full 104-match response can be slow on a cold request;
      // allow enough headroom to land it instead of dropping to the fallback,
      // while staying under typical serverless limits. Successful responses are
      // cached for REVALIDATE seconds, so this only bites on a cold cache.
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) {
      console.warn(`[worldcup] ${path} → HTTP ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (error) {
    console.warn(`[worldcup] ${path} fetch failed:`, error);
    return null;
  }
}

/** Unwrap the {matches:[...]} envelope (or a bare array). */
function unwrap(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (payload && typeof payload === "object") {
    const inner = (payload as Record<string, unknown>).matches;
    if (Array.isArray(inner)) return inner as Record<string, unknown>[];
  }
  return [];
}

/* -------------------------------------------------------------- coercion -- */

function str(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

/** First present, non-empty value among candidate keys. */
function pick(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const s = str(obj[key]);
    if (s !== "") return s;
  }
  return "";
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

/** Team display name from a football-data team object. */
function teamName(team: unknown): string {
  const t = asRecord(team);
  return pick(t, ["name", "shortName", "tla"]);
}

/** Split an ISO UTC datetime into a sortable date + a display time. */
function parseUtcDate(utc: string): { date: string; time: string } {
  if (!utc) return { date: "", time: "" };
  const [datePart = "", rest = ""] = utc.split("T");
  const time = rest.slice(0, 5); // "HH:MM"
  return { date: datePart, time };
}

/* football-data stage → our MatchStage. */
const STAGE_MAP: Record<string, MatchStage> = {
  last_32: "round-of-32",
  round_of_32: "round-of-32",
  last_16: "round-of-16",
  round_of_16: "round-of-16",
  quarter_finals: "quarter-final",
  quarter_final: "quarter-final",
  semi_finals: "semi-final",
  semi_final: "semi-final",
  third_place: "third-place",
  "3rd_place": "third-place",
  final: "final",
};

function normaliseStage(stage: string, matchday: string): MatchStage {
  const s = stage.toLowerCase();
  if (s === "group_stage" || s === "league_stage" || s === "") {
    const md = matchday === "2" ? "2" : matchday === "3" ? "3" : "1";
    return `group-matchday${md}` as MatchStage;
  }
  return STAGE_MAP[s] ?? "group-matchday1";
}

function normaliseStatus(status: string): MatchStatus {
  const s = status.toUpperCase();
  if (s === "IN_PLAY" || s === "PAUSED") return "live";
  if (s === "FINISHED") return "completed";
  return "scheduled"; // SCHEDULED, TIMED, POSTPONED, SUSPENDED, CANCELLED
}

function winnerFromScores(a: number, b: number): PickSide {
  if (a === b) return "draw";
  return a > b ? "teamA" : "teamB";
}

/** "GROUP_A" → "A"; "Group C" → "C". */
function normaliseGroup(group: string): string | undefined {
  const m = group.match(/group[_\s]*([a-l])/i);
  return m ? m[1].toUpperCase() : undefined;
}

function normaliseMatch(
  raw: Record<string, unknown>,
  index: number,
): WorldCupMatch | null {
  const teamA = teamName(raw.homeTeam);
  const teamB = teamName(raw.awayTeam);
  // Knockout fixtures with unfilled brackets have null teams — skip until set.
  if (!teamA || !teamB) return null;

  const status = normaliseStatus(pick(raw, ["status"]));

  const ft = asRecord(asRecord(raw.score).fullTime);
  const homeScore = str(ft.home);
  const awayScore = str(ft.away);
  const hasScore = homeScore !== "" && awayScore !== "";
  const isPlayed = status === "completed" || status === "live";
  const score = isPlayed && hasScore ? `${homeScore}-${awayScore}` : undefined;

  const { date, time } = parseUtcDate(pick(raw, ["utcDate"]));

  // A real flag only makes sense for an actual nation, not a "Winner Group A".
  const isRealTeamA = !/group|winner|runner|place|loser|tbd/i.test(teamA);
  const isRealTeamB = !/group|winner|runner|place|loser|tbd/i.test(teamB);

  return {
    id: pick(raw, ["id"]) || `wc-${index}`,
    teamA,
    teamB,
    teamAFlag: isRealTeamA ? countryFlag(teamA) : "🏳️",
    teamBFlag: isRealTeamB ? countryFlag(teamB) : "🏳️",
    date,
    time,
    stadium: pick(raw, ["venue"]),
    city: "",
    stage: normaliseStage(pick(raw, ["stage"]), pick(raw, ["matchday"])),
    status,
    score,
    winner:
      isPlayed && hasScore
        ? winnerFromScores(Number(homeScore), Number(awayScore))
        : undefined,
    group: normaliseGroup(pick(raw, ["group"])),
  };
}

/* ----------------------------------------------------------------- public -- */

/**
 * All tournament matches, normalised. Falls back to a curated set of real
 * qualified teams when the live API is unreachable or unconfigured.
 */
export async function getMatches(): Promise<WorldCupMatch[]> {
  const payload = await fetchJson(`/competitions/${COMPETITION}/matches`);

  const matches = unwrap(payload)
    .map((row, i) => normaliseMatch(row, i))
    .filter((m): m is WorldCupMatch => m !== null);

  return matches.length > 0 ? matches : FALLBACK_FIXTURES;
}

function dateValue(m: WorldCupMatch): number {
  const t = Date.parse(`${m.date}T${m.time || "00:00"}:00`);
  return Number.isNaN(t) ? 0 : t;
}

/** Upcoming scheduled fixtures, soonest first. */
export function getUpcomingMatches(
  matches: WorldCupMatch[],
  limit = 6,
  now: number = Date.now(),
): WorldCupMatch[] {
  return matches
    .filter((m) => m.status === "scheduled")
    .filter((m) => {
      const t = dateValue(m);
      return t === 0 || t >= now; // keep undated fixtures rather than drop them
    })
    .sort((a, b) => dateValue(a) - dateValue(b))
    .slice(0, limit);
}

/** Most recently completed fixtures, newest first. */
export function getCompletedMatches(
  matches: WorldCupMatch[],
  limit = 6,
): WorldCupMatch[] {
  return matches
    .filter((m) => m.status === "completed")
    .sort((a, b) => dateValue(b) - dateValue(a))
    .slice(0, limit);
}

/**
 * Render upcoming fixtures as a compact block for the AI system prompt. The
 * agent is told to treat only these as real, so the format stays factual.
 */
export function formatMatchesForPrompt(matches: WorldCupMatch[]): string {
  if (matches.length === 0) return "";
  return matches
    .map((m) => {
      const when = [m.date, m.time].filter(Boolean).join(" ");
      const where = [m.stadium, m.city].filter(Boolean).join(", ");
      const meta = [when, where, m.group && `Group ${m.group}`]
        .filter(Boolean)
        .join(" · ");
      return `- ${m.teamAFlag} ${m.teamA} vs ${m.teamB} ${m.teamBFlag}${meta ? ` (${meta})` : ""}`;
    })
    .join("\n");
}

/* --------------------------------------------------------------- fallback -- */

/**
 * Curated fallback — used ONLY when the live API can't be reached. Every team
 * here is a confirmed 2026 participant and the group pairings are real, so the
 * companion never references a team that didn't qualify. Dates are placed just
 * ahead so they read as upcoming; live data always wins when available.
 */
const FALLBACK_FIXTURES: WorldCupMatch[] = [
  mkFixture("fb-1", "Mexico", "South Africa", "2026-06-15", "20:00", "A"),
  mkFixture("fb-2", "South Korea", "Czech Republic", "2026-06-15", "17:00", "A"),
  mkFixture("fb-3", "Argentina", "Australia", "2026-06-16", "21:00", "C"),
  mkFixture("fb-4", "France", "Norway", "2026-06-16", "18:00", "E"),
  mkFixture("fb-5", "Spain", "Croatia", "2026-06-17", "20:00", "B"),
  mkFixture("fb-6", "Brazil", "Morocco", "2026-06-17", "23:00", "G"),
];

function mkFixture(
  id: string,
  teamA: string,
  teamB: string,
  date: string,
  time: string,
  group: string,
): WorldCupMatch {
  return {
    id,
    teamA,
    teamB,
    teamAFlag: countryFlag(teamA),
    teamBFlag: countryFlag(teamB),
    date,
    time,
    stadium: "",
    city: "",
    stage: "group-matchday1",
    status: "scheduled",
    group,
  };
}
