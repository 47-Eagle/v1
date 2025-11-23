# WLFI OFT Configuration Guide

## Overview

The WLFI OFT bridge requires comprehensive LayerZero configuration on both Ethereum and Base networks. This guide covers all required configurations and how to verify them.

## Contract Addresses

| Network | Contract | Address |
|---------|----------|---------|
| Ethereum | WLFIOFTAdapter | `0x2437F6555350c131647daA0C655c4B49A7aF3621` |
| Base | WLFIOFT | `0x47af3595BFBE6c86E59a13d5db91AEfbFF0eA91e` |

## Required Configurations

### 1. Delegate ✅ (Can be set via TypeScript)
**Purpose**: Authorizes an address to configure LayerZero settings

**Status**: ✅ Can be set with `verify-and-configure-wlfi.ts`

**How to set**:
```bash
npx tsx scripts/wlfi/verify-and-configure-wlfi.ts
```

**What it does**:
- Sets the deployer as delegate on both chains
- Delegate can then configure DVN, Executor, and other settings

### 2. Peer Connection ✅ (Can be set via TypeScript)
**Purpose**: Establishes the cross-chain connection between Ethereum and Base

**Status**: ✅ Can be set with `verify-and-configure-wlfi.ts`

**What it does**:
- Ethereum Adapter → Base OFT connection
- Base OFT → Ethereum Adapter connection

### 3. Enforced Options ✅ (Can be set via TypeScript)
**Purpose**: Sets minimum gas requirements for cross-chain messages

**Status**: ✅ Can be set with `verify-and-configure-wlfi.ts`

**Configuration**:
- Message Type: 1 (SEND)
- Option Type: 3 (LZ_RECEIVE)
- Gas: 200,000

### 4. Send/Receive Libraries ⚠️ (Requires cast or LayerZero toolbox)
**Purpose**: Specifies which LayerZero libraries to use for messaging

**Status**: ⚠️ Requires `configure-wlfi-lz.sh` or LayerZero toolbox

**Configuration**:
- Ethereum Send: `0xbB2Ea70C9E858123480642Cf96acbcCE1372dCe1`
- Ethereum Receive: `0xc02Ab410f0734EFa3F14628780e6e695156024C2`
- Base Send: `0xB5320B0B3a13cC860893E2Bd79FCd7e13484Dda2`
- Base Receive: `0xc02Ab410f0734EFa3F14628780e6e695156024C2`

### 5. DVN Configuration ⚠️ (Requires cast or LayerZero toolbox)
**Purpose**: Configures Decentralized Verifier Networks for message security

**Status**: ⚠️ Requires `configure-wlfi-lz.sh` or LayerZero toolbox

**Configuration**:
- **Ethereum → Base**:
  - Confirmations: 15
  - Required DVNs: LayerZero DVN + Google Cloud DVN
  - DVNs: `0x589dedbd617e0cbcb916a9223f4d1300c294236b`, `0xd56e4eab23cb81f43168f9f45211eb027b9ac7cc`

- **Base → Ethereum**:
  - Confirmations: 5
  - Required DVNs: LayerZero DVN + Google Cloud DVN
  - DVNs: `0x9e059a54699a285714207b43b055483e78faac25`, `0xd56e4eab23cb81f43168f9f45211eb027b9ac7cc`

### 6. Executor Configuration ⚠️ (Requires cast or LayerZero toolbox)
**Purpose**: Configures the executor that delivers messages on the destination chain

**Status**: ⚠️ Requires `configure-wlfi-lz.sh` or LayerZero toolbox

**Configuration**:
- Ethereum Executor: `0x173272739Bd7Aa6e4e214714048a9fE699453059`
- Base Executor: `0x2CCA08ae69E0C44b18A57Ab2A87644234dAeBaE4`
- Max Message Size: 10,000 bytes

## Configuration Steps

### Step 1: Verify Current Configuration

```bash
npx tsx scripts/wlfi/verify-and-configure-wlfi.ts
```

This will:
- Check all current configurations
- Identify what's missing
- Automatically set: delegate, peer, enforced options

### Step 2: Set DVN and Executor Configs

**Option A: Using Cast (Recommended for manual control)**

```bash
chmod +x scripts/configure-wlfi-lz.sh
./scripts/configure-wlfi-lz.sh
```

This script will:
- Set send/receive libraries on both chains
- Configure DVNs with proper confirmations
- Configure executors with message size limits
- Set enforced options

**Option B: Using LayerZero Toolbox**

```bash
# Use WLFI-specific config
npx hardhat --config hardhat.wlfi.config.cjs lz:oapp:wire --oapp-config layerzero.wlfi.config.ts
```

This will apply all configurations from `layerzero.wlfi.config.ts`.

### Step 3: Verify Complete Configuration

Run the verification script again:

```bash
npx tsx scripts/wlfi/verify-and-configure-wlfi.ts
```

All items should show ✅.

## Configuration Checklist

Use this checklist to ensure complete configuration:

### Ethereum (WLFIOFTAdapter)
- [ ] Owner set correctly
- [ ] Delegate set to deployer
- [ ] Peer set to Base OFT address
- [ ] Send library set
- [ ] Receive library set
- [ ] DVN config set (2 DVNs, 15 confirmations)
- [ ] Executor config set
- [ ] Enforced options set (200k gas)

### Base (WLFIOFT)
- [ ] Owner set correctly
- [ ] Delegate set to deployer
- [ ] Peer set to Ethereum Adapter address
- [ ] Send library set
- [ ] Receive library set
- [ ] DVN config set (2 DVNs, 5 confirmations)
- [ ] Executor config set
- [ ] Enforced options set (200k gas)

## Testing the Bridge

Once all configurations are set, test the bridge:

```bash
# Test Ethereum → Base
npx tsx scripts/testing/test-wlfi-eth-to-base.ts

# Test Base → Ethereum
npx tsx scripts/testing/test-wlfi-base-to-eth.ts
```

## Troubleshooting

### "Delegate not set" Error
- Only the owner can set the delegate
- Make sure you're using the owner's private key
- Run: `npx tsx scripts/wlfi/verify-and-configure-wlfi.ts`

### "DVN config not set" Error
- DVN config requires calling SendLibrary.setConfig()
- Use either `configure-wlfi-lz.sh` or LayerZero toolbox
- Cannot be set directly from OFT contract

### "Executor config not set" Error
- Executor config requires calling SendLibrary.setConfig()
- Use either `configure-wlfi-lz.sh` or LayerZero toolbox
- Cannot be set directly from OFT contract

### "Peer not set" Error
- Run: `npx tsx scripts/wlfi/verify-and-configure-wlfi.ts`
- Ensure you have owner permissions

## Configuration Files

- **TypeScript Verification**: `scripts/wlfi/verify-and-configure-wlfi.ts`
- **Shell Configuration**: `scripts/configure-wlfi-lz.sh`
- **LayerZero Config**: `layerzero.wlfi.config.ts` / `.js`
- **Hardhat Config**: `hardhat.wlfi.config.cjs` / `.ts`

## Security Notes

1. **Dual DVN Setup**: Using both LayerZero DVN and Google Cloud DVN for enhanced security
2. **Confirmations**: 15 blocks on Ethereum, 5 blocks on Base for finality
3. **Delegate vs Owner**: Delegate can configure LayerZero settings, Owner controls the contract
4. **Enforced Options**: Ensures sufficient gas for cross-chain execution

## Next Steps

After complete configuration:
1. ✅ Test bridge functionality
2. ✅ Monitor LayerZero scan for messages
3. ✅ Update frontend with bridge functionality
4. ✅ Document bridge usage for users

---

**Last Updated**: November 19, 2025  
**Status**: Configuration scripts ready, awaiting execution

