# 🎭 Shadow Pundit

> The AI World Cup companion that spawns your evil twin.

Shadow Pundit is an AI football-prediction companion for the **FIFA World Cup 2026**. It feels like a friendly pundit at first — but quietly it learns your cognitive biases, and once it knows you well enough, it **spawns an adversarial "Shadow" twin** that argues against your every pick using your own history as ammunition.

Built for the **Walrus Memory World Cup** hackathon. Every prediction, bias, and Shadow thought is stored as persistent semantic memory on **Walrus** — so your Shadow remembers you across sessions and devices.

---

## ✨ What it does

- **🗣️ Talks football** — a streaming AI chat that discusses tactics, form, and helps you make predictions.
- **🧠 Learns your biases** — silently analyses your reasoning and detects patterns (star-player bias, recency bias, always backing the favourites, and more).
- **🎭 Spawns your Shadow** — once you've made enough predictions and a bias is detected, an adversarial twin *emerges* in a dramatic awakening, then argues against your picks with receipts from your own history.
- **⚔️ Prediction Arena** — tracks You vs. Shadow accuracy on real, completed World Cup matches.
- **🧬 Bias DNA** — an interactive double-helix visualising your prediction psychology.
- **🔥 Roast engine + shareable report card** — when the Shadow calls it right, it roasts you; export the card as an image.
- **🏅 Leaderboard** — ranks connected users against each other (memory at scale).

---

## 🏗️ How it works

```
┌──────────────────────────────────────────────────────────┐
│                  Next.js app (Vercel)                      │
│                                                            │
│   Browser ──► Sui Wallet sign-in ──► verified session      │
│      │                                                     │
│      ▼                                                     │
│   Pages: Chat · Arena · Profile · Calls · Leaderboard      │
│      │                                                     │
│      ▼                                                     │
│   API routes (serverless)                                  │
│   /api/chat · /api/predictions · /api/bias · /api/shadow   │
│   /api/roast · /api/arena · /api/leaderboard · /api/auth/* │
└───────┬───────────────┬───────────────────┬───────────────┘
        │               │                   │
        ▼               ▼                   ▼
   Walrus Memory     Google Gemini      WorldCup26.ir
   (via MemWal)      (chat + analysis)  (live fixtures)
```

**The core loop:** you chat → a prediction is extracted and stored on Walrus → after 3+ predictions a bias analysis runs → once a bias is found, the Shadow emerges → from then on it interjects with counter-takes grounded in everything it remembers about you.

**Per-user privacy:** your identity is your **Sui wallet address**, proven by signing a message (no transaction, no gas). Every memory namespace is scoped to that address, so one wallet's data never bleeds into another's.

---

## 🦭 How Walrus Memory is used

Walrus Memory (via [MemWal](https://www.npmjs.com/package/@mysten-incubation/memwal)) is the long-term brain of the Shadow — it's where everything the agent learns about you actually lives. Every prediction you make, every bias the analyser detects, the Shadow's evolving persona, and key conversation moments are written as natural-language memories to Walrus through the MemWal relayer (a TEE that handles encryption, embedding, and blob storage server-side). On each turn the agent **semantically recalls** the most relevant memories for what you're talking about and feeds them back into the prompt, so the Shadow argues with receipts from your own history instead of a blank slate. Memories are namespaced per Sui wallet address (`predictions::0xabc…`, `bias-profile::0xabc…`, etc.), so your data is private to you and persists across sessions and devices. The result: the agent doesn't reset between visits — it genuinely remembers, holds grudges, and gets sharper the more you use it.

---

## 🧠 The Memory Moment

A concrete before/after of what persistent Walrus memory buys you — the same user, the same blind spot, four days apart.

### Day 1 — the agent has no past to hold against you

> **You:** Portugal are going to walk all over Congo. I'm *confident* — Ronaldo leads them to the win, no question.
>
> **Shadow Pundit:** Bold call. Locking in **Portugal to beat Congo**, high confidence, Ronaldo-led. Good luck out there. 🎯

The prediction is extracted and written to Walrus:
`"User confidently predicted Portugal to beat Congo, citing Ronaldo as the deciding factor. Confidence: HIGH."`

…then Congo pull off the upset. The prediction is marked **wrong** in the Arena, and that outcome is remembered too.

### Day 4 — the agent recalls Day 1 and mocks you with it

> **You:** Alright, Portugal vs Uzbekistan. Easy one — Portugal win, I'm confident.
>
> **🎭 Shadow Pundit:** Oh, *confident* again? That's adorable. Last time you were "confident," Ronaldo was going to walk Portugal through Congo — and Congo sent you home crying. Now it's Uzbekistan, and the same crush on a number 7 is doing your thinking for you. Same hubris, same blind spot. I'll take Uzbekistan's value, thanks. 🔥

Behind that reply, on this turn the agent ran a semantic `recall` over your memory namespace, surfaced the Day 1 confident-Portugal-Ronaldo prediction **and** its losing result, and the Shadow weaponised it. Nothing was hard-coded — the only reason it could land that roast is that the memory was sitting in Walrus, waiting, across four days and (if you'd switched devices) across machines. **That** is the memory moment: an agent that doesn't just respond, but remembers, learns your blind spots, and uses them against you.

---

## 🧰 Tech stack

| Layer | Choice |
|-------|--------|
| Framework | **Next.js** (App Router) + TypeScript |
| AI | **Google Gemini** served through **OpenRouter** via the Vercel AI SDK (`@openrouter/ai-sdk-provider`) |
| Memory | **Walrus** via **MemWal** (`@mysten-incubation/memwal`) |
| Auth / identity | **Sui wallet** sign-in (`@mysten/dapp-kit` + signed-nonce session) |
| Football data | **WorldCup26.ir** (free live fixtures & results) |
| Styling | Vanilla **CSS Modules** + CSS variables |
| Animation | **Framer Motion**, **GSAP**, **React Three Fiber** (3D awakening) |
| Charts / export | Recharts, html-to-image |

---

## 🚀 Getting started

### 1. Install
```bash
npm install
```

### 2. Configure environment
Copy the template and fill in your keys:
```bash
cp .env.example .env.local
```

| Variable | Required | What it's for |
|----------|:---:|---------------|
| `OPENROUTER_KEY` | ✅ | OpenRouter API key ([openrouter.ai/keys](https://openrouter.ai/keys)) — serves Gemini |
| `MEMWAL_DELEGATE_KEY` | ✅ | Walrus Memory delegate key |
| `MEMWAL_ACCOUNT_ID` | ✅ | Walrus Memory account ID |
| `SESSION_SECRET` | ✅ (prod) | Signs session cookies — any long random string |
| `NEXT_PUBLIC_SUI_NETWORK` | – | `mainnet` (default) or `testnet` |
| `CHAT_MODEL` | – | Chat model override (default `google/gemini-2.5-flash`) |
| `ANALYSIS_MODEL` | – | Analysis model override (default `google/gemini-2.5-flash`) |
| `MEMWAL_SERVER_URL` | – | MemWal relayer URL (defaults to the public relayer) |
| `MEMWAL_NAMESPACE` | – | Top-level memory namespace (default `shadowpundit`) |

> Generate a session secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 3. Run
```bash
npm run dev
```
Open the URL it prints (usually **http://localhost:3000**). You'll need a **Sui wallet** extension to sign in.

---

## 📁 Project structure

```
src/
├── app/
│   ├── page.tsx              Landing page (public)
│   ├── chat/                 Main chat + Shadow experience
│   ├── arena/                You vs Shadow accuracy
│   ├── profile/              Bias DNA + report card
│   ├── calls/                Prediction history
│   ├── leaderboard/          Cross-user rankings
│   └── api/                  Serverless routes (chat, shadow, auth, …)
├── components/               UI by feature (chat, arena, profile, auth, …)
├── context/                  AuthContext (wallet → session)
├── hooks/                    useShadowState, usePredictions, …
├── lib/                      Engines: shadowEngine, biasDetector, memwal, auth, scoring, worldcup
├── prompts/                  AI system prompts
└── types/                    Shared TypeScript types
```

---

## 🔐 Authentication

Sign-in is a passwordless wallet handshake:

```
connect wallet → GET /api/auth/nonce → wallet signs the nonce
   → POST /api/auth/verify (server checks the signature)
   → HMAC-signed httpOnly session cookie → you're in
```

The verified wallet address *is* your account. Protected API routes are guarded server-side, and signing a message is free (it never submits a transaction).

*Powered by Walrus Memory 🦭*
