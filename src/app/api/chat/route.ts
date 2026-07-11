/**
 * POST /api/chat — streaming conversation with the ShadowSage companion.
 *
 * AI SDK v6 contract:
 *   - The client (useChat) sends `{ messages: UIMessage[] }`.
 *   - We translate UI messages → model messages with convertToModelMessages,
 *     prepend the system prompt, and stream the model's reply back as a
 *     UI-message stream the client knows how to render incrementally.
 *
 * Phase 2 adds the memory loop around that stream:
 *   1. BEFORE streaming — recall the user's prediction history + silent bias
 *      notes from Walrus, and pull upcoming fixtures, then ground the prompt.
 *   2. AFTER streaming (onFinish) — extract any prediction the user just made,
 *      persist it, and (once enough exist) refresh the silent bias profile.
 * Every memory call degrades gracefully, so the chat works with or without
 * MemWal configured.
 */

import {
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai";
import { chatModel, isGeminiConfigured } from "@/lib/gemini";
import { buildFriendlySystemPrompt } from "@/prompts/system";
import {
  getMatches,
  getUpcomingMatches,
  formatMatchesForPrompt,
} from "@/lib/worldcup";
import { recallPredictions, buildPrediction, storePrediction } from "@/lib/predictions";
import { summarizePredictionsForPrompt } from "@/lib/predictionMemory";
import { extractPrediction } from "@/lib/predictionParser";
import {
  recallBiasNotes,
  detectBiases,
  storeBiasProfiles,
  MIN_PREDICTIONS_FOR_BIAS,
} from "@/lib/biasDetector";
import { requireSession } from "@/lib/auth/session";

// Allow long-running streams on Vercel (Hobby caps at 10s without this).
export const maxDuration = 30;

interface ChatRequestBody {
  messages: UIMessage[];
}

/** Flatten a UIMessage's text parts into a plain string. */
function uiMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

/** Build a short transcript (last few turns + the fresh reply) for extraction. */
function buildTranscript(messages: UIMessage[], assistantReply: string): string {
  const recent = messages.slice(-6).map((m) => {
    const who = m.role === "user" ? "User" : "Companion";
    return `${who}: ${uiMessageText(m)}`;
  });
  recent.push(`Companion: ${assistantReply}`);
  return recent.join("\n");
}

export async function POST(req: Request) {
  const auth = await requireSession();
  if (auth instanceof Response) return auth;
  const userId = auth;

  if (!isGeminiConfigured()) {
    return Response.json(
      { error: "The AI runtime isn't configured yet." },
      { status: 503 },
    );
  }

  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { messages } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json(
      { error: "`messages` must be a non-empty array." },
      { status: 400 },
    );
  }

  // ── Ground the prompt in real memory + fixtures ──────────────────────────
  // All three are best-effort and run concurrently; any failure yields a safe
  // empty value so the companion still responds.
  const [predictions, biasNotes, allMatches] = await Promise.all([
    recallPredictions(undefined, 20, userId).catch(() => []),
    recallBiasNotes(10, userId).catch(() => ""),
    getMatches().catch(() => []),
  ]);

  const recentPredictions = summarizePredictionsForPrompt(
    predictions.map((p) => p.raw),
  );
  const upcomingMatches = formatMatchesForPrompt(getUpcomingMatches(allMatches));

  const system = buildFriendlySystemPrompt({
    recentPredictions: recentPredictions || undefined,
    upcomingMatches: upcomingMatches || undefined,
    biasNotes: biasNotes || undefined,
    predictionCount: predictions.length,
  });

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: chatModel,
    system,
    messages: modelMessages,
    temperature: 0.8, // a touch of personality without going off the rails
    // ── Memory write-back, after the reply finishes ───────────────────────
    onFinish: async ({ text }) => {
      try {
        await captureMemory(messages, text, predictions.length, userId);
      } catch (error) {
        console.error("[/api/chat] memory write-back failed:", error);
      }
    },
  });

  // Surface server-side model errors instead of silently closing the stream.
  return result.toUIMessageStreamResponse({
    onError: (error) => {
      console.error("[/api/chat] stream error:", error);
      return "Something glitched on my end — give that another shot.";
    },
  });
}

/**
 * Post-turn memory loop: extract a prediction from the just-finished exchange,
 * store it, and refresh the silent bias profile once enough predictions exist.
 * Runs in onFinish; all writes are best-effort.
 */
async function captureMemory(
  messages: UIMessage[],
  assistantReply: string,
  priorCount: number,
  userId: string,
): Promise<void> {
  const transcript = buildTranscript(messages, assistantReply);
  const parsed = await extractPrediction(transcript);
  if (!parsed) return;

  const prediction = buildPrediction(parsed);
  await storePrediction(prediction, userId);

  // Refresh bias analysis only when a new pick pushes us past the threshold —
  // avoids re-running the analyst on every idle message.
  const total = priorCount + 1;
  if (total >= MIN_PREDICTIONS_FOR_BIAS) {
    const history = await recallPredictions(undefined, 30, userId);
    const block = summarizePredictionsForPrompt(
      history.map((p) => p.raw),
      30,
    );
    const biases = await detectBiases(block);
    await storeBiasProfiles(biases, userId);
  }
}
