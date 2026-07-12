# Installation & Testing Checklist

Quick reference checklist for setting up and testing WDK wallet integration.

---

## 📦 Installation Steps

### 1. Install Node Packages

```bash
npm install
```

**If installation times out or fails, install WDK packages separately:**

```bash
npm install @tetherto/wdk @tetherto/wdk-wallet-evm ethers
```

**Verify installation:**

```bash
npm list @tetherto/wdk @tetherto/wdk-wallet-evm ethers
```

Expected output:
```
├── @tetherto/wdk@1.x.x
├── @tetherto/wdk-wallet-evm@1.x.x
└── ethers@6.13.x
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and set:

```bash
# Required
NEXT_PUBLIC_WDK_EVM_PROVIDER=https://eth.llamarpc.com

# Optional (for development)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**For testnet development:**

```bash
# Sepolia testnet
NEXT_PUBLIC_WDK_EVM_PROVIDER=https://sepolia.drpc.org
```

### 3. Start Development Server

```bash
npm run dev
```

Expected output:
```
▲ Next.js 16.2.9
- Local:        http://localhost:3000
- Ready in X.Xs
```

---

## ✅ Testing Checklist

### Basic Functionality

- [ ] **App loads** at http://localhost:3000
- [ ] **Landing page** accessible without wallet
- [ ] **Protected routes** show AuthGate (e.g., /chat, /arena)

### Wallet Creation

- [ ] **Click "Create or Restore Wallet"** button
- [ ] **Browser alert appears** with 12-word seed phrase
- [ ] **Copy seed phrase** to safe location
- [ ] **Address displays** as "Connected: 0x1234…5678"
- [ ] **Status shows** "Signing…" briefly
- [ ] **Redirects** to requested page after sign-in

### Wallet Badge

- [ ] **Badge appears** in top-right navbar
- [ ] **Shows anonymous name** (e.g., "Optimistic Striker")
- [ ] **Shows truncated address** (0x1234…5678)
- [ ] **Shows balance** (e.g., "0.0000 ETH" for new wallet)
- [ ] **Logout button** visible (hover to see icon)

### Session Management

- [ ] **Refresh page** - stays signed in
- [ ] **Close browser tab** - wallet reconnects on reopen
- [ ] **Click logout** - redirects to AuthGate
- [ ] **Click connect again** - uses same wallet (same address)

### API Endpoints

- [ ] **GET /api/auth/session** returns current session
- [ ] **POST /api/auth/nonce** returns challenge message
- [ ] **POST /api/auth/verify** succeeds with valid signature
- [ ] **POST /api/auth/logout** clears session

### Browser DevTools

- [ ] **No console errors** in normal flow
- [ ] **localStorage** contains `shadowsage_wdk_seed` (encrypted)
- [ ] **Session cookie** named `sp_session` is HttpOnly
- [ ] **Network tab** shows successful API calls

---

## 🐛 Troubleshooting

### Installation Issues

**❌ npm install times out**
```bash
# Try with longer timeout
npm install --timeout=300000

# Or install packages individually
npm install @tetherto/wdk
npm install @tetherto/wdk-wallet-evm
npm install ethers
```

**❌ "Module not found: @tetherto/wdk"**
```bash
# Verify installation
npm list @tetherto/wdk

# Reinstall if missing
npm install @tetherto/wdk @tetherto/wdk-wallet-evm ethers

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Runtime Issues

**❌ "Failed to fetch balance"**
- Check `NEXT_PUBLIC_WDK_EVM_PROVIDER` is set in `.env.local`
- Verify RPC endpoint is reachable: `curl https://eth.llamarpc.com`
- Try alternative provider: `https://eth.drpc.org`

**❌ "Signature verification failed"**
- Ensure `ethers` package is installed
- Check nonce cookie exists in DevTools → Application → Cookies
- Clear cookies and try sign-in again

**❌ Balance shows 0 ETH forever**
- Normal for new wallets on mainnet
- Switch to testnet and use faucet
- Check RPC endpoint is correct network

**❌ Wallet won't connect**
- Clear browser localStorage: DevTools → Application → Local Storage → Delete All
- Create new wallet
- Check browser console for errors

### Network Issues

**❌ RPC endpoint not responding**
- Try alternative providers:
  - `https://eth.llamarpc.com` (mainnet)
  - `https://eth.drpc.org` (mainnet)
  - `https://sepolia.drpc.org` (testnet)
- Check if provider is rate-limiting
- Consider running local node

---

## 🧪 Advanced Testing

### Test Signature Verification

```bash
# Get nonce
curl http://localhost:3000/api/auth/nonce

# Verify with invalid signature (should fail)
curl -X POST http://localhost:3000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"address":"0x123","signature":"0xinvalid"}'

# Expected: 401 error
```

### Test Session API

```bash
# Check session (without auth)
curl http://localhost:3000/api/auth/session

# Expected: {"address":null}

# After signing in via browser
curl http://localhost:3000/api/auth/session \
  -H "Cookie: sp_session=..."

# Expected: {"address":"0x..."}
```

### Test Wallet Recovery

1. Open browser console
2. Export seed phrase:
   ```javascript
   wdkWallet.exportSeedPhrase()
   ```
3. Delete wallet:
   ```javascript
   wdkWallet.deleteWallet()
   ```
4. Restore wallet using seed phrase (via UI - future feature)
5. Verify same address returns

---

## 📊 Success Criteria

All items should be ✅ before considering Phase 5 complete:

### Installation
- [x] All npm packages installed successfully
- [x] No build errors
- [x] Dev server starts without errors

### Functionality
- [x] Wallet creation works
- [x] Signature verification succeeds
- [x] Session persists across page refresh
- [x] Balance displays correctly
- [x] Logout clears session

### Code Quality
- [x] No TypeScript errors
- [x] No ESLint warnings in new code
- [x] Console clean (no errors in normal flow)

### Documentation
- [x] README.md updated
- [x] WDK-TESTING.md created
- [x] .env.example updated
- [x] This checklist complete

---

## 📝 Notes

### For First Installation

1. **Network required**: WDK packages hosted on npm registry
2. **Time estimate**: 5-10 minutes for full install + test
3. **Storage used**: ~50MB for WDK packages
4. **Browser required**: Chrome, Firefox, Edge (modern ES6+)

### For Testing

1. **Use testnet**: Set `NEXT_PUBLIC_WDK_EVM_PROVIDER` to Sepolia
2. **Get test ETH**: Use faucet at https://sepoliafaucet.com/
3. **Save seed phrase**: Required for wallet recovery
4. **Clear storage**: DevTools → Application → Clear Site Data

### For Development

1. **Hot reload**: Works for all changes except .env.local
2. **Environment vars**: Restart server after changing NEXT_PUBLIC_* vars
3. **Type safety**: All WDK operations are async (Promise-based)
4. **Error handling**: Check browser console for detailed errors

---

## 🚀 Ready to Proceed?

Once all checkboxes are ✅, you're ready for:

1. **End-to-end testing**: Full user flow with real testnet
2. **Phase 6 implementation**: USDt stake flows
3. **Production deployment**: With proper environment configuration

---

## 📚 Additional Resources

- **Full testing guide**: See `WDK-TESTING.md`
- **Phase 5 summary**: See `PHASE5-SUMMARY.md`
- **WDK documentation**: https://docs.wdk.tether.io/
- **Ethereum faucets**: https://faucetlink.to/sepolia

---

**Last Updated:** Phase 5 completion
**Status:** Ready for testing
