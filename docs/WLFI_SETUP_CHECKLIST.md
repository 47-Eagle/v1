# WLFI OFT Setup Checklist

## Quick Reference

**Ethereum**: `0x2437F6555350c131647daA0C655c4B49A7aF3621` (WLFIOFTAdapter)  
**Base**: `0x47af3595BFBE6c86E59a13d5db91AEfbFF0eA91e` (WLFIOFT)

## Configuration Status

| Configuration | Ethereum | Base | How to Set |
|--------------|----------|------|------------|
| ✅ Peer | Set | Set | `verify-and-configure-wlfi.ts` |
| ❓ Delegate | ? | ? | `verify-and-configure-wlfi.ts` |
| ❓ Enforced Options | ? | ? | `verify-and-configure-wlfi.ts` |
| ❓ Send Library | ? | ? | `configure-wlfi-lz.sh` or toolbox |
| ❓ Receive Library | ? | ? | `configure-wlfi-lz.sh` or toolbox |
| ❓ DVN Config | ? | ? | `configure-wlfi-lz.sh` or toolbox |
| ❓ Executor Config | ? | ? | `configure-wlfi-lz.sh` or toolbox |

## Setup Steps

### 1️⃣ Verify & Auto-Configure
```bash
npx tsx scripts/wlfi/verify-and-configure-wlfi.ts
```
**Sets**: Delegate, Peer, Enforced Options

### 2️⃣ Complete Configuration
```bash
./scripts/configure-wlfi-lz.sh
```
**Sets**: Send/Receive Libraries, DVN Config, Executor Config

### 3️⃣ Verify Everything
```bash
npx tsx scripts/wlfi/verify-and-configure-wlfi.ts
```
**Check**: All configurations show ✅

### 4️⃣ Test Bridge
```bash
# Ethereum → Base
npx tsx scripts/testing/test-wlfi-eth-to-base.ts

# Base → Ethereum
npx tsx scripts/testing/test-wlfi-base-to-eth.ts
```

## What Each Config Does

| Config | Purpose | Critical? |
|--------|---------|-----------|
| **Delegate** | Authorizes LayerZero config changes | ✅ Yes |
| **Peer** | Cross-chain connection address | ✅ Yes |
| **Enforced Options** | Minimum gas for execution | ✅ Yes |
| **Send Library** | Message sending protocol | ✅ Yes |
| **Receive Library** | Message receiving protocol | ✅ Yes |
| **DVN Config** | Security verification (2 DVNs) | ✅ Yes |
| **Executor Config** | Message delivery service | ✅ Yes |

## Security Configuration

### DVN (Decentralized Verifier Network)
- **Ethereum**: LayerZero DVN + Google Cloud DVN (15 confirmations)
- **Base**: LayerZero DVN + Google Cloud DVN (5 confirmations)
- **Why 2 DVNs?**: Enhanced security through multiple verifiers

### Gas Settings
- **Enforced Options**: 200,000 gas for lzReceive
- **Max Message Size**: 10,000 bytes

## Troubleshooting

### ❌ "Delegate not set"
→ Only owner can set delegate  
→ Run: `npx tsx scripts/wlfi/verify-and-configure-wlfi.ts`

### ❌ "DVN config not set"
→ Requires SendLibrary.setConfig()  
→ Run: `./scripts/configure-wlfi-lz.sh`

### ❌ "Transaction fails"
→ Check all 7 configs are set  
→ Verify with: `npx tsx scripts/wlfi/verify-and-configure-wlfi.ts`

## Files Reference

| File | Purpose |
|------|---------|
| `scripts/wlfi/verify-and-configure-wlfi.ts` | Verification & auto-config |
| `scripts/configure-wlfi-lz.sh` | Complete configuration (cast) |
| `layerzero.wlfi.config.ts` | LayerZero config file |
| `hardhat.wlfi.config.cjs` | Hardhat config for WLFI |
| `docs/WLFI_CONFIGURATION_GUIDE.md` | Detailed guide |

## Quick Commands

```bash
# Check status
npx tsx scripts/wlfi/verify-and-configure-wlfi.ts

# Configure everything
./scripts/configure-wlfi-lz.sh

# Test bridge
npx tsx scripts/testing/test-wlfi-eth-to-base.ts
npx tsx scripts/testing/test-wlfi-base-to-eth.ts

# Monitor on LayerZero Scan
# https://layerzeroscan.com
```

## Success Criteria

All items should show ✅:
- [x] Peer connections set
- [ ] Delegate set on both chains
- [ ] Enforced options set on both chains
- [ ] Send/Receive libraries configured
- [ ] DVN config set (2 DVNs each chain)
- [ ] Executor config set on both chains
- [ ] Test transfers successful

---

**Status**: Ready to configure  
**Last Updated**: November 19, 2025  
**Next Action**: Run Step 1 (verify-and-configure-wlfi.ts)

