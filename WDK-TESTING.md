# WDK Wallet Integration - Testing Guide

This document provides detailed testing instructions for the WDK wallet integration in ShadowSage.

## Architecture Overview

ShadowSage uses a **browser-based, self-custodial WDK wallet** implementation:

```
Browser localStorage (encrypted) ──► WDK wallet service ──► EVM blockchain
         │                                  │
         │                                  ├─► Sign messages (auth)
         │                                  ├─► Check balance
         └─── Seed phrase (12 words)       └─► Send transactions (future)
```

### Key Components

1. **`src/lib/wdk.ts`** - WDK wallet service adapter
   - `WDKWalletService` class manages wallet lifecycle
   - Seed phrase stored encrypted in localStorage
   - Dynamic imports for browser-only execution

2. **`src/context/AuthContext.tsx`** - Authentication state
   - `connectWallet()` - Create or restore wallet
   - `signIn()` - Sign nonce for session
   - `signOut()` - Disconnect and clear session

3. **`src/app/api/auth/verify/route.ts`** - Signature verification
   - Uses `ethers.verifyMessage()` for EIP-191 signatures
   - Recovers signer address from signature
   - Creates session cookie on success

## Installation

### Required Packages

```bash
npm install @tetherto/wdk @tetherto/wdk-wallet-evm ethers
```

### Version Requirements

- `@tetherto/wdk`: ^1.0.0 (core wallet orchestration)
- `@tetherto/wdk-wallet-evm`: ^1.0.0 (Ethereum support)
- `ethers`: ^6.13.0 (signature verification)
- `next`: 16.2.9+ (app router)
- `react`: 19.2.4+ (client components)

## Testing Checklist

### ✅ Wallet Creation Flow

1. **Navigate to protected route** (e.g., `/chat`)
   - Expected: AuthGate shows with "Create or Restore Wallet" button
   
2. **Click create wallet**
   - Expected: Browser alert with 12-word seed phrase
   - Expected: Wallet address displayed as "Connected: 0x1234…5678"
   
3. **Auto sign-in**
   - Expected: Status changes to "Signing…"
   - Expected: Redirects to requested page after signature
   
4. **Verify session**
   - Expected: Wallet badge shows in navbar with:
     - Anonymous display name (e.g., "Optimistic Striker")
     - Truncated address
     - ETH balance (may be 0 for new wallets)

### ✅ Signature Verification

1. **Check browser network tab** during sign-in
   - `POST /api/auth/nonce` → Returns challenge message
   - `POST /api/auth/verify` → Body contains `{ address, signature }`
   - Verify response: `{ address: "0x..." }`

2. **Server logs** should show:
   ```
   [/api/auth/verify] Verifying signature for 0x1234...
   [/api/auth/verify] Signature valid, setting session
   ```

3. **Test invalid signature** (manual API call):
   ```bash
   curl -X POST http://localhost:3000/api/auth/verify \
     -H "Content-Type: application/json" \
     -d '{"address":"0x123","signature":"invalid"}'
   ```
   - Expected: 401 error "Signature verification failed"

### ✅ Session Persistence

1. **Refresh page**
   - Expected: Session persists (no re-sign required)
   - Expected: Wallet auto-connects from localStorage
   
2. **Close and reopen browser**
   - Expected: Session cookie may expire
   - Expected: Wallet still in localStorage
   - Expected: Auto-reconnect and sign on next visit

3. **Clear cookies only**
   - Expected: Wallet remains connected
   - Expected: Must re-sign to create new session

### ✅ Balance Display

1. **Check NavWallet badge**
   - Expected: Shows ETH balance (e.g., "0.0000 ETH")
   - Updates every 30 seconds
   
2. **Send test ETH** (on testnet):
   - Get testnet ETH from faucet
   - Send to wallet address
   - Expected: Balance updates within 30s

3. **Network switching**
   - Change `NEXT_PUBLIC_WDK_EVM_PROVIDER` in `.env.local`
   - Restart dev server
   - Expected: Balance reflects new network

### ✅ Disconnect Flow

1. **Click logout button** in wallet badge
   - Expected: Session cleared
   - Expected: Wallet disconnected (in-memory only)
   - Expected: Redirected to AuthGate
   
2. **Verify localStorage**
   - Open DevTools → Application → Local Storage
   - Expected: `shadowsage_wdk_seed` still present (encrypted)
   
3. **Reconnect**
   - Click "Create or Restore Wallet" again
   - Expected: Existing wallet loads (same address)

### ✅ Wallet Recovery

1. **Export seed phrase**
   - In browser console: `wdkWallet.exportSeedPhrase()`
   - Expected: Returns 12-word phrase
   
2. **Delete wallet**
   - DevTools → Application → Local Storage
   - Delete `shadowsage_wdk_seed`
   
3. **Restore wallet**
   - Click "Create or Restore Wallet"
   - Paste seed phrase when prompted (future UI)
   - Expected: Same address as before

## Security Testing

### ✅ Seed Phrase Security

1. **Check localStorage encryption**
   - Value should be base64-encoded
   - Not human-readable
   - Uses XOR obfuscation (not cryptographic)

2. **Browser security**
   - Seed phrase never sent to server
   - All wallet operations client-side
   - Session only proves ownership, doesn't expose keys

### ✅ Signature Security

1. **Nonce replay protection**
   - Try reusing same nonce
   - Expected: 400 error "No pending sign-in challenge"
   
2. **Address spoofing**
   - Sign with one wallet, claim different address
   - Expected: 401 error "Signature does not match address"

### ✅ XSS Protection

1. **localStorage access**
   - Script injection should not access seed phrase
   - Obfuscation provides basic defense-in-depth
   
2. **Recommendation for production:**
   - Use WebCrypto AES-GCM with user password
   - Implement proper key derivation (PBKDF2)

## Network Configuration

### Mainnet (Default)
```bash
NEXT_PUBLIC_WDK_EVM_PROVIDER=https://eth.llamarpc.com
```

### Testnets
```bash
# Sepolia (Ethereum testnet)
NEXT_PUBLIC_WDK_EVM_PROVIDER=https://sepolia.drpc.org

# Polygon Mumbai (testnet)
NEXT_PUBLIC_WDK_EVM_PROVIDER=https://rpc-mumbai.maticvigil.com

# Arbitrum Sepolia
NEXT_PUBLIC_WDK_EVM_PROVIDER=https://sepolia-rollup.arbitrum.io/rpc
```

### Testnet Faucets
- Sepolia: https://sepoliafaucet.com/
- Mumbai: https://faucet.polygon.technology/
- Arbitrum Sepolia: https://faucet.quicknode.com/arbitrum/sepolia

## Known Limitations

1. **Browser-only**: WDK wallet only works client-side (no SSR)
2. **Single wallet**: Only one wallet per browser (localStorage scoped)
3. **No password**: Seed phrase obfuscated but not encrypted with user password
4. **No backup UI**: Users must manually save seed phrase from alert
5. **Balance refresh**: 30-second polling (not real-time)
6. **EVM only**: Currently only supports EVM chains (no Bitcoin, Solana, etc.)

## Future Enhancements (Phase 6+)

- [ ] USDt balance display alongside ETH
- [ ] Send transaction UI for stake flows
- [ ] Multi-wallet support (wallet switching)
- [ ] Hardware wallet integration
- [ ] Seed phrase backup modal with confirmation
- [ ] WebCrypto password encryption
- [ ] Multi-chain support (TON, Bitcoin, Tron)
- [ ] Transaction history view

## Debugging

### Common Issues

**Issue:** "Module not found: @tetherto/wdk"
- **Fix:** Run `npm install @tetherto/wdk @tetherto/wdk-wallet-evm ethers`

**Issue:** "Failed to fetch balance"
- **Fix:** Check `NEXT_PUBLIC_WDK_EVM_PROVIDER` is set and reachable
- **Fix:** Verify RPC endpoint is for correct network

**Issue:** "Signature verification failed"
- **Fix:** Ensure `ethers` package is installed
- **Fix:** Check nonce cookie is present (`sp_nonce`)

**Issue:** "Wallet won't connect"
- **Fix:** Clear localStorage and try creating new wallet
- **Fix:** Check browser console for errors

### Debug Logging

Enable verbose logging in WDK service:

```typescript
// src/lib/wdk.ts
console.log('[WDK] Connecting wallet...', { address, balance });
```

## API Reference

### WDKWalletService Methods

```typescript
// Check if wallet exists in storage
hasStoredWallet(): boolean

// Create new wallet with random seed phrase
createWallet(): Promise<{ address: string; seedPhrase: string }>

// Restore wallet from seed phrase
restoreWallet(seedPhrase: string): Promise<{ address: string }>

// Connect to stored wallet
connect(): Promise<{ address: string }>

// Get current address
getAddress(): string

// Sign message (returns hex signature)
signMessage(message: string): Promise<string>

// Get ETH balance (returns wei as bigint)
getBalance(): Promise<bigint>

// Disconnect (clears memory, keeps localStorage)
disconnect(): void

// Delete wallet permanently
deleteWallet(): void

// Export seed phrase
exportSeedPhrase(): string
```

## Support

For issues with WDK integration:
1. Check this testing guide
2. Review `src/lib/wdk.ts` implementation
3. Consult WDK docs: https://docs.wdk.tether.io/
4. Check browser console for errors
5. Verify environment variables are set correctly

---

**Last Updated:** Phase 5 completion
**Integration Status:** ✅ Complete and tested
