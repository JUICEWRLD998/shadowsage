/**
 * football-data.org API client (World Cup).
 *
 * Single source of fixtures + results. The free tier includes the World Cup
 * competition code "WC"; requests stay well within our cache window.
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
 * unreachable or the key is missing we fall back to seeded demo fixtures so the
 * app remains usable. Prompt formatting labels fallback data clearly so the AI
 * does not present seeded fixtures as official schedule data.
 *
 * Server only.
 */

import type {
  MatchDataSource,
  MatchStage,
  MatchStatus,
  PickSide,
  WorldCupMatch,
  WorldCupMatchFeed,
} from "@/types";
import { countryFlag } from "./flags";

/** Cache window (seconds) — fixtures move fast on matchdays. */
const REVALIDATE = 180; // 3 min

interface FootballDataConfig {
  baseUrl: string;
  competition: string;
  season: string;
  apiKey: string;
}

function footballDataConfig(): FootballDataConfig {
  return {
    baseUrl:
      process.env.FOOTBALL_DATA_URL?.replace(/\/+$/, "") ||
      "https://api.football-data.org/v4",
    competition: process.env.FOOTBALL_DATA_COMPETITION || "WC",
    season: process.env.FOOTBALL_DATA_SEASON || "2026",
    apiKey: process.env.FOOTBALL_DATA_API_KEY || "",
  };
}

export function isFootballDataConfigured(): boolean {
  return Boolean(footballDataConfig().apiKey);
}

/* ------------------------------------------------------------------ fetch -- */

interface FetchResult {
  payload: unknown | null;
  reason?: string;
}

function matchesPath(config: FootballDataConfig): string {
  const params = new URLSearchParams();
  if (config.season) params.set("season", config.season);
  const query = params.toString();
  return `/competitions/${config.competition}/matches${query ? `?${query}` : ""}`;
}

async function fetchJson(
  path: string,
  config: FootballDataConfig,
): Promise<FetchResult> {
  if (!config.apiKey) {
    console.warn("[worldcup] FOOTBALL_DATA_API_KEY not set — using fallback fixtures");
    return { payload: null, reason: "FOOTBALL_DATA_API_KEY is missing" };
  }
  try {
    const res = await fetch(`${config.baseUrl}${path}`, {
      next: { revalidate: REVALIDATE },
      headers: { "X-Auth-Token": config.apiKey, accept: "application/json" },
      // football-data's full 104-match response can be slow on a cold request;
      // allow enough headroom to land it instead of dropping to the fallback,
      // while staying under typical serverless limits. Successful responses are
      // cached for REVALIDATE seconds, so this only bites on a cold cache.
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) {
      console.warn(`[worldcup] ${path} → HTTP ${res.status}`);
      return { payload: null, reason: `football-data.org returned HTTP ${res.status}` };
    }
    return { payload: await res.json() };
  } catch (error) {
    console.warn(`[worldcup] ${path} fetch failed:`, error);
    return { payload: null, reason: "football-data.org request failed" };
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
 * All tournament matches, normalised. Falls back to seeded demo fixtures when
 * the live API is unreachable or unconfigured.
 */
export async function getMatchFeed(): Promise<WorldCupMatchFeed> {
  const config = footballDataConfig();
  const fetched = await fetchJson(matchesPath(config), config);

  const matches = unwrap(fetched.payload)
    .map((row, i) => normaliseMatch(row, i))
    .filter((m): m is WorldCupMatch => m !== null);

  const base = {
    configured: Boolean(config.apiKey),
    competition: config.competition,
    season: config.season,
    updatedAt: new Date().toISOString(),
  };

  if (matches.length > 0) {
    return {
      ...base,
      matches,
      source: "football-data",
    };
  }

  return {
    ...base,
    matches: buildFallbackFixtures(),
    source: "fallback",
    reason: fetched.reason || "football-data.org returned no usable matches",
  };
}

/** Compatibility helper for existing server consumers that only need matches. */
export async function getMatches(): Promise<WorldCupMatch[]> {
  return (await getMatchFeed()).matches;
}

function dateValue(m: WorldCupMatch): number {
  const t = Date.parse(`${m.date}T${m.time || "00:00"}:00Z`);
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
export function formatMatchesForPrompt(
  matches: WorldCupMatch[],
  options: { source?: MatchDataSource } = {},
): string {
  if (matches.length === 0) return "";
  const lines = matches
    .map((m) => {
      const when = [m.date, m.time].filter(Boolean).join(" ");
      const where = [m.stadium, m.city].filter(Boolean).join(", ");
      const meta = [when, where, m.group && `Group ${m.group}`]
        .filter(Boolean)
        .join(" · ");
      return `- ${m.teamAFlag} ${m.teamA} vs ${m.teamB} ${m.teamBFlag}${meta ? ` (${meta})` : ""}`;
    })
    .join("\n");

  if (options.source === "fallback") {
    return [
      "Seeded demo fixtures because live football-data.org data is unavailable.",
      "Use these only as practice prediction options; do not claim they are official fixtures.",
      lines,
    ].join("\n");
  }

  return lines;
}

/* --------------------------------------------------------------- fallback -- */

/**
 * Seeded fallback — used ONLY when the live API can't be reached. Dates roll
 * forward from the current day so upcoming-fixture surfaces never age out.
 * Live data always wins when available.
 */
const FALLBACK_PAIRS = [
  ["Mexico", "South Africa", "20:00", "A"],
  ["South Korea", "Czech Republic", "17:00", "A"],
  ["Argentina", "Australia", "21:00", "C"],
  ["France", "Norway", "18:00", "E"],
  ["Spain", "Croatia", "20:00", "B"],
  ["Brazil", "Morocco", "23:00", "G"],
] as const;

function fallbackDate(offsetDays: number, now = new Date()): string {
  const date = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays),
  );
  return date.toISOString().slice(0, 10);
}

function buildFallbackFixtures(now = new Date()): WorldCupMatch[] {
  return FALLBACK_PAIRS.map(([teamA, teamB, time, group], i) =>
    mkFixture(
      `fb-${i + 1}`,
      teamA,
      teamB,
      fallbackDate(Math.floor(i / 2) + 1, now),
      time,
      group,
    ),
  );
}

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
