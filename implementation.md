# ShadowSage Implementation Plan

## Summary

Rebuild the existing Shadow Pundit app into **ShadowSage** for the Tether Developers Cup.

ShadowSage is a privacy-first football prediction companion where:

- **QVAC** runs all AI locally: chat, prediction extraction, bias analysis, Shadow persona, counter-picks, and roasts.
- **WDK** powers self-custodial wallet identity, signed prediction commitments, and USDt stake/tip flows.
- **football-data.org** or the already integrated football data adapter fetches World Cup fixtures/results using `FOOTBALL_DATA_API_KEY`.
- The existing polished UI remains mostly intact, with copy and integration changes instead of a full redesign.

The core product loop stays strong: users make football predictions, local AI learns their bias, an adversarial Shadow argues against them, and users can back calls with self-custodial USDt commitments.

## Phase 1: Rebrand And Old-Stack Cleanup

**Status: Complete.** Visible product copy, metadata, README positioning, navbar branding, auth-gate wording, and old-stack user-facing references have been updated for ShadowSage. Deeper Sui wallet internals remain intentionally in place until the dedicated WDK phase.

- Rename visible product copy from **Shadow Pundit** to **ShadowSage**.
- Replace old hackathon positioning with Tether Developers Cup positioning:
  - QVAC primary track
  - WDK secondary track
  - football prediction and fan stake product
- Remove or replace user-facing references to the old remote-memory, wallet, and cloud-AI stack.
- Keep the existing app routes:
  - Home
  - Chat
  - Arena
  - Calls
  - Profile
  - Leaderboard, if still useful
- Update metadata:
  - title
  - description
  - Open Graph labels
  - app name
  - navbar brand text/alt text
- Update README to explain the new app direction and clearly disclose earlier work.

## Phase 2: Football Match Data

**Status: Complete.** The football-data.org adapter remains in `src/lib/worldcup.ts`, uses `FOOTBALL_DATA_API_KEY` plus optional URL/competition/season config, exposes all/upcoming/completed match selection through `/api/matches`, supports prompt formatting for chat grounding, and preserves seeded fallback fixtures when the live API is unavailable.

- Keep the existing football data integration in `src/lib/worldcup.ts`.
- Use the existing environment variable:
  - `FOOTBALL_DATA_API_KEY`
- Keep optional existing config variables if already supported:
  - `FOOTBALL_DATA_URL`
  - `FOOTBALL_DATA_COMPETITION`
- Add `.env.example` with:
  - `FOOTBALL_DATA_API_KEY=your_football_data_api_key`
  - QVAC-related placeholders once SDK requirements are known
  - WDK-related placeholders once SDK requirements are known
- Keep `.env.local` untracked.
- Confirm fixture fetching supports:
  - all matches
  - upcoming matches
  - completed matches
  - prompt formatting
- Preserve fallback fixtures so the demo works even if the API key is missing or the API fails.
- README disclosure:
  - "Outside service used: football fixture/result data via football-data.org. All AI runs locally through QVAC."

## Phase 3: QVAC AI Integration

**Status: Complete.** Product AI behavior now routes through `src/lib/qvac.ts`, a local QVAC runtime adapter with configurable endpoint/model settings. Chat streaming, prediction extraction, bias detection, Shadow persona generation, Shadow replies, and roasts no longer use Gemini/OpenRouter provider checks. The chat UI exposes a QVAC local/private/no-cloud status badge and routes return recoverable unavailable states when the local runtime is not configured.

- Replace the cloud AI provider layer with a QVAC provider layer.
- All AI behavior must use QVAC:
  - `/api/chat`
  - prediction extraction
  - bias detection
  - Shadow emergence/persona generation
  - Shadow counter-replies
  - roasts
- Remove OpenRouter/Gemini API key checks from product behavior.
- Add a QVAC status indicator in the app:
  - local model active
  - no cloud AI keys
  - private inference
- Keep current prompt architecture but update prompt language for:
  - ShadowSage
  - local AI
  - football predictions
  - USDt-backed fan calls
- Add recoverable UI states if QVAC runtime/model is unavailable.

## Phase 4: Local Wallet-Scoped Memory

**Status: Complete.** The memory backend now uses `src/lib/memory.ts`, a local JSON store scoped by verified wallet/session address. Existing helpers (`rememberAsync`, `recallMemories`, `scopeNs`, and `isMemoryConfigured`) are preserved for predictions, bias profiles, Shadow state, leaderboard rows, conversation summaries, and future stake records. The demo memory file defaults to `.shadowsage/memory.json` and is git-ignored.

- Replace old remote-memory-backed storage with local-first memory.
- Keep the existing helper shape where practical:
  - `rememberAsync`
  - `recallMemories`
  - `scopeNs`
  - `isMemoryConfigured`
- Store data scoped by WDK wallet address:
  - predictions
  - bias profiles
  - Shadow state
  - conversation summaries
  - stake records
- Prefer structured local records, while still creating compact text summaries for QVAC prompts.
- Maintain the existing Shadow eligibility loop:
  - after enough predictions
  - after at least one detected bias
  - spawn the Shadow persona

## Phase 5: WDK Wallet Integration

**Status: Complete.** WDK wallet integration is fully implemented with browser-based self-custodial wallets, seed phrase management, Ethereum signature verification (EIP-191), balance display, and complete session management. All Sui wallet dependencies have been removed.

### Completed Items:
- ✅ Removed Sui wallet provider (`@mysten/dapp-kit`, `@mysten/seal`, `@mysten/sui`)
- ✅ Added WDK wallet dependencies (`@tetherto/wdk`, `@tetherto/wdk-wallet-evm`, `ethers`)
- ✅ Created WDK wallet service adapter (`src/lib/wdk.ts`)
  - Browser-based seed phrase management with localStorage
  - Wallet creation with random 12-word seed phrase
  - Wallet restore from existing seed phrase
  - Message signing with EIP-191 standard
  - Balance checking (ETH/native token)
  - Secure disconnect and wallet deletion
- ✅ Updated auth API routes for WDK
  - `/api/auth/verify` uses `ethers.verifyMessage()` for EIP-191 signatures
  - Nonce-based challenge/response authentication
  - Address recovery from signature
- ✅ Updated all auth components
  - `AuthGate`: "Connect your Tether-compatible wallet" UI
  - `AuthContext`: WDK wallet lifecycle management
  - `NavWallet`: Custom connect button with WDK service
  - `WalletBadge`: Address display with ETH balance (30s refresh)
- ✅ Updated app layout
  - Removed `SuiProvider` wrapper (not needed for WDK)
  - Simplified provider tree
- ✅ Updated environment configuration
  - `NEXT_PUBLIC_WDK_EVM_PROVIDER` for RPC endpoint
  - Testnet support (Sepolia, Polygon, Arbitrum)
- ✅ Documentation
  - README.md with installation and testing instructions
  - WDK-TESTING.md with comprehensive technical guide
  - Troubleshooting and debugging information

### Technical Details:
- Wallet storage: Browser localStorage with XOR obfuscation
- Signature standard: EIP-191 (Ethereum personal_sign)
- Session identity: Verified EVM address (lowercase)
- Balance display: Native chain token (ETH) with 30-second refresh
- Self-custody: Seed phrase never leaves browser, all operations client-side

### Implementation:
- Session identity is the verified WDK wallet address
- Auth gate copy: "Connect your Tether-compatible wallet"
- Memory and predictions remain scoped to wallet address
- Balance display integrated in WalletBadge component
- Explicit sign-out clears session and disconnects wallet (localStorage persists)

## Phase 6: USDt Fan Stake Flow

- Add stake model:
  - `id`
  - `predictionId`
  - `matchId`
  - `walletAddress`
  - `amount`
  - `asset: "USDt"`
  - `status`
  - `signature`
  - `transactionId`
  - `createdAt`
  - `resolvedAt`
- After a prediction is extracted, show a post-prediction action:
  - "Back this call with USDt"
- Use fixed demo-safe amount presets:
  - `1`
  - `5`
  - `10`
- Preferred demo path:
  - real WDK testnet payment/transfer if available
- Fallback path:
  - WDK-signed stake intent, clearly labeled as a signed commitment
- QVAC may recommend whether a prediction is worth backing, but wallet execution always requires explicit user confirmation.

## Phase 7: UI Adaptation

- Preserve the current design system and layout.
- Home:
  - reframe as "Local AI football predictions. Self-custodial fan stakes."
- Chat:
  - add QVAC local model badge
  - add WDK wallet/stake prompt after predictions
- Calls:
  - show prediction history plus stake status
- Arena:
  - show user prediction result
  - show Shadow counter-call/result
  - show stake status/outcome
- Profile:
  - keep Bias DNA
  - explain that the profile is generated locally by QVAC
- Navbar/Auth:
  - replace Sui wallet controls with WDK wallet controls

## Phase 8: Demo Hardening

- Add seeded demo mode for:
  - missing football API key
  - API downtime
  - no completed live matches
- Add clear error/empty states for:
  - QVAC unavailable
  - wallet unavailable
  - football data unavailable
  - payment unavailable
- Ensure judges can run the app locally without any cloud AI key.
- README must include exact judge setup steps:
  - install dependencies
  - add `FOOTBALL_DATA_API_KEY`
  - start QVAC runtime/model
  - run the app
  - connect/create WDK wallet

## Phase 9: Testing And Acceptance

- Run `npm run build`.
- Verify fresh user flow:
  - start app
  - connect/create WDK wallet
  - make prediction
  - QVAC extracts prediction
  - attach USDt stake or signed stake intent
  - make enough predictions to trigger Shadow
  - view Arena/Profile
- Confirm no user-facing references remain to the old product name, old wallet stack, old remote-memory stack, or old cloud-AI stack.
- Confirm `.env.example` exists and `.env.local` remains ignored.
- Confirm README lists outside services.
- Confirm all AI behavior is QVAC-only.

## Immediate Phase 1 Edits

- Create `implementation.md` with this plan.
- Update visible app name to **ShadowSage** in:
  - README
  - app metadata
  - landing page
  - navbar labels/alt text
  - auth gate
  - chat assistant label
  - report card brand
- Replace landing copy:
  - old: "The AI that spawns your evil twin"
  - new: "Local AI football predictions with self-custodial fan stakes"
- Replace old remote-memory powered copy with:
  - "Powered by QVAC local AI + WDK self-custody"
- Replace "Connect Sui Wallet" with:
  - "Connect Wallet"
  - later Phase 5 will wire the actual WDK provider
- Leave deeper code imports intact during Phase 1 unless the build is updated in the same pass.

## Assumptions

- The app name is **ShadowSage**.
- `FOOTBALL_DATA_API_KEY` is the correct football data env key and is already supported by the codebase.
- Football fixture/result APIs are allowed because they are not cloud AI.
- QVAC must be the only AI runtime by final submission.
- WDK must be used directly for wallet identity/signing/payment primitives.
- The first judged demo should target desktop local execution.
- Existing UI quality should be preserved; the priority is integration and hackathon fit, not redesign.
