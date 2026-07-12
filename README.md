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
LOCAL_MEMORY_FILE=memory.json
```

Records are scoped by the verified wallet/session address so one wallet's predictions and Shadow state do not bleed into another wallet.

## Outside Services

- Submission disclosure: Outside service used: football fixture/result data via football-data.org. All AI runs locally through QVAC.
- AI: final Tether Developers Cup build must use QVAC locally, with no cloud AI API keys.
- Wallets/payments: final Tether Developers Cup build must use WDK directly for wallet identity, signing, and USDt-related primitives.

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

**Important:** If you encounter timeout issues during installation, the following packages are required for WDK wallet functionality:

```bash
npm install @tetherto/wdk @tetherto/wdk-wallet-evm ethers
```

These packages enable:
- `@tetherto/wdk` - Core WDK wallet orchestration
- `@tetherto/wdk-wallet-evm` - Ethereum and EVM-compatible chain support
- `ethers` - Ethereum signature verification

### 2. Configure Environment

Create `.env.local`:

```bash
# Football data
FOOTBALL_DATA_API_KEY=your_football_data_api_key
FOOTBALL_DATA_URL=https://api.football-data.org/v4
FOOTBALL_DATA_COMPETITION=WC
FOOTBALL_DATA_SEASON=2026

# Local QVAC runtime
QVAC_RUNTIME_ENDPOINT=http://localhost:11434
QVAC_CHAT_COMPLETIONS_PATH=/v1/chat/completions
QVAC_MODEL_ID=your_local_qvac_model_id
QVAC_TIMEOUT_MS=30000

# Local wallet-scoped memory
LOCAL_MEMORY_FILE=memory.json

# WDK wallet configuration (browser-side)
NEXT_PUBLIC_WDK_EVM_PROVIDER=https://eth.llamarpc.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
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

### 4. Test WDK Wallet Integration

**First Time Setup:**

1. Navigate to any protected route (e.g., `/chat`, `/arena`, `/profile`)
2. You'll see the AuthGate with "Create or Restore Wallet" button
3. Click the button to create a new WDK wallet
4. **IMPORTANT:** A browser alert will show your 12-word seed phrase
5. **Back up this seed phrase immediately** - it's the only way to recover your wallet
6. The wallet will automatically sign in after creation

**Wallet Features:**

- **Self-custodial:** Your seed phrase is stored encrypted in browser localStorage
- **Never leaves your device:** All wallet operations happen client-side
- **Ethereum-compatible:** Uses standard EVM addresses and EIP-191 signatures
- **Balance display:** NavWallet badge shows your ETH balance (refreshes every 30s)
- **Session-based auth:** Signed message proves wallet ownership without passwords

**Testing the Flow:**

1. **Create wallet:** Click "Create or Restore Wallet" → save seed phrase
2. **Auto sign-in:** Wallet automatically signs a nonce to create session
3. **Check balance:** Look for balance in the wallet badge (top-right)
4. **Make predictions:** Chat interface should now be accessible
5. **Disconnect:** Click logout button to clear session
6. **Reconnect:** Refresh page - wallet auto-connects from localStorage
7. **Restore:** Delete wallet from localStorage, then restore using seed phrase

**Troubleshooting:**

- **"Module not found" errors:** Run `npm install` again to ensure all packages installed
- **Balance shows 0 ETH:** Normal for new wallets - use a testnet faucet to get test ETH
- **Signature verification fails:** Check that `NEXT_PUBLIC_WDK_EVM_PROVIDER` is set correctly
- **Wallet won't connect:** Clear browser localStorage and create a new wallet
- **Lost seed phrase:** Cannot recover - wallet is permanently lost (this is self-custody)

**RPC Endpoints:**

The default provider (`https://eth.llamarpc.com`) is Ethereum mainnet. For testing:

- **Sepolia testnet:** `https://sepolia.drpc.org`
- **Polygon Mumbai:** `https://rpc-mumbai.maticvigil.com`
- **Local node:** `http://localhost:8545`

Update `NEXT_PUBLIC_WDK_EVM_PROVIDER` in `.env.local` to switch networks.

## Current Implementation Status

**Phase 1-4:** ✅ Complete - ShadowSage rebrand, football-data.org integration, QVAC-only AI routing, and local wallet-scoped memory are in place.

**Phase 5:** ✅ Complete - WDK wallet integration:
- ✅ Removed Sui wallet dependencies
- ✅ Created WDK wallet service adapter (`src/lib/wdk.ts`)
- ✅ Browser-based self-custodial wallet with seed phrase management
- ✅ Updated all auth components (AuthGate, NavWallet, WalletBadge)
- ✅ Ethereum signature verification (EIP-191)
- ✅ Balance display and session management
- ✅ Updated environment configuration

**Phase 6:** 🚧 Next - USDt fan stake flow with WDK payment primitives

See `implementation.md` for the full phased plan.

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
