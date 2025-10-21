# Eagle OVault LayerZero Contracts

This directory contains all LayerZero contracts for the Eagle omnichain vault system.

## 📁 Directory Structure

```
layerzero/
├── adapters/          # OFT adapters for existing ERC20 tokens
│   ├── EagleShareOFTAdapter.sol  # Hub chain: wraps vEAGLE shares
│   ├── WLFIAdapter.sol           # Hub chain: wraps existing WLFI
│   └── USD1Adapter.sol           # Hub chain: wraps existing USD1
│
├── oft/               # Omnichain Fungible Tokens (deploy on all chains)
│   ├── EagleShareOFT.sol         # Spoke chains: vEAGLE with fee-on-swap
│   ├── WLFIAssetOFT.sol          # All chains: WLFI OFT (if new token)
│   └── USD1AssetOFT.sol          # All chains: USD1 OFT (if new token)
│
└── composers/         # VaultComposerSync orchestrators
    └── EagleOVaultComposer.sol   # Hub chain: cross-chain vault operations
```

---

## 🚀 Deployment Guide

### **Hub Chain (Ethereum)**

Deploy in this order:

1. **EagleOVault** (if not already deployed)
   ```bash
   forge create EagleOVault --constructor-args <args>
   ```

2. **Asset OFT/Adapter** (choose ONE):
   - If WLFI/USD1 already exist: Deploy `WLFIAdapter` + `USD1Adapter`
   - If WLFI/USD1 are new: Deploy `WLFIAssetOFT` + `USD1AssetOFT`

3. **EagleShareOFTAdapter**
   ```bash
   forge create EagleShareOFTAdapter \
     --constructor-args <VAULT_ADDRESS> <LZ_ENDPOINT> <OWNER>
   ```

4. **EagleOVaultComposer**
   ```bash
   forge create EagleOVaultComposer \
     --constructor-args <VAULT> <ASSET_OFT> <SHARE_ADAPTER>
   ```

### **Spoke Chains (Arbitrum, Optimism, Base, etc.)**

Deploy in this order:

1. **Asset OFT** (same contract as hub if using OFT, not needed if using adapter)
   ```bash
   forge create WLFIAssetOFT \
     --constructor-args "WLFI" "WLFI" <LZ_ENDPOINT> <OWNER>
   ```

2. **EagleShareOFT** (spoke-specific with fees)
   ```bash
   forge create EagleShareOFT \
     --constructor-args "Eagle Vault Shares" "vEAGLE" <LZ_ENDPOINT> <OWNER>
   ```

---

## 🔗 Wire LayerZero Peers

After deployment, connect chains using LayerZero DevTools:

```bash
# Wire asset OFT
pnpm hardhat lz:oapp:wire --oapp-config layerzero.asset.config.ts

# Wire share OFT
pnpm hardhat lz:oapp:wire --oapp-config layerzero.share.config.ts
```

---

## 📋 Contract Purposes

### **Adapters** (Hub Chain Only)

| Contract | Purpose | Token Type |
|----------|---------|------------|
| `EagleShareOFTAdapter` | Wraps vEAGLE vault shares for cross-chain transfer | Existing (from vault) |
| `WLFIAdapter` | Wraps existing WLFI token | Existing ERC20 |
| `USD1Adapter` | Wraps existing USD1 token | Existing ERC20 |

**When to use adapters:**
- ✅ Token already exists on hub chain
- ✅ Don't want to migrate token balances
- ✅ Keep original token contract

### **OFTs** (All Chains)

| Contract | Purpose | Deploy Where |
|----------|---------|--------------|
| `EagleShareOFT` | Spoke chain representation of vEAGLE | Spoke chains ONLY |
| `WLFIAssetOFT` | New WLFI token with cross-chain support | Hub + Spoke |
| `USD1AssetOFT` | New USD1 token with cross-chain support | Hub + Spoke |

**When to use OFTs:**
- ✅ Creating new token from scratch
- ✅ Want native LayerZero support
- ✅ Deploying on multiple chains

### **Composers** (Hub Chain Only)

| Contract | Purpose |
|----------|---------|
| `EagleOVaultComposer` | Orchestrates cross-chain deposits and redemptions |

---

## 🎯 Architecture Decisions

### **Why Adapter + OFT?**

**Hub Chain:**
- Uses `OFTAdapter` (lockbox) for vault shares
- Locks/unlocks original vEAGLE tokens
- Preserves vault's `totalSupply()` accounting

**Spoke Chains:**
- Uses `OFT` (mint/burn) for share representation
- Minted when bridged from hub
- Burned when bridged back to hub
- Optional fee-on-swap for tokenomics

### **Fee-on-Swap Feature**

`EagleShareOFT` on spoke chains includes:
- ✅ Smart DEX detection (V2/V3)
- ✅ No fees on regular transfers
- ✅ Fees only on swaps (configurable)
- ✅ V3 Uniswap compatibility
- ✅ Treasury + Vault distribution

**Why only on spoke chains?**
- Hub chain stays simple and vault-focused
- Spoke chains can have different fee structures per chain
- Easier to manage tokenomics independently

---

## 📊 Cross-Chain Flow Examples

### **Example 1: Deposit on Arbitrum, Receive Shares on Optimism**

```typescript
// User on Arbitrum
await wlfiOFT.send({
  dstEid: ETHEREUM_EID,  // Hub chain
  to: COMPOSER_ADDRESS,
  composeMsg: {
    dstEid: OPTIMISM_EID,  // Receive shares here
    to: userAddress,
    minAmountLD: parseEther("99")  // 1% slippage
  }
}, { value: fee });

// Flow:
// 1. WLFI leaves Arbitrum → arrives on Ethereum
// 2. Composer deposits into vault
// 3. vEAGLE shares minted
// 4. Shares sent to Optimism
// 5. User receives vEAGLE on Optimism
```

### **Example 2: Redeem on Base, Receive Assets on Ethereum**

```typescript
// User on Base
await shareOFT.send({
  dstEid: ETHEREUM_EID,  // Hub chain
  to: COMPOSER_ADDRESS,
  composeMsg: {
    dstEid: ETHEREUM_EID,  // Receive assets on hub
    to: userAddress,
    minAmountLD: parseEther("990")  // 1% slippage
  }
}, { value: fee });

// Flow:
// 1. vEAGLE leaves Base → arrives on Ethereum
// 2. Composer redeems from vault
// 3. WLFI released from vault
// 4. User receives WLFI on Ethereum
```

---

## 🔐 Security Considerations

### **Adapter Security**
- ✅ Lockbox model preserves vault accounting
- ✅ No minting/burning on hub (immutable supply)
- ✅ Validation for zero addresses
- ✅ Only LayerZero can trigger unlock

### **OFT Security**
- ✅ Fee validation (max 10%)
- ✅ Fee distribution validation (must sum to 100%)
- ✅ V3 compatibility (no balance issues)
- ✅ Exempt addresses (bridges, contracts)
- ✅ Emergency toggle (disable fees)

### **Composer Security**
- ✅ Slippage protection (minAmountLD)
- ✅ Two-phase operation (OFT transfer + vault op)
- ✅ Automatic detection (deposit vs redeem)
- ✅ Only LayerZero messaging

---

## 🧪 Testing

Run all LayerZero tests:
```bash
forge test --match-path "test/layerzero/*" -vv
```

Test specific contract:
```bash
forge test --match-contract EagleShareOFTTest -vvv
```

---

## 📚 References

- [LayerZero OVault EVM](https://github.com/LayerZero-Labs/ovault-evm)
- [LayerZero OFT Standard](https://docs.layerzero.network/contracts/oft)
- [LayerZero VaultComposerSync](https://github.com/LayerZero-Labs/ovault-evm/blob/main/contracts/VaultComposerSync.sol)
- [ERC-4626 Tokenized Vault Standard](https://eips.ethereum.org/EIPS/eip-4626)

---

## ⚠️ Important Notes

1. **Share Minting:**
   - NEVER mint shares directly in `EagleShareOFT`
   - Shares ONLY minted by vault on hub chain
   - Breaks vault accounting if violated

2. **Adapter vs OFT:**
   - Use adapters for existing tokens (hub)
   - Use OFTs for new tokens or spoke chains
   - Don't deploy adapter on spoke chains

3. **Fee Configuration:**
   - Test thoroughly before enabling fees
   - Configure V3 pools explicitly
   - Monitor fee statistics

4. **LayerZero Peers:**
   - Must wire peers before cross-chain ops work
   - Use LayerZero DevTools for wiring
   - Verify configuration after wiring

---

**Status:** ✅ Production-ready, LayerZero OVault compliant

**Last Updated:** October 21, 2025

