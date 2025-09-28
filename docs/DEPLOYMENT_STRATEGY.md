# Eagle Vault LayerZero Deployment Strategy

## 🏗️ Contract Architecture Overview

The Eagle Vault system uses a **hybrid LayerZero architecture** depending on whether tokens exist natively on each chain.

## 📋 Deployment Decision Matrix

### For WLFI Token:
- **Chains WITH native WLFI**: Use `WLFIAdapter.sol` (wraps existing token)
- **Chains WITHOUT native WLFI**: Use `WLFIAssetOFT.sol` (creates omnichain version)

### For USD1 Token:
- **Chains WITH native USD1**: Use `USD1Adapter.sol` (wraps existing token)
- **Chains WITHOUT native USD1**: Use `USD1AssetOFT.sol` (creates omnichain version)

### For $EAGLE Token (New):
- **All chains**: Use `EagleShareOFT.sol` (creates new omnichain token)

## 🌍 Chain-Specific Deployment Guide

### Known Token Locations:
- **WLFI**: Check which chains have native WLFI deployments
- **USD1**: Check which chains have native USD1 deployments

### Deployment Steps:
1. **Research Phase**: Identify which chains have native WLFI/USD1
2. **Strategy Selection**: 
   - Native token exists → Deploy Adapter
   - Native token missing → Deploy Asset OFT
3. **Cross-Chain Wiring**: Connect all deployed contracts via LayerZero peers

## 📁 Organized Contract Structure

### `contracts/layerzero-ovault/adapters/`
**Use on chains WITH existing tokens:**
- `WLFIAdapter.sol` - Wraps existing WLFI tokens
- `USD1Adapter.sol` - Wraps existing USD1 tokens  
- `EagleShareAdapter.sol` - Wraps $EAGLE vault shares (hub chain)

### `contracts/layerzero-ovault/oft/`
**Use on chains WITHOUT existing tokens:**
- `WLFIAssetOFT.sol` - Creates omnichain WLFI version
- `USD1AssetOFT.sol` - Creates omnichain USD1 version
- `EagleShareOFT.sol` - Registry-based $EAGLE token for deterministic cross-chain addresses

### `contracts/layerzero-ovault/composers/`
**Cross-chain orchestration:**
- `EagleComposer.sol` - Handles multi-chain vault operations

## 🚀 EagleShareOFT Deployment

The `EagleShareOFT.sol` uses registry-based deployment for deterministic addresses:

```solidity
// Constructor: (name, symbol, registry, delegate)
EagleShareOFT("Eagle Vault Shares", "EAGLE", registryAddress, deployer)
```

### Benefits:
- ✅ **Same address across all chains**
- ✅ **Vanity address support** (0x4747...EA91E)
- ✅ **Future-proof** for endpoint changes
- ✅ **Clean, simple architecture**

### Requirements:
- Universal registry deployed at same address on all chains
- Registry properly configured with LayerZero endpoints for each chain

## 🔄 LayerZero Peer Configuration

All contracts (Adapters and Asset OFTs) must be configured as LayerZero peers to enable cross-chain token transfers between chains with different deployment strategies.

## 📝 Notes

- Asset OFTs create new omnichain token representations
- Adapters wrap existing ERC20 tokens for omnichain functionality
- Both contract types are peers in the same LayerZero network
- Token holders can transfer between any chains regardless of underlying implementation
