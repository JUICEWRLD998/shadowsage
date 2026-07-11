/**
 * QVAC local AI adapter.
 *
 * The public QVAC SDK contract is not pinned in this repo yet, so this adapter
 * targets a local, OpenAI-compatible chat-completions surface by default:
 *
 *   POST ${QVAC_RUNTIME_ENDPOINT}/v1/chat/completions
 *
 * The endpoint and path stay configurable so the SDK/runtime can be wired in
 * without touching product code. All AI behavior in the app should go through
 * this module.
 */

import type { UIMessage } from "ai";
import type { z } from "zod";

export type QvacRole = "system" | "user" | "assistant";

export interface QvacMessage {
  role: QvacRole;
  content: string;
}

export interface QvacStatus {
  configured: boolean;
  endpoint: string;
  modelId: string;
  localOnly: true;
  cloudKeysUsed: false;
  state: "ready" | "unconfigured";
}

interface QvacConfig {
  endpoint: string;
  chatUrl: string;
  modelId: string;
  apiKey: string;
  timeoutMs: number;
}

export class QvacUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QvacUnavailableError";
  }
}

const DEFAULT_CHAT_PATH = "/v1/chat/completions";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function qvacConfig(): QvacConfig {
  const endpoint = trimTrailingSlash(
    process.env.QVAC_RUNTIME_ENDPOINT || process.env.QVAC_BASE_URL || "",
  );
  const path = process.env.QVAC_CHAT_COMPLETIONS_PATH || DEFAULT_CHAT_PATH;
  const chatUrl =
    process.env.QVAC_CHAT_COMPLETIONS_URL ||
    (endpoint ? `${endpoint}${path.startsWith("/") ? path : `/${path}`}` : "");

  return {
    endpoint,
    chatUrl,
    modelId: process.env.QVAC_MODEL_ID || "",
    apiKey: process.env.QVAC_API_KEY || "",
    timeoutMs: Number(process.env.QVAC_TIMEOUT_MS) || 30_000,
  };
}

export function isQvacConfigured(): boolean {
  const config = qvacConfig();
  return Boolean(config.chatUrl && config.modelId);
}

export function getQvacStatus(): QvacStatus {
  const config = qvacConfig();
  const configured = Boolean(config.chatUrl && config.modelId);
  return {
    configured,
    endpoint: config.endpoint || config.chatUrl,
    modelId: config.modelId,
    localOnly: true,
    cloudKeysUsed: false,
    state: configured ? "ready" : "unconfigured",
  };
}

export function qvacUserMessage(error: unknown): string {
  if (error instanceof QvacUnavailableError) return error.message;
  return "QVAC local inference is unavailable. Start the local QVAC runtime/model and try again.";
}

function assertConfigured(config: QvacConfig): void {
  if (!config.chatUrl || !config.modelId) {
    throw new QvacUnavailableError(
      "QVAC local runtime is not configured. Set QVAC_RUNTIME_ENDPOINT and QVAC_MODEL_ID.",
    );
  }
}

function headers(config: QvacConfig): HeadersInit {
  return {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    ...(config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {}),
  };
}

async function postChat(
  config: QvacConfig,
  body: Record<string, unknown>,
): Promise<Response> {
  assertConfigured(config);

  let res: Response;
  try {
    res = await fetch(config.chatUrl, {
      method: "POST",
      headers: headers(config),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(config.timeoutMs),
    });
  } catch (error) {
    throw new QvacUnavailableError(
      error instanceof Error
        ? `QVAC local runtime request failed: ${error.message}`
        : "QVAC local runtime request failed.",
    );
  }

  if (!res.ok) {
    throw new QvacUnavailableError(
      `QVAC local runtime returned HTTP ${res.status}.`,
    );
  }

  return res;
}

function requestBody(options: {
  messages: QvacMessage[];
  temperature?: number;
  stream?: boolean;
  json?: boolean;
}): Record<string, unknown> {
  const config = qvacConfig();
  return {
    model: config.modelId,
    messages: options.messages,
    temperature: options.temperature,
    stream: Boolean(options.stream),
    ...(options.json ? { response_format: { type: "json_object" } } : {}),
  };
}

function contentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object") {
          const record = part as Record<string, unknown>;
          return contentToText(record.text ?? record.content ?? "");
        }
        return "";
      })
      .join("");
  }
  return "";
}

function textFromResponsePayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const data = payload as Record<string, unknown>;
  const choices = data.choices;
  if (Array.isArray(choices) && choices.length > 0) {
    const first = choices[0] as Record<string, unknown>;
    const message = first.message as Record<string, unknown> | undefined;
    return (
      contentToText(message?.content) ||
      contentToText(first.text) ||
      contentToText((first.delta as Record<string, unknown> | undefined)?.content)
    );
  }
  return (
    contentToText(data.output_text) ||
    contentToText(data.text) ||
    contentToText(data.response) ||
    contentToText((data.message as Record<string, unknown> | undefined)?.content) ||
    contentToText(data.content)
  );
}

function deltaFromStreamPayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const data = payload as Record<string, unknown>;
  const choices = data.choices;
  if (Array.isArray(choices) && choices.length > 0) {
    const first = choices[0] as Record<string, unknown>;
    const delta = first.delta as Record<string, unknown> | undefined;
    return (
      contentToText(delta?.content) ||
      contentToText(first.text) ||
      contentToText(first.content)
    );
  }
  return (
    contentToText(data.delta) ||
    contentToText(data.text) ||
    contentToText(data.output_text_delta) ||
    contentToText(data.content)
  );
}

function parseJsonText(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
    if (fenced) return JSON.parse(fenced.trim());
    const object = trimmed.match(/\{[\s\S]*\}/)?.[0];
    if (object) return JSON.parse(object);
    throw new Error("QVAC did not return valid JSON.");
  }
}

async function responseText(res: Response): Promise<string> {
  const raw = await res.text();
  try {
    return textFromResponsePayload(JSON.parse(raw)) || raw;
  } catch {
    return raw;
  }
}

async function readSseText(
  res: Response,
  onDelta?: (delta: string) => void,
): Promise<string> {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("text/event-stream")) {
    const text = await responseText(res);
    if (text) onDelta?.(text);
    return text;
  }

  if (!res.body) return "";

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const data = frame
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n")
        .trim();

      if (!data || data === "[DONE]") continue;

      const delta = deltaFromStreamPayload(JSON.parse(data));
      if (!delta) continue;
      fullText += delta;
      onDelta?.(delta);
    }
  }

  return fullText;
}

export async function qvacGenerateText(options: {
  messages: QvacMessage[];
  temperature?: number;
  json?: boolean;
}): Promise<string> {
  const config = qvacConfig();
  const res = await postChat(
    config,
    requestBody({
      messages: options.messages,
      temperature: options.temperature,
      json: options.json,
    }),
  );
  return (await responseText(res)).trim();
}

export async function qvacStreamText(options: {
  messages: QvacMessage[];
  temperature?: number;
  onDelta?: (delta: string) => void;
}): Promise<string> {
  const config = qvacConfig();

  try {
    const res = await postChat(
      config,
      requestBody({
        messages: options.messages,
        temperature: options.temperature,
        stream: true,
      }),
    );
    return (await readSseText(res, options.onDelta)).trim();
  } catch (error) {
    if (!(error instanceof QvacUnavailableError)) throw error;
    const text = await qvacGenerateText({
      messages: options.messages,
      temperature: options.temperature,
    });
    if (text) options.onDelta?.(text);
    return text;
  }
}

export async function qvacGenerateObject<T>(options: {
  schema: z.ZodType<T>;
  system?: string;
  prompt: string;
  temperature?: number;
}): Promise<T> {
  const messages: QvacMessage[] = [
    ...(options.system ? [{ role: "system" as const, content: options.system }] : []),
    {
      role: "user",
      content: [
        options.prompt,
        "",
        "Return only one valid JSON object. Do not include markdown, comments, or prose outside the JSON.",
      ].join("\n"),
    },
  ];

  const raw = await qvacGenerateText({
    messages,
    temperature: options.temperature,
    json: true,
  });
  const parsed = parseJsonText(raw);
  return options.schema.parse(parsed);
}

export function qvacMessagesFromUI(messages: UIMessage[]): QvacMessage[] {
  return messages
    .map((message): QvacMessage | null => {
      if (message.role !== "user" && message.role !== "assistant") return null;
      const content = message.parts
        .filter((part): part is { type: "text"; text: string } => part.type === "text")
        .map((part) => part.text)
        .join("")
        .trim();
      if (!content) return null;
      return { role: message.role, content };
    })
    .filter((message): message is QvacMessage => message !== null);
}
