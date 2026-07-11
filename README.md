# ShadowSage

> Local AI football predictions with self-custodial fan stakes.

ShadowSage is a privacy-first football prediction companion for the **Tether Developers Cup**. Fans talk through upcoming World Cup matches, make score predictions, and get challenged by an adversarial Shadow that learns their football blind spots from their own calls.

The new build targets the **QVAC** and **WDK** tracks:

- **QVAC primary track:** all AI behavior runs through the local QVAC adapter: chat, prediction extraction, bias analysis, Shadow persona, counter-picks, and roasts.
- **WDK secondary track:** wallet identity, signed prediction commitments, and USDt stake/tip flows are planned to use Tether's Wallet Development Kit.
- **Football data:** fixtures and results are fetched through the existing football data adapter using `FOOTBALL_DATA_API_KEY`.

This repository began as a previous hackathon project. For the Tether Developers Cup, the scored work is the ShadowSage pivot: replacing the old cloud-AI, wallet, and remote-memory assumptions with local QVAC intelligence and WDK self-custody.

## What It Does

- **Talks football:** a prediction-focused companion helps users reason through fixtures, tactics, scorelines, and confidence.
- **Extracts predictions naturally:** users chat normally; ShadowSage turns committed takes into structured match predictions.
- **Learns prediction bias:** after enough calls, local AI identifies patterns such as star-player bias, recency bias, favourite bias, and revenge picking.
- **Spawns the Shadow:** an adversarial counter-voice argues against the user's picks using their own past reasoning as evidence.
- **Scores the Arena:** predictions are resolved against real match results so users can see whether they or their Shadow called it better.
- **Prepares USDt fan stakes:** users can back calls with WDK-powered signed commitments or testnet USDt flows as integration matures.

## Target Architecture

```text
┌──────────────────────────────────────────────────────────┐
│                    Next.js app                            │
│                                                          │
│   Browser ──► WDK wallet/session ──► ShadowSage UI        │
│      │                                                   │
│      ▼                                                   │
│   Pages: Chat · Arena · Calls · Profile · Leaderboard     │
│      │                                                   │
│      ▼                                                   │
│   API/routes + local services                             │
│   /api/chat · /api/predictions · /api/bias · /api/shadow  │
│   /api/roast · /api/arena · /api/matches · /api/stakes    │
└───────┬──────────────────────┬───────────────────────────┘
        │                      │
        ▼                      ▼
   QVAC local AI          WDK wallet primitives
   no cloud AI keys       self-custody + signing
        │
        ▼
   football-data.org fixtures/results
```

## Core Loop

1. Connect or create a WDK wallet.
2. Ask ShadowSage about a match or make a prediction in chat.
3. QVAC extracts the prediction locally.
4. QVAC analyzes the user's reasoning patterns locally.
5. The Shadow emerges once enough prediction history exists.
6. The user optionally backs a call with a USDt stake or signed commitment.
7. Arena resolves predictions against match results and shows the outcome.

## Football Data

The repository already includes a football data adapter in `src/lib/worldcup.ts`.

Use this environment variable in `.env.local`:

```bash
FOOTBALL_DATA_API_KEY=your_football_data_api_key
```

Optional variables already supported by the adapter:

```bash
FOOTBALL_DATA_URL=https://api.football-data.org/v4
FOOTBALL_DATA_COMPETITION=WC
FOOTBALL_DATA_SEASON=2026
```

If the key is missing or the API is unavailable, the app falls back to seeded fixtures so the demo remains usable.

## QVAC Local AI

All product AI behavior routes through `src/lib/qvac.ts`. The adapter expects a local QVAC runtime with a chat-completions style endpoint by default:

```bash
QVAC_RUNTIME_ENDPOINT=http://localhost:11434
QVAC_CHAT_COMPLETIONS_PATH=/v1/chat/completions
QVAC_MODEL_ID=your_local_qvac_model_id
QVAC_TIMEOUT_MS=30000
```

If the runtime or model is unavailable, chat and Shadow routes return recoverable errors and the chat page shows the QVAC status badge.

## Local Memory

Prediction history, bias profiles, Shadow state, conversation summaries, and later stake records are stored locally through `src/lib/memory.ts`. By default the demo writes to:

```bash
LOCAL_MEMORY_PATH=.shadowsage/memory.json
```

Records are scoped by the verified wallet/session address so one wallet's predictions and Shadow state do not bleed into another wallet.

## Outside Services

- Submission disclosure: Outside service used: football fixture/result data via football-data.org. All AI runs locally through QVAC.
- AI: final Tether Developers Cup build must use QVAC locally, with no cloud AI API keys.
- Wallets/payments: final Tether Developers Cup build must use WDK directly for wallet identity, signing, and USDt-related primitives.

## Getting Started

### 1. Install

```bash
npm install
```

### 2. Configure Environment

Create `.env.local`:

```bash
FOOTBALL_DATA_API_KEY=your_football_data_api_key
FOOTBALL_DATA_URL=https://api.football-data.org/v4
FOOTBALL_DATA_COMPETITION=WC
FOOTBALL_DATA_SEASON=2026

# Local QVAC runtime.
QVAC_RUNTIME_ENDPOINT=your_local_qvac_runtime_endpoint
QVAC_CHAT_COMPLETIONS_PATH=/v1/chat/completions
QVAC_MODEL_ID=your_local_qvac_model_id
QVAC_TIMEOUT_MS=30000

# Local wallet-scoped memory.
LOCAL_MEMORY_PATH=.shadowsage/memory.json

# Placeholder values until Phase 5 integration finalizes exact WDK requirements.
WDK_NETWORK=testnet
WDK_APP_ID=shadowsage
WDK_USDT_ASSET_ID=your_usdt_asset_id
```

Or copy `.env.example`:

```bash
cp .env.example .env.local
```

### 3. Run

```bash
npm run dev
```

Open the local URL printed by Next.js, usually `http://localhost:3000`.

## Current Implementation Status

Phase 1 through Phase 4 are complete: ShadowSage rebrand, football-data.org fixture/result integration, QVAC-only product AI routing, and local wallet-scoped memory are in place. The existing codebase still contains previous wallet integration code while WDK is being integrated in Phase 5. See `implementation.md` for the full phased plan.

## Project Structure

```text
src/
├── app/
│   ├── page.tsx              Landing page
│   ├── chat/                 Main prediction chat
│   ├── arena/                Prediction scoring
│   ├── profile/              Bias DNA and report card
│   ├── calls/                Prediction history
│   ├── leaderboard/          Rivalry board
│   └── api/                  Route handlers
├── components/               UI by feature
├── context/                  Auth/session context
├── hooks/                    Feature hooks
├── lib/                      Engines and adapters
├── prompts/                  AI prompts
└── types/                    Shared TypeScript types
```

## License

Add an MIT or Apache 2.0 license before submission, per Tether Developers Cup requirements.
