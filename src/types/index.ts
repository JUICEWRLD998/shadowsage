/* ============================================================================
   SHADOWSAGE — TYPE SYSTEM
   Single source of truth for every data model in the app.
   ========================================================================== */

// ==================== PREDICTIONS ====================

export type MatchStage =
  | "group-matchday1"
  | "group-matchday2"
  | "group-matchday3"
  | "round-of-32"
  | "round-of-16"
  | "quarter-final"
  | "semi-final"
  | "third-place"
  | "final";

export type PickSide = "teamA" | "teamB" | "draw";

export interface Prediction {
  id: string;
  matchId: string;
  teamA: string;
  teamB: string;
  teamAFlag: string; // Emoji flag
  teamBFlag: string;
  stage: MatchStage;
  userPick: PickSide;
  predictedScore: string; // e.g. "2-1"
  confidence: number; // 1-10
  reasoning: string;
  timestamp: string; // ISO 8601
  result?: MatchResult;
  shadowPrediction?: ShadowPrediction;
}

export interface ShadowPrediction {
  pick: PickSide;
  predictedScore: string;
  reasoning: string; // Uses the user's biases as evidence
  biasesExploited: BiasType[];
  confidenceAgainstUser: number; // 1-10
}

export interface MatchResult {
  winner: PickSide;
  score: string;
  userCorrect: boolean;
  shadowCorrect: boolean;
  roast?: RoastPayload;
}

// ==================== BIAS SYSTEM ====================

export type BiasType =
  | "recency_bias" // Over-weighting recent results
  | "home_team_bias" // Always picking favorites/strong teams
  | "underdog_syndrome" // Emotional picks for underdogs
  | "group_stage_fatigue" // Declining quality in late group matches
  | "knockout_panic" // Conservative picks in elimination rounds
  | "continental_bias" // Over/under-valuing specific regions
  | "star_player_bias" // Picks based on individuals, not teams
  | "revenge_picking" // Picking against teams that burned you
  | "bandwagon_bias" // Following popular opinion
  | "time_of_day_bias"; // Accuracy varies by time of prediction

export type BiasSeverityTier = "mild" | "moderate" | "severe";

export interface BiasProfile {
  type: BiasType;
  label: string; // Human-readable name
  description: string; // What this bias means
  severity: number; // 1-10
  evidence: string[]; // Specific examples from user data
  detectedAt: string;
  lastTriggered: string;
  triggerCount: number;
  dnaColor: string; // Hex/OKLCH color for DNA visualization
}

// ==================== SHADOW ====================

export type ShadowTone = "sarcastic" | "analytical" | "savage" | "playful";

export interface ShadowPersonality {
  tone: ShadowTone;
  knownBiases: BiasType[];
  favoriteCounterArgument: string;
  catchphrase: string;
  emergenceMessage: string; // First message after awakening
}

export interface ShadowRecord {
  wins: number;
  losses: number;
  draws: number;
}

export interface ShadowState {
  isActive: boolean;
  activatedAt: string | null;
  personality: ShadowPersonality;
  winRecord: ShadowRecord;
  predictedUserPicks: number; // Times shadow guessed what user would pick
  totalRoasts: number;
  favoriteRoast: string;
}

export interface RoastPayload {
  text: string;
  painScore: number; // (10 - accuracy) × confidence
  userQuote: string; // Their exact reasoning quoted
  biasExploited: BiasType;
  shareImageUrl?: string;
}

// ==================== WORLD CUP DATA ====================

export type MatchStatus = "scheduled" | "live" | "completed";
export type MatchDataSource = "football-data" | "fallback";

export interface WorldCupMatch {
  id: string;
  teamA: string;
  teamB: string;
  teamAFlag: string;
  teamBFlag: string;
  date: string;
  time: string;
  stadium: string;
  city: string;
  stage: MatchStage;
  status: MatchStatus;
  score?: string;
  winner?: PickSide;
  group?: string;
}

export interface WorldCupMatchFeed {
  matches: WorldCupMatch[];
  source: MatchDataSource;
  configured: boolean;
  competition: string;
  season: string;
  updatedAt: string;
  reason?: string;
}

export interface Team {
  name: string;
  flag: string;
  group?: string;
  fifaCode?: string;
}

export interface TeamStanding {
  name: string;
  flag: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  position: number;
}

export interface GroupStanding {
  group: string;
  teams: TeamStanding[];
}

// ==================== LEADERBOARD ====================

export interface LeaderboardEntry {
  rank: number;
  userId: string; // Anonymous hash
  displayName: string; // Auto-generated funny name
  shadowAccuracy: number; // Shadow's win %
  userAccuracy: number; // User's win %
  totalPredictions: number;
  roastCount: number;
  topBias: BiasType;
  defianceRate: number; // % times user defied shadow and was RIGHT
  isYou?: boolean; // marks the real signed-in user's row
}

// ==================== CHAT ====================

export type ChatRole = "user" | "assistant" | "shadow";

export interface ChatMessageMetadata {
  predictionExtracted?: boolean;
  biasDetected?: BiasType[];
  shadowEmergence?: boolean;
  matchContext?: WorldCupMatch;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
  metadata?: ChatMessageMetadata;
}

// ==================== APP STATE ====================

export interface AppState {
  userId: string;
  shadowState: ShadowState;
  predictions: Prediction[];
  biasProfile: BiasProfile[];
  totalAccuracy: number;
  shadowAccuracy: number;
}

// ==================== MEMORY ====================

/** Memory namespaces — one bucket per data domain. */
export type MemoryNamespace =
  | "predictions"
  | "bias-profile"
  | "shadow-state"
  | "conversations"
  | "stakes"
  | "results"
  | "leaderboard";

// ==================== AUTH ====================

/** The verified identity behind a request — a wallet address. */
export interface SessionUser {
  /** Lower-cased wallet address; doubles as the memory-scoping key. */
  address: string;
}
