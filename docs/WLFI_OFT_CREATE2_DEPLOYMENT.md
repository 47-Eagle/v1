# WLFI OFT CREATE2 Deployment Guide

Deploy WLFI OFT at the **same address** on all chains with a **0x47 prefix** using CREATE2.

---

## Overview

We'll use:
1. **CREATE2** - Deterministic deployment across chains
2. **Rust Miner** - Find salt for vanity address (0x47...)
3. **Arachnid's Factory** - `0x4e59b44847b379578588920cA78FbF26c0B4956C`

---

## Step 1: Compute Init Code Hash

```bash
forge script script/layerzero/ComputeWLFIOFTHash.s.sol
```

**Output**:
```
Init Code Hash: 0x1234...5678
```

Copy this hash!

---

## Step 2: Update Rust Miner

Edit `create2-miner-wlfi/src/main.rs`:

```rust
const INIT_CODE_HASH: &str = "0x1234...5678"; // Paste from Step 1
```

---

## Step 3: Mine for 0x47... Address

```bash
cd create2-miner-wlfi
cargo run --release
```

**Expected output** (1-5 minutes):
```
🌐 WLFI OFT CREATE2 Vanity Address Miner
============================================================

🎯 Target Prefix: 0x47
🏭 Factory:       0x4e59b44847b379578588920cA78FbF26c0B4956C
📦 Init Hash:     0x1234...5678

🚀 Mining with 16 threads...
============================================================

⏱️  Attempts:     1,234,567 | Rate:  1,000,000 H/s | Time: 1.2s
⏱️  Attempts:     2,456,789 | Rate:  1,050,000 H/s | Time: 2.3s

============================================================
✅ FOUND MATCHING ADDRESS!
============================================================

🎉 Address:  0x47abc...def
🔑 Salt:     0x0000...1234
🔢 Nonce:    305419896

📊 Statistics:
   Attempts: 3,054,198
   Time:     3.05s
   Rate:     1,001,377 H/s

============================================================
📝 DEPLOYMENT INSTRUCTIONS
============================================================

1. Save this salt for deployment:
   SALT = 0x0000...1234

2. Deploy on Base first:
   forge script script/layerzero/DeployWLFIOFTExact.s.sol \
     --rpc-url $BASE_RPC_URL --broadcast

3. The deployed address will be:
   WLFI OFT (Base): 0x47abc...def

============================================================
```

---

## Step 4: Update Deployment Script

Edit `script/layerzero/DeployWLFIOFTExact.s.sol`:

```solidity
// Line 33: Update SALT
bytes32 constant SALT = 0x0000...1234; // From miner

// Line 41: Update TARGET_ADDRESS
address constant TARGET_ADDRESS = 0x47abc...def; // From miner
```

---

## Step 5: Deploy on Base

```bash
forge script script/layerzero/DeployWLFIOFTExact.s.sol:DeployWLFIOFTExact \
  --rpc-url $BASE_RPC_URL \
  --broadcast \
  --verify
```

**Expected output**:
```
==============================================
WLFI OFT - CREATE2 DEPLOYMENT
==============================================

Chain ID: 8453
Deployer: 0x7310Dd6EF89b7f829839F140C6840bc929ba2031
Target:   0x47abc...def

Predicted: 0x47abc...def

Deploying via Arachnid's CREATE2 factory...

Deployed: 0x47abc...def

Verification:
  Name:     WLFI
  Symbol:   WLFI
  Endpoint: 0x1a44076050125825900e736c501f859c50fE728c
  Owner:    0x7310Dd6EF89b7f829839F140C6840bc929ba2031

==============================================
SUCCESS! WLFI OFT deployed at 0x47... address
==============================================
```

---

## Step 6: Deploy on Other Chains

Use the **same script** on all chains:

```bash
# Arbitrum
forge script script/layerzero/DeployWLFIOFTExact.s.sol \
  --rpc-url $ARBITRUM_RPC_URL \
  --broadcast \
  --verify

# Optimism
forge script script/layerzero/DeployWLFIOFTExact.s.sol \
  --rpc-url $OPTIMISM_RPC_URL \
  --broadcast \
  --verify

# Avalanche
forge script script/layerzero/DeployWLFIOFTExact.s.sol \
  --rpc-url $AVALANCHE_RPC_URL \
  --broadcast \
  --verify
```

All will deploy to **0x47abc...def** ✅

---

## Step 7: Deploy WLFI Adapter on Ethereum

WLFI Adapter uses the **native WLFI token**, so no CREATE2 needed:

```bash
forge script script/layerzero/DeployWLFIOFTs.s.sol \
  --rpc-url $ETHEREUM_RPC_URL \
  --broadcast \
  --verify
```

---

## Step 8: Configure Peer Connections

### Ethereum ↔ Base

```bash
# Ethereum → Base
cast send $WLFI_ADAPTER_ETH \
  "setPeer(uint32,bytes32)" \
  30184 \
  $(cast --to-bytes32 0x47abc...def) \
  --rpc-url $ETHEREUM_RPC_URL \
  --private-key $PRIVATE_KEY

# Base → Ethereum
cast send 0x47abc...def \
  "setPeer(uint32,bytes32)" \
  30101 \
  $(cast --to-bytes32 $WLFI_ADAPTER_ETH) \
  --rpc-url $BASE_RPC_URL \
  --private-key $PRIVATE_KEY
```

---

## Verification

Check all deployments have same address:

```bash
# Base
cast code 0x47abc...def --rpc-url $BASE_RPC_URL | head -c 100

# Arbitrum
cast code 0x47abc...def --rpc-url $ARBITRUM_RPC_URL | head -c 100

# Optimism
cast code 0x47abc...def --rpc-url $OPTIMISM_RPC_URL | head -c 100
```

All should return the **same bytecode** ✅

---

## Architecture

```
ETHEREUM (Hub):
├─ WLFI Token: 0xdA5e...CBeF6 (native token)
├─ WLFI Adapter: 0xXXXX...YYYY (locks/unlocks WLFI)
└─ ComposerV2: 0x3A91...5da9 (redeems EAGLE → WLFI)

BASE (Spoke):
├─ WLFI OFT: 0x47abc...def (minted when WLFI locked)
└─ EAGLE OFT: 0x474e...A91E (existing)

ARBITRUM (Spoke):
├─ WLFI OFT: 0x47abc...def (same address!)
└─ EAGLE OFT: 0x474e...A91E (existing)

OPTIMISM (Spoke):
├─ WLFI OFT: 0x47abc...def (same address!)
└─ EAGLE OFT: 0x474e...A91E (existing)
```

---

## Benefits of 0x47 Prefix

1. **Brand Recognition** - Matches EAGLE OFT (0x474e...)
2. **Trust** - Users see familiar prefix
3. **Filtering** - Easy to identify Eagle ecosystem contracts
4. **Aesthetics** - Clean, professional address

---

## Cost Breakdown

### Mining (one-time)
- **Time**: 1-5 minutes
- **Cost**: Free (local CPU)

### Deployment (per chain)
- **Gas**: ~500k units (~$0.50-5 depending on chain)
- **Verification**: Free (via Etherscan API)

### Total
- **Ethereum**: ~$5-10 (high gas)
- **Base**: ~$0.50-1
- **Arbitrum**: ~$0.50-1
- **Optimism**: ~$0.50-1
- **All chains**: ~$7-13 total

---

## Troubleshooting

### Miner not finding address?
- **Check CPU usage**: Should be 100% on all cores
- **Be patient**: May take 1-10 minutes depending on hardware
- **Try different prefix**: 0x47 takes ~256 attempts on average

### Deployment address mismatch?
- **Check compiler version**: Must match across all chains
- **Check optimizer**: Must use same settings
- **Check constructor args**: Must be EXACT same order/values

### CREATE2 factory not found?
- **Deploy factory first**: https://github.com/Arachnid/deterministic-deployment-proxy
- **Or use different factory**: Update CREATE2_FACTORY constant

---

## Security Notes

1. **Salt reuse**: Same salt → same address (intended!)
2. **Constructor immutability**: Can't change after deployment
3. **Owner control**: Only owner can set peers, configure
4. **Factory trust**: Arachnid's factory is widely trusted

---

## Next Steps

After deployment:
1. ✅ Configure peer connections
2. ✅ Set enforced options
3. ✅ Test bridging
4. ✅ Deploy ComposerV2 on Ethereum
5. ✅ Test composed flow (EAGLE → WLFI)

---

**Status**: 🚧 Ready to mine & deploy
**Last Updated**: November 18, 2025

