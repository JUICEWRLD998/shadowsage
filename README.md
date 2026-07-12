# ShadowSage

> Local AI football predictions with self-custodial fan stakes.

ShadowSage is a privacy-first football prediction companion for the **Tether Developers Cup**. Fans talk through upcoming World Cup 2026 matches, make score predictions, and get challenged by an adversarial Shadow that learns their football blind spots from their own calls.

- **QVAC primary track:** all AI behavior — chat, prediction extraction, bias analysis, Shadow persona, counter-picks, and roasts — runs through the local QVAC adapter. No cloud AI keys required.
- **USDt stake flow:** users can back predictions with wallet-signed USDt commitments directly in chat.
- **Football data:** fixtures and results are fetched via football-data.org using `FOOTBALL_DATA_API_KEY`.

> This repository began as a previous hackathon project. For the Tether Developers Cup, the scored work is the ShadowSage pivot: replacing cloud-AI, hosted wallet, and remote-memory assumptions with local QVAC intelligence and browser wallet self-custody.

## What It Does

- **Talks football:** a prediction-focused companion helps users reason through fixtures, tactics, scorelines, and confidence.
- **Extracts predictions naturally:** users chat normally; ShadowSage turns committed takes into structured match predictions stored locally.
- **Learns prediction bias:** after enough calls, QVAC identifies patterns such as star-player bias, recency bias, favourite bias, and revenge picking — all on-device.
- **Spawns the Shadow:** an adversarial counter-voice argues against the user's picks using their own past reasoning as evidence.
- **Scores the Arena:** predictions are resolved against real match results so users can see whether they or their Shadow called it better.
- **USDt fan stakes:** users can back calls with signed USDt commitments (1, 5, or 10 USDt presets) directly after making a prediction.

## Architecture

```text
┌──────────────────────────────────────────────────────────┐
│                    Next.js 16 app                         │
│                                                          │
│   Browser ──► MetaMask/browser wallet ──► ShadowSage UI  │
│      │                                                   │
│      ▼                                                   │
│   Pages: Chat · Arena · Calls · Profile · Leaderboard    │
│      │                                                   │
│      ▼                                                   │
│   API routes + local services                            │
│   /api/chat · /api/predictions · /api/bias · /api/shadow │
│   /api/roast · /api/arena · /api/matches · /api/stakes   │
└───────┬──────────────────────┬───────────────────────────┘
        │                      │
        ▼                      ▼
   QVAC local AI         Browser wallet (MetaMask etc.)
   no cloud AI keys      EIP-1193 · personal_sign · ethers
        │
        ▼
   football-data.org fixtures/results
```

## Core Loop

1. Connect a browser wallet (MetaMask, Phantom, or any injected EIP-1193 wallet).
2. Sign a nonce challenge to create a verified session.
3. Chat about upcoming fixtures and make predictions.
4. QVAC extracts predictions locally and stores them scoped to your wallet.
5. QVAC analyses your reasoning patterns and builds a bias profile.
6. The Shadow emerges once enough prediction history exists.
7. Optionally back a call with a USDt signed stake commitment.
8. Arena resolves predictions against match results and shows outcomes.

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:

```bash
# Football data (get a free key at football-data.org)
FOOTBALL_DATA_API_KEY=your_football_data_api_key

# Local QVAC runtime (e.g. Ollama)
QVAC_RUNTIME_ENDPOINT=http://localhost:11434
QVAC_CHAT_COMPLETIONS_PATH=/v1/chat/completions
QVAC_MODEL_ID=your_local_model_id

# Session signing secret (any random string in production)
SESSION_SECRET=your_session_secret
```

Optional:

```bash
FOOTBALL_DATA_URL=https://api.football-data.org/v4
FOOTBALL_DATA_COMPETITION=WC
FOOTBALL_DATA_SEASON=2026
QVAC_TIMEOUT_MS=30000
LOCAL_MEMORY_FILE=memory.json
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Start the Dev Server

```bash
npm run dev
```

Open `http://localhost:3000`.

### 4. Connect a Wallet

1. Navigate to any protected route (`/chat`, `/arena`, etc.)
2. Click **Connect Wallet** — your browser wallet extension (MetaMask, Phantom, etc.) will pop up
3. Approve the connection
4. Click **Sign to enter** — sign the challenge message to create a verified session (free, no transaction)
5. You're in

> If you don't have a browser wallet installed, install [MetaMask](https://metamask.io) first.

### 5. Make Predictions

Chat naturally about upcoming fixtures. ShadowSage will extract your prediction automatically and prompt you to back it with a USDt stake if you want.

## Football Data

The app includes a football data adapter in `src/lib/worldcup.ts`. If `FOOTBALL_DATA_API_KEY` is missing or the API is unavailable, the app falls back to seeded fixtures so the demo remains usable without an API key.

## QVAC Local AI

All AI routes through `src/lib/qvac.ts`. A compatible local runtime (e.g. [Ollama](https://ollama.com)) must be running with a model loaded. If the runtime is unavailable, the chat page shows a QVAC offline badge and returns a graceful error — no crash.

## Local Memory

Prediction history, bias profiles, Shadow state, and conversation summaries are stored locally in `.shadowsage/memory.json`, scoped by verified wallet address. One wallet's data never bleeds into another.

## Wallet Integration

The app connects to any EIP-1193 browser wallet (`window.ethereum`). No seed phrases are generated or stored by the app — your keys stay in your wallet extension. Auth uses a standard nonce + `personal_sign` flow; the server verifies the signature with `ethers.verifyMessage()`.

## Implementation Status

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Rebrand to ShadowSage | ✅ Complete |
| 2 | Football match data | ✅ Complete |
| 3 | QVAC AI integration | ✅ Complete |
| 4 | Local wallet-scoped memory | ✅ Complete |
| 5 | Browser wallet auth | ✅ Complete |
| 6 | USDt fan stake flow | ✅ Complete |
| 7 | UI adaptation + copy polish | ✅ Complete |
| 8 | Demo hardening | 🚧 Next |
| 9 | Testing and acceptance | ⬜ Pending |

## Outside Services

- **Football fixture/result data:** [football-data.org](https://football-data.org) — used for live fixtures and match results only.
- **All AI:** runs locally through QVAC. No cloud AI API keys used or required.

## Project Structure

```text
src/
├── app/
│   ├── page.tsx              Landing page
│   ├── chat/                 Main prediction chat
│   ├── arena/                Prediction scoring vs Shadow
│   ├── profile/              Bias DNA and report card
│   ├── calls/                Prediction history + stake status
│   ├── leaderboard/          Cross-wallet rivalry board
│   └── api/                  Route handlers
├── components/               UI by feature area
├── context/                  Auth/wallet session context
├── hooks/                    Feature data hooks
├── lib/                      Engines and adapters
│   ├── wdk.ts                Browser wallet connector (EIP-1193)
│   ├── qvac.ts               QVAC local AI adapter
│   ├── memory.ts             Local JSON memory store
│   ├── stakes.ts             In-memory stake store
│   └── worldcup.ts           Football data adapter
├── prompts/                  AI system prompts
└── types/                    Shared TypeScript types
```

## License

MIT — see LICENSE for details.
