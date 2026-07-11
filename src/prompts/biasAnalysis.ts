/**
 * Bias-analysis prompt — the brief for the silent cognitive-bias analyst.
 *
 * This never reaches the user. It runs over their accumulated prediction
 * history and returns structured biases that (a) steer the friendly agent's
 * questioning and (b) become the Shadow's ammunition once it emerges.
 */

/** The ten biases the analyst is allowed to detect, with one-line definitions. */
export const BIAS_DEFINITIONS = `1. recency_bias — Over-weighting the most recent results or news.
2. home_team_bias — Defaulting to traditionally strong / famous teams.
3. underdog_syndrome — Emotional picks for weaker sides against the odds.
4. group_stage_fatigue — Reasoning quality declining across later group games.
5. knockout_panic — Switching to "safe", conservative picks in elimination rounds.
6. continental_bias — Systematically over/under-rating teams from a region.
7. star_player_bias — Picking on individual stars rather than team form.
8. revenge_picking — Picking against teams that burned a past prediction.
9. bandwagon_bias — Following popular / media consensus.
10. time_of_day_bias — Accuracy or boldness shifting with time of prediction.`;

export function buildBiasAnalysisPrompt(predictionHistory: string): string {
  return `Analyse the cognitive biases in this user's football prediction history.

## BIAS TYPES (use these exact keys)
${BIAS_DEFINITIONS}

## PREDICTION HISTORY
${predictionHistory}

## INSTRUCTIONS
- Identify only biases with genuine support in the history; cite specific picks as evidence.
- Severity is 1-10 (10 = dominates their decisions). Confidence is 0-100.
- Only report a bias if your confidence is >= 60.
- It is correct to return an empty list when the history is too thin or balanced.
- Quote the user's own words/picks in the evidence — that's what makes it land later.`;
}
