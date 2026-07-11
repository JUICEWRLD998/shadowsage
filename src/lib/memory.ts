/**
 * Local wallet-scoped memory.
 *
 * Phase 4 uses a local-first store that persists JSON on disk during local
 * development/demo runs. Call sites keep the established helper shape:
 * rememberAsync, recallMemories, scopeNs, isMemoryConfigured.
 *
 * Server only - never import this into a client component.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { MemoryNamespace } from "@/types";

/**
 * A namespace as stored locally. Either a bare base namespace (shared/global
 * data, e.g. leaderboard) or a per-wallet scoped one produced by scopeNs.
 */
export type ScopedNamespace = MemoryNamespace | (string & {});

export interface LocalMemoryRecord {
  id: string;
  namespace: ScopedNamespace;
  text: string;
  createdAt: string;
}

interface LocalMemoryFile {
  version: 1;
  records: LocalMemoryRecord[];
}

const DEFAULT_RELATIVE_PATH = path.join(".shadowsage", "memory.json");
const MAX_RECORDS_PER_NAMESPACE = 500;

let writeQueue: Promise<unknown> = Promise.resolve();

function memoryPath(): string {
  return path.resolve(
    process.cwd(),
    process.env.LOCAL_MEMORY_PATH || DEFAULT_RELATIVE_PATH,
  );
}

/**
 * Scope a base namespace to a single wallet so one address never sees another
 * address's private memory. Until WDK lands in Phase 5, the current verified
 * wallet/session address is used in the same slot.
 */
export function scopeNs(base: MemoryNamespace, userId?: string | null): ScopedNamespace {
  return userId ? `${base}::${userId.toLowerCase()}` : base;
}

/** Local memory is always available in a local Node runtime. */
export function isMemoryConfigured(): boolean {
  return true;
}

async function readStore(): Promise<LocalMemoryFile> {
  try {
    const raw = await readFile(memoryPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<LocalMemoryFile>;
    return {
      version: 1,
      records: Array.isArray(parsed.records)
        ? parsed.records.filter(isMemoryRecord)
        : [],
    };
  } catch {
    return { version: 1, records: [] };
  }
}

async function writeStore(store: LocalMemoryFile): Promise<void> {
  const file = memoryPath();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(store, null, 2), "utf8");
}

function isMemoryRecord(value: unknown): value is LocalMemoryRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.namespace === "string" &&
    typeof record.text === "string" &&
    typeof record.createdAt === "string"
  );
}

function compactNamespace(records: LocalMemoryRecord[]): LocalMemoryRecord[] {
  const byNamespace = new Map<string, LocalMemoryRecord[]>();
  for (const record of records) {
    const bucket = byNamespace.get(record.namespace) ?? [];
    bucket.push(record);
    byNamespace.set(record.namespace, bucket);
  }

  return [...byNamespace.values()].flatMap((bucket) =>
    bucket
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, MAX_RECORDS_PER_NAMESPACE),
  );
}

function enqueueWrite<T>(task: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(task, task);
  writeQueue = next.catch(() => undefined);
  return next;
}

/** Store a memory and wait for the local file write to finish. */
export async function rememberWithRetry(
  text: string,
  namespace: ScopedNamespace,
): Promise<boolean> {
  return rememberAsync(text, namespace);
}

/**
 * Store a compact text memory in the local JSON file. Returns false only when
 * the file cannot be written.
 */
export async function rememberAsync(
  text: string,
  namespace: ScopedNamespace,
): Promise<boolean> {
  if (!text.trim()) return false;

  try {
    await enqueueWrite(async () => {
      const store = await readStore();
      store.records.push({
        id: randomUUID(),
        namespace,
        text,
        createdAt: new Date().toISOString(),
      });
      store.records = compactNamespace(store.records);
      await writeStore(store);
    });
    return true;
  } catch (error) {
    console.error(`[memory] remember failed (ns=${namespace}):`, error);
    return false;
  }
}

function tokens(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 3),
  );
}

function score(queryTokens: Set<string>, text: string): number {
  if (queryTokens.size === 0) return 0;
  const textTokens = tokens(text);
  let total = 0;
  for (const token of queryTokens) {
    if (textTokens.has(token)) total += 1;
  }
  return total;
}

/**
 * Recall local memories from a namespace. This is not semantic vector search;
 * it is deterministic lexical scoring plus recency fallback, which is enough
 * for local structured records and compact QVAC prompt summaries.
 */
export async function recallMemories(
  query: string,
  namespace?: ScopedNamespace,
  limit = 10,
): Promise<string[]> {
  try {
    const store = await readStore();
    const queryTokens = tokens(query);
    const rows = store.records
      .filter((record) => !namespace || record.namespace === namespace)
      .map((record) => ({
        record,
        score: score(queryTokens, record.text),
      }))
      .sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        return a.record.createdAt < b.record.createdAt ? 1 : -1;
      })
      .slice(0, Math.max(0, limit));

    return rows.map((row) => row.record.text);
  } catch (error) {
    console.error(`[memory] recall failed (ns=${namespace}):`, error);
    return [];
  }
}
