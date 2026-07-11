const endpoint = (process.env.QVAC_RUNTIME_ENDPOINT || process.env.QVAC_BASE_URL || "").replace(/\/+$/, "");
const path = process.env.QVAC_CHAT_COMPLETIONS_PATH || "/v1/chat/completions";
const qvacUrl =
  process.env.QVAC_CHAT_COMPLETIONS_URL ||
  (endpoint ? `${endpoint}${path.startsWith("/") ? path : `/${path}`}` : "");
const model = process.env.QVAC_MODEL_ID || "";

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

console.log("=== QVAC local model probe ===");
if (!qvacUrl || !model) {
  console.log("  ✗ QVAC_RUNTIME_ENDPOINT / QVAC_MODEL_ID not set");
} else {
  try {
    const res = await fetch(qvacUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.QVAC_API_KEY
          ? { authorization: `Bearer ${process.env.QVAC_API_KEY}` }
          : {}),
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Reply with exactly: PONG" }],
        temperature: 0,
        stream: false,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    console.log(`  ✓ ${model} -> "${textFromPayload(await res.json()).trim().slice(0, 20)}"`);
  } catch (e) {
    const msg = (e?.message || String(e)).split("\n")[0].slice(0, 110);
    console.log(`  ✗ ${model || "QVAC"} -> ${msg}`);
  }
}
