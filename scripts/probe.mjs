import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { MemWal } from "@mysten-incubation/memwal";

// ---- Gemini via OpenRouter: probe each model -------------------------------
console.log("=== Gemini (via OpenRouter) model probe ===");
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_KEY || process.env.OPENROUTER_API_KEY,
});
const models = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "google/gemini-2.5-pro",
];
for (const m of models) {
  try {
    const { text } = await generateText({
      model: openrouter.chat(m),
      prompt: "Reply with exactly: PONG",
    });
    console.log(`  ✓ ${m} -> "${text.trim().slice(0, 20)}"`);
  } catch (e) {
    const msg = (e?.message || String(e)).split("\n")[0].slice(0, 90);
    console.log(`  ✗ ${m} -> ${msg}`);
  }
}

// ---- MemWal: try both relayers --------------------------------------------
console.log("\n=== MemWal relayer probe ===");
const servers = [
  "https://relayer.memory.walrus.xyz",
  "https://relayer.memwal.ai",
];
for (const serverUrl of servers) {
  try {
    const memwal = MemWal.create({
      key: process.env.MEMWAL_DELEGATE_KEY,
      accountId: process.env.MEMWAL_ACCOUNT_ID,
      serverUrl,
      namespace: process.env.MEMWAL_NAMESPACE || "shadowpundit",
    });
    const token = `probe-${Date.now()}`;
    await memwal.rememberAndWait(`probe ${token}`, "conversations", { timeoutMs: 30000 });
    console.log(`  ✓ ${serverUrl} -> remember OK`);
  } catch (e) {
    const msg = (e?.message || String(e)).split("\n")[0].slice(0, 110);
    console.log(`  ✗ ${serverUrl} -> ${msg}`);
  }
}
