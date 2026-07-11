/**
 * One-off local environment verification. Run with:
 *   node --env-file=.env.local scripts/verify-env.mjs
 * Does NOT print secrets - only pass/fail plus minimal context.
 */

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

// ---- 2. Local memory -------------------------------------------------------
line("\n=== 2. Local wallet-scoped memory ===");
try {
  const memoryPath = process.env.LOCAL_MEMORY_PATH || ".shadowsage/memory.json";
  line(`  ✓ local memory path: ${memoryPath}`);
  line("  ✓ no external memory service required");
} catch (e) {
  failures++;
  line(`  ✗ Local memory check failed: ${e?.message || e}`);
}

line(`\n=== RESULT: ${failures === 0 ? "ALL PASSED" : failures + " CHECK(S) FAILED"} ===`);
process.exit(failures === 0 ? 0 : 1);
