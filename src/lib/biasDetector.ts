/**
 * Bias detector — the silent engine that reads a user's prediction history and
 * surfaces cognitive biases.
 *
 * Runs `generateObject` against the analysis model with a constrained schema,
 * then enriches each raw finding into a full BiasProfile (human label,
 * description, severity tier + DNA colour) and persists it to the Walrus
 * `bias-profile` namespace. A recall helper summarises stored biases as the
 * "private notes" the friendly agent uses to steer its questions without ever
 * revealing them.
 *
 * Server only.
 */

import { generateObject } from "ai";
import { z } from "zod";
import { analysisModel } from "./gemini";
import {
  recallMemories,
  rememberAsync,
  isMemWalConfigured,
  scopeNs,
} from "./memwal";
import { buildBiasAnalysisPrompt } from "@/prompts/biasAnalysis";
import type {
  BiasProfile,
  BiasSeverityTier,
  BiasType,
} from "@/types";

/* ------------------------------------------------------- presentation -- */

const BIAS_META: Record<BiasType, { label: string; description: string }> = {
  recency_bias: {
    label: "Recency Bias",
    description: "Over-weights the latest result or headline over the bigger picture.",
  },
  home_team_bias: {
    label: "Favourite Bias",
    description: "Leans on famous, traditionally strong teams by default.",
  },
  underdog_syndrome: {
    label: "Underdog Syndrome",
    description: "Backs romantic underdogs against the run of evidence.",
  },
  group_stage_fatigue: {
    label: "Group-Stage Fatigue",
    description: "Reasoning thins out across later group matches.",
  },
  knockout_panic: {
    label: "Knockout Panic",
    description: "Turns conservative and safe once elimination football starts.",
  },
  continental_bias: {
    label: "Continental Bias",
    description: "Systematically over- or under-rates a whole region.",
  },
  star_player_bias: {
    label: "Star-Player Bias",
    description: "Picks around individual stars instead of the team's shape.",
  },
  revenge_picking: {
    label: "Revenge Picking",
    description: "Bets against teams that burned a previous prediction.",
  },
  bandwagon_bias: {
    label: "Bandwagon Bias",
    description: "Drifts toward the popular, consensus call.",
  },
  time_of_day_bias: {
    label: "Time-of-Day Bias",
    description: "Boldness and accuracy shift with when the pick is made.",
  },
};

/** Severity → tier + colour for the Bias DNA visualisation. */
export function severityTier(severity: number): BiasSeverityTier {
  if (severity >= 7) return "severe";
  if (severity >= 4) return "moderate";
  return "mild";
}

const TIER_COLOR: Record<BiasSeverityTier, string> = {
  mild: "#10b981", // emerald
  moderate: "#f59e0b", // amber
  severe: "#ef4444", // red
};

export function biasLabel(type: BiasType): string {
  return BIAS_META[type]?.label ?? type;
}

/* ------------------------------------------------------------- detect -- */

const ALL_BIAS_TYPES = Object.keys(BIAS_META) as [BiasType, ...BiasType[]];

const detectionSchema = z.object({
  biases: z
    .array(
      z.object({
        type: z.enum(ALL_BIAS_TYPES),
        severity: z.number().min(1).max(10),
        confidence: z.number().min(0).max(100),
        pattern: z.string(),
        evidence: z.array(z.string()),
      }),
    )
    .describe("Biases supported by the history. May be empty."),
});

/** Minimum predictions before bias analysis is meaningful. */
export const MIN_PREDICTIONS_FOR_BIAS = 3;

/**
 * Detect biases from a prediction-history block. Returns enriched BiasProfiles,
 * filtered to confident findings. Never throws — returns [] on any failure.
 */
export async function detectBiases(
  predictionHistory: string,
): Promise<BiasProfile[]> {
  if (!predictionHistory.trim()) return [];

  try {
    const { object } = await generateObject({
      model: analysisModel,
      schema: detectionSchema,
      prompt: buildBiasAnalysisPrompt(predictionHistory),
      temperature: 0.2,
    });

    const now = new Date().toISOString();
    return object.biases
      .filter((b) => b.confidence >= 60)
      .map((b) => {
        const tier = severityTier(b.severity);
        return {
          type: b.type,
          label: BIAS_META[b.type].label,
          description: BIAS_META[b.type].description,
          severity: Math.round(b.severity),
          evidence: b.evidence.slice(0, 5),
          detectedAt: now,
          lastTriggered: now,
          triggerCount: 1,
          dnaColor: TIER_COLOR[tier],
        } satisfies BiasProfile;
      });
  } catch (error) {
    console.error("[biasDetector] detection failed:", error);
    return [];
  }
}

/* -------------------------------------------------------------- store -- */

/** Serialize one bias into its `bias-profile` memory block. */
function formatBiasMemory(b: BiasProfile): string {
  return [
    `BIAS [${b.detectedAt}]`,
    `Type: ${b.type} (${b.label})`,
    `Severity: ${b.severity}/10 (${severityTier(b.severity)})`,
    `Pattern: ${b.description}`,
    `Evidence: ${b.evidence.join(" | ")}`,
  ].join("\n");
}

/** Persist detected biases to Walrus (fire-and-forget). Returns count stored. */
export async function storeBiasProfiles(
  profiles: BiasProfile[],
  userId?: string | null,
): Promise<number> {
  if (!isMemWalConfigured() || profiles.length === 0) return 0;
  const ns = scopeNs("bias-profile", userId);
  const results = await Promise.all(
    profiles.map((p) => rememberAsync(formatBiasMemory(p), ns)),
  );
  return results.filter(Boolean).length;
}

/* ------------------------------------------------------------- recall -- */

/**
 * Recall stored biases and condense them into the agent's private notes.
 * Returns "" when nothing's been detected yet, so the prompt can show its own
 * "too early" fallback.
 */
export async function recallBiasNotes(
  limit = 10,
  userId?: string | null,
): Promise<string> {
  const memories = await recallMemories(
    "the user's detected cognitive biases and tendencies",
    scopeNs("bias-profile", userId),
    limit,
  );

  const lines = memories
    .filter((m) => /^BIAS \[/im.test(m))
    .map((m) => {
      const type = m.match(/^Type:\s*(.+)$/im)?.[1] ?? "";
      const sev = m.match(/^Severity:\s*(.+)$/im)?.[1] ?? "";
      const ev = m.match(/^Evidence:\s*(.+)$/im)?.[1] ?? "";
      return `- ${type} — severity ${sev}${ev ? ` · e.g. ${ev}` : ""}`;
    });

  return lines.join("\n");
}

/* ------------------------------------------------- structured recall -- */

const TYPE_BY_SLUG = new Set(Object.keys(BIAS_META));

function biasField(block: string, label: string): string {
  const m = block.match(new RegExp(`^${label}:\\s*(.+)$`, "mi"));
  return m ? m[1].trim() : "";
}

/** Parse one stored `BIAS [...]` block back into a structured profile, or null. */
function parseBiasMemory(raw: string): BiasProfile | null {
  if (!/^BIAS \[/im.test(raw)) return null;

  const detectedAt = raw.match(/^BIAS \[([^\]]+)\]/im)?.[1] ?? "";
  const slug = biasField(raw, "Type").match(/^(\w+)/)?.[1] ?? "";
  if (!TYPE_BY_SLUG.has(slug)) return null;
  const type = slug as BiasType;

  const severity = Math.min(
    10,
    Math.max(1, Number(biasField(raw, "Severity").match(/(\d+)/)?.[1] ?? 1)),
  );
  const evidence = biasField(raw, "Evidence")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    type,
    label: BIAS_META[type].label,
    description: biasField(raw, "Pattern") || BIAS_META[type].description,
    severity,
    evidence,
    detectedAt,
    lastTriggered: detectedAt,
    triggerCount: 1,
    dnaColor: TIER_COLOR[severityTier(severity)],
  } satisfies BiasProfile;
}

/**
 * Recall stored biases as structured profiles for the Profile / Bias-DNA views.
 * De-duplicates by type, keeping the highest-severity instance of each, sorted
 * most-severe first. Returns [] when nothing's stored.
 */
export async function recallBiasProfiles(
  limit = 12,
  userId?: string | null,
): Promise<BiasProfile[]> {
  const memories = await recallMemories(
    "the user's detected cognitive biases and tendencies",
    scopeNs("bias-profile", userId),
    limit,
  );

  const byType = new Map<BiasType, BiasProfile>();
  for (const m of memories) {
    const profile = parseBiasMemory(m);
    if (!profile) continue;
    const existing = byType.get(profile.type);
    if (!existing || profile.severity > existing.severity) {
      byType.set(profile.type, profile);
    }
  }

  return [...byType.values()].sort((a, b) => b.severity - a.severity);
}

/** Count distinct bias types present in recalled bias memories. */
export function countDistinctBiasTypes(memories: string[]): number {
  const types = new Set<string>();
  for (const m of memories) {
    const match = m.match(/^Type:\s*(\w+)/im);
    if (match) types.add(match[1]);
  }
  return types.size;
}
