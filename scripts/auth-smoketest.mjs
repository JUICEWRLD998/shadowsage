/**
 * Auth smoke test — exercises the full wallet sign-in handshake against the
 * running dev server using a real Sui keypair (no browser wallet needed).
 *
 *   nonce → signPersonalMessage → verify → session → logout → session
 *
 * Run: node scripts/auth-smoketest.mjs [baseUrl]
 */

import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

const BASE = process.argv[2] || "http://localhost:3939";

// A simple cookie jar so the nonce + session cookies flow between requests,
// exactly like a browser would carry them.
const jar = new Map();
function storeCookies(res) {
  // Node fetch exposes set-cookie via getSetCookie() (undici).
  const raw = res.headers.getSetCookie?.() ?? [];
  for (const line of raw) {
    const [pair] = line.split(";");
    const eq = pair.indexOf("=");
    if (eq < 0) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (value === "" ) jar.delete(name);
    else jar.set(name, value);
  }
}
function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}
async function call(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...(init.headers || {}), cookie: cookieHeader() },
  });
  storeCookies(res);
  return res;
}

const ok = (label) => console.log(`\x1b[32m✓\x1b[0m ${label}`);
const fail = (label, extra) => {
  console.log(`\x1b[31m✗ ${label}\x1b[0m${extra ? ` — ${extra}` : ""}`);
  process.exitCode = 1;
};

async function main() {
  const kp = new Ed25519Keypair();
  const address = kp.getPublicKey().toSuiAddress();
  console.log(`Test wallet: ${address}\n`);

  // 0. Fresh session should be null.
  let j = await (await call("/api/auth/session")).json();
  j.address === null ? ok("fresh session is null") : fail("fresh session not null", JSON.stringify(j));

  // 1. Get a nonce challenge.
  const nonceRes = await call("/api/auth/nonce");
  const { message } = await nonceRes.json();
  message && jar.has("sp_nonce")
    ? ok("nonce issued + cookie set")
    : fail("nonce missing or cookie not set");

  // 2. Sign the EXACT message bytes the server will rebuild.
  const messageBytes = new TextEncoder().encode(message);
  const { signature } = await kp.signPersonalMessage(messageBytes);
  ok("signed message with wallet key");

  // 3. Verify — server checks the signature, sets the session cookie.
  const verifyRes = await call("/api/auth/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address, signature }),
  });
  const verifyJson = await verifyRes.json();
  if (verifyRes.ok && verifyJson.address === address.toLowerCase()) {
    ok(`verify succeeded → ${verifyJson.address}`);
  } else {
    fail("verify failed", `${verifyRes.status} ${JSON.stringify(verifyJson)}`);
  }
  jar.has("sp_session") ? ok("session cookie set") : fail("no session cookie");

  // 4. Session now reflects the verified address.
  j = await (await call("/api/auth/session")).json();
  j.address === address.toLowerCase()
    ? ok("session reflects verified wallet")
    : fail("session mismatch", JSON.stringify(j));

  // 5. A protected route should now pass auth (200, not 401).
  const predRes = await call("/api/predictions?limit=1");
  predRes.status === 200
    ? ok("protected route /api/predictions returns 200 with session")
    : fail("protected route did not accept session", `status ${predRes.status}`);

  // 6. Nonce should be single-use — replaying the same signature must fail.
  const replay = await call("/api/auth/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address, signature }),
  });
  // sp_nonce was burned on first verify; replay should be rejected.
  replay.status >= 400
    ? ok("nonce is single-use (replay rejected)")
    : fail("replay was accepted — nonce not burned", `status ${replay.status}`);

  // 7. Logout clears the session.
  await call("/api/auth/logout", { method: "POST" });
  j = await (await call("/api/auth/session")).json();
  j.address === null ? ok("logout cleared session") : fail("session survived logout", JSON.stringify(j));

  // 8. Tampered signature must be rejected (negative test).
  const n2 = await (await call("/api/auth/nonce")).json();
  const badSig = (await kp.signPersonalMessage(new TextEncoder().encode("not the message"))).signature;
  const badRes = await call("/api/auth/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address, signature: badSig }),
  });
  badRes.status === 401
    ? ok("wrong-message signature rejected (401)")
    : fail("bad signature was accepted", `status ${badRes.status}`);

  // 9. Protected route without any session is 401.
  jar.clear();
  const unauth = await call("/api/predictions?limit=1");
  unauth.status === 401
    ? ok("protected route returns 401 without session")
    : fail("protected route reachable without auth", `status ${unauth.status}`);

  console.log(
    process.exitCode ? "\n\x1b[31mSOME CHECKS FAILED\x1b[0m" : "\n\x1b[32mALL CHECKS PASSED\x1b[0m",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
