/**
 * /api/shadow — the Shadow's control surface.
 *
 *   GET → { active, eligibility, shadow? }
 *         Current Shadow status. If it has spawned, returns its public persona.
 *         If not, returns whether the user is now eligible for emergence.
 *
 *   POST { action: "emerge" }  → { emerged, shadow? }
 *         Spawn the Shadow now (generate + persist persona). Idempotent: if one
 *         already exists it's returned as-is rather than duplicated.
 *
 *   POST { action: "respond", messages } → { text }
 *         Generate the Shadow's in-chat interjection for the given conversation.
 *         Empty text means it chose to stay silent.
 *
 * Everything degrades gracefully when MemWal / QVAC is unavailable.
 */

import type { UIMessage } from "ai";
import { isQvacConfigured } from "@/lib/qvac";
import {
  checkEligibility,
  emergeShadow,
  getShadowSnapshot,
  generateShadowReply,
  type ShadowSnapshot,
} from "@/lib/shadowEngine";
import { requireSession } from "@/lib/auth/session";

export const maxDuration = 30;

/** The Shadow's client-facing shape — never leaks raw memory blocks. */
function publicShadow(snap: ShadowSnapshot) {
  return {
    active: true,
    activatedAt: snap.activatedAt,
    tone: snap.personality.tone,
    catchphrase: snap.personality.catchphrase,
    emergenceMessage: snap.personality.emergenceMessage,
    record: snap.record,
  };
}

export async function GET() {
  const auth = await requireSession();
  if (auth instanceof Response) return auth;

  const existing = await getShadowSnapshot(auth);
  if (existing) {
    return Response.json({ active: true, shadow: publicShadow(existing) });
  }

  const eligibility = await checkEligibility(auth);
  return Response.json({ active: false, eligibility });
}

interface ShadowPostBody {
  action?: "emerge" | "respond";
  messages?: UIMessage[];
}

export async function POST(req: Request) {
  const auth = await requireSession();
  if (auth instanceof Response) return auth;

  let body: ShadowPostBody;
  try {
    body = (await req.json()) as ShadowPostBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isQvacConfigured()) {
    return Response.json(
      {
        error:
          "QVAC local runtime is not configured. Set QVAC_RUNTIME_ENDPOINT and QVAC_MODEL_ID.",
      },
      { status: 503 },
    );
  }

  // ── Spawn ────────────────────────────────────────────────────────────────
  if (body.action === "emerge") {
    // Don't double-spawn — return the existing Shadow if it's already awake.
    const existing = await getShadowSnapshot(auth);
    if (existing) {
      return Response.json({ emerged: false, shadow: publicShadow(existing) });
    }

    const eligibility = await checkEligibility(auth);
    if (!eligibility.eligible) {
      return Response.json({ emerged: false, eligibility });
    }

    const snap = await emergeShadow(auth);
    if (!snap) {
      return Response.json(
        { emerged: false, error: "Emergence failed." },
        { status: 502 },
      );
    }
    return Response.json({ emerged: true, shadow: publicShadow(snap) });
  }

  // ── Interject ────────────────────────────────────────────────────────────
  if (body.action === "respond") {
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return Response.json(
        { error: "`messages` is required for action 'respond'." },
        { status: 400 },
      );
    }

    const snap = await getShadowSnapshot(auth);
    if (!snap) return Response.json({ text: "" }); // not awake → silent

    const text = await generateShadowReply(body.messages, snap, auth);
    return Response.json({ text });
  }

  return Response.json({ error: "Unknown action." }, { status: 400 });
}
