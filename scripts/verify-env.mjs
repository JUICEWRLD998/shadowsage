/**
 * One-off local environment verification. Run with:
 *   node --env-file=.env.local scripts/verify-env.mjs
 * Does NOT print secrets - only pass/fail plus minimal context.
 */
import { MemWal } from "@mysten-incubation/memwal";

const line = (s) => console.log(s);
let failures = 0;

function qvacConfig() {
  const endpoint = (process.env.QVAC_RUNTIME_ENDPOINT || process.env.QVAC_BASE_URL || "").replace(/\/+$/, "");
  const path = process.env.QVAC_CHAT_COMPLETIONS_PATH || "/v1/chat/completions";
  return {
    url:
      process.env.QVAC_CHAT_COMPLETIONS_URL ||
      (endpoint ? `${endpoint}${path.startsWith("/") ? path : `/${path}`}` : ""),
    model: process.env.QVAC_MODEL_ID || "",
    apiKey: process.env.QVAC_API_KEY || "",
  };
}

function textFromPayload(payload) {
  const first = payload?.choices?.[0];
  return (
    first?.message?.content ||
    first?.text ||
    payload?.output_text ||
    payload?.text ||
    payload?.response ||
    ""
  );
}

// ---- 1. QVAC local AI ------------------------------------------------------
line("\n=== 1. QVAC local AI ===");
try {
  const qvac = qvacConfig();
  if (!qvac.url || !qvac.model) {
    throw new Error("QVAC_RUNTIME_ENDPOINT / QVAC_MODEL_ID not set");
  }

  const res = await fetch(qvac.url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(qvac.apiKey ? { authorization: `Bearer ${qvac.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: qvac.model,
      messages: [{ role: "user", content: "Reply with exactly the word: PONG" }],
      temperature: 0,
      stream: false,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = textFromPayload(await res.json()).trim();
  if (!text) throw new Error("empty response");
  line(`  ✓ QVAC (${qvac.model}) responded: "${text.slice(0, 40)}"`);
} catch (e) {
  failures++;
  line(`  ✗ QVAC failed: ${e?.message || e}`);
}

// ---- 2. MemWal -------------------------------------------------------------
line("\n=== 2. Walrus Memory (MemWal) ===");
try {
  if (!process.env.MEMWAL_DELEGATE_KEY || !process.env.MEMWAL_ACCOUNT_ID) {
    throw new Error("MEMWAL_DELEGATE_KEY / MEMWAL_ACCOUNT_ID not set");
  }

  const memwal = MemWal.create({
    key: process.env.MEMWAL_DELEGATE_KEY,
    accountId: process.env.MEMWAL_ACCOUNT_ID,
    serverUrl: process.env.MEMWAL_SERVER_URL || "https://relayer.memwal.ai",
    namespace: process.env.MEMWAL_NAMESPACE || "shadowpundit",
  });
  line(`  · server: ${process.env.MEMWAL_SERVER_URL || "https://relayer.memwal.ai"}`);

  try {
    const h = await memwal.health();
    line(`  ✓ health: status=${h.status} version=${h.version ?? "?"}`);
  } catch (e) {
    line(`  ! health check failed: ${e?.message || e}`);
  }

  const pub = await memwal.getPublicKeyHex();
  line(`  ✓ delegate public key derived (...${pub.slice(-8)})`);

  const token = `verify-token-${pub.slice(0, 6)}-${Date.now()}`;
  line("  · remembering a probe memory...");
  await memwal.rememberAndWait(`E2E verification probe: ${token}`, "conversations", {
    timeoutMs: 30000,
  });
  line("  ✓ remember stored");

  const recall = await memwal.recall({
    query: "E2E verification probe",
    namespace: "conversations",
    limit: 5,
  });
  const hit = recall.results.some((r) => r.text.includes(token));
  if (hit) line(`  ✓ recall round-trip OK (${recall.results.length} result(s), probe found)`);
  else {
    failures++;
    line(`  ✗ recall returned ${recall.results.length} result(s) but probe not found`);
  }
} catch (e) {
  failures++;
  line(`  ✗ MemWal failed: ${e?.message || e}`);
}

line(`\n=== RESULT: ${failures === 0 ? "ALL PASSED" : failures + " CHECK(S) FAILED"} ===`);
process.exit(failures === 0 ? 0 : 1);
