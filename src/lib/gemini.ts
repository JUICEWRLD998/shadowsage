/**
 * Model configuration — Gemini, served through OpenRouter.
 *
 * Centralizes model selection so every route shares one source of truth.
 * We talk to Gemini via OpenRouter (paid credits) instead of Google's free
 * tier, which sidesteps the per-key quota limits (the free tier caps at 20
 * requests/day on gemini-2.5-flash — useless for a live demo). The OpenRouter
 * provider reads OPENROUTER_KEY from the environment.
 *
 * The exported names (chatModel, analysisModel, isGeminiConfigured) are kept
 * stable so call sites don't need to change.
 *
 * Server only.
 */

import {
  createOpenRouter,
  type OpenRouterChatSettings,
} from "@openrouter/ai-sdk-provider";

/**
 * OpenRouter client. The API key is read here explicitly so a missing key
 * fails loudly at call time rather than silently. We tolerate the legacy
 * OPENROUTER_API_KEY name too.
 */
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_KEY || process.env.OPENROUTER_API_KEY || "",
});

/**
 * Routing settings applied to every model.
 *
 * OpenRouter load-balances `google/*` across several upstream providers, and
 * some of them don't enforce `response_format.json_schema` — so `generateObject`
 * intermittently received free-form JSON with raw newlines and threw
 * NoObjectGeneratedError (this is what made the Shadow "start then stop").
 * Latency also swung wildly (1.5s → 30s) depending on which provider was picked.
 *
 * Fix: prefer Google's own first-party endpoints (fast + native structured
 * output), require_parameters so any fallback still supports our request shape,
 * and enable the response-healing plugin as a final backstop that repairs
 * malformed JSON on non-streaming structured calls.
 */
const GOOGLE_ROUTING: OpenRouterChatSettings = {
  provider: {
    order: ["google-ai-studio", "google-vertex"],
    require_parameters: true,
  },
  plugins: [{ id: "response-healing" }],
};

/**
 * Non-Google routing. The Google provider order and Google-specific JSON
 * healing don't apply to other vendors, so we keep only the parameter-shape
 * guarantee. Used when CHAT_MODEL/ANALYSIS_MODEL points at e.g. openai/* or
 * anthropic/* (handy for A/B-testing whether Gemini's safety layer is the cause
 * of the Shadow's empty completions).
 */
const GENERIC_ROUTING: OpenRouterChatSettings = {
  provider: {
    require_parameters: true,
  },
};

/** Pick the right routing for a model id based on its vendor prefix. */
function routingFor(modelId: string): OpenRouterChatSettings {
  return modelId.startsWith("google/") ? GOOGLE_ROUTING : GENERIC_ROUTING;
}

/**
 * Chat model — `google/gemini-2.5-flash`. Fast, cheap, great for streaming
 * conversation and the Shadow's live voice. Override with CHAT_MODEL.
 */
export const CHAT_MODEL_ID =
  process.env.CHAT_MODEL || "google/gemini-2.5-flash";

/**
 * Analysis model — defaults to the same `google/gemini-2.5-flash` as chat.
 *
 * We deliberately do NOT use `gemini-2.5-pro` here: as a reasoning model it
 * spends output budget on hidden thinking and frequently truncates or empties
 * the visible content (e.g. a half-written Shadow emergence message), on top of
 * being ~30s slow per call. Flash is fast, reliable, and plenty capable for the
 * structured/analytical work (bias detection, persona generation, prediction
 * parsing, roasts). Override with ANALYSIS_MODEL if you want to experiment.
 */
export const ANALYSIS_MODEL_ID =
  process.env.ANALYSIS_MODEL || "google/gemini-2.5-flash";

/** The primary conversational model used by /api/chat and the Shadow voice. */
export const chatModel = openrouter.chat(CHAT_MODEL_ID, routingFor(CHAT_MODEL_ID));

/** The model used for structured/analytical work (generateObject). */
export const analysisModel = openrouter.chat(
  ANALYSIS_MODEL_ID,
  routingFor(ANALYSIS_MODEL_ID),
);

/** True when the OpenRouter key is present. */
export function isGeminiConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_KEY || process.env.OPENROUTER_API_KEY);
}
