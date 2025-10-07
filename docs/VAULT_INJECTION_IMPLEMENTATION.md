# 💰 Vault Injection Implementation

## Overview

This document explains the vault injection logic implemented in `EagleShareOFTV2.sol` for the Eagle Omnichain Vault ecosystem.

## 🏗️ Architecture Context

### Multi-Chain Setup
- **Hub Chain (Ethereum)**: Contains `EagleOVault` (ERC4626 vault) holding WLFI + USD1 assets
- **Spoke Chains** (BSC, Arbitrum, Base, Avalanche): Deploy `EagleShareOFTWithFees` representing vault shares
- **Challenge**: The fee contract exists on spoke chains, but the actual vault is on the hub chain

### EAGLE Token Nature
- EAGLE tokens **are the vault shares** themselves (ERC4626 shares)
- They represent proportional ownership of the underlying WLFI + USD1 assets in the vault
- Reducing EAGLE supply increases the value per remaining share

## 💡 Implementation Strategy

### Fee Distribution Model
When swap fees are collected, they are distributed as follows:

```
Total Fees (100%)
├─ Treasury Share (e.g., 70%)    → Sent to treasury address
├─ Burn Share (e.g., 20%)        → Burned (reduces total supply)
└─ Vault Share (e.g., 10%)       → Vault injection mechanism
```

### Vault Injection Mechanism

The vault injection has two modes:

#### Mode 1: Vault Beneficiary Transfer (Primary)
```solidity
if (swapFeeConfig.vaultBeneficiary != address(0)) {
    // Transfer vault portion to designated beneficiary address
    super._transfer(address(this), swapFeeConfig.vaultBeneficiary, vaultAmount);
    totalVaultInjected += vaultAmount;
}
```

**Benefits:**
- ✅ Flexible: Beneficiary can be a multisig, treasury, or protocol-owned liquidity address
- ✅ Transparent: All vault fees accumulate at a known address
- ✅ Bridgeable: Accumulated fees can be bridged to hub chain periodically
- ✅ Utility: Fees can be used for liquidity incentives, governance, or protocol development

#### Mode 2: Fallback Burn (Secondary)
```solidity
else {
    // If no beneficiary set, burn the vault portion
    _burn(address(this), vaultAmount);
    totalBurnedAmount += vaultAmount;
}
```

**Benefits:**
- ✅ Safe default: No funds are "stuck" if beneficiary is not configured
- ✅ Value accrual: Burning increases value of remaining shares
- ✅ Deflationary: Reduces circulating supply, benefiting all holders

## 📊 Configuration

### Initial Setup
```solidity
SwapFeeConfig memory config = SwapFeeConfig({
    buyFee: 300,              // 3% buy fee
    sellFee: 500,             // 5% sell fee
    treasuryShare: 7000,      // 70% to treasury
    burnShare: 2000,          // 20% burned
    vaultShare: 1000,         // 10% to vault
    treasury: 0x...,          // Treasury address
    vaultBeneficiary: 0x...,  // Vault beneficiary address
    feesEnabled: true
});
```

### Runtime Updates

**Update entire configuration:**
```solidity
setSwapFeeConfig(
    buyFee,
    sellFee,
    treasuryShare,
    burnShare,
    vaultShare,
    treasury,
    vaultBeneficiary,
    enabled
)
```

**Update only vault beneficiary:**
```solidity
setVaultBeneficiary(newBeneficiaryAddress)
```

## 📈 Statistics Tracking

New state variable added:
```solidity
uint256 public totalVaultInjected;
```

Updated statistics function:
```solidity
function getFeeStats() external view returns (
    uint256 totalBuyFeesCollected,
    uint256 totalSellFeesCollected,
    uint256 totalBurned,
    uint256 totalVaultFees,      // ← New metric
    uint256 totalSwaps
)
```

## 🔄 Operational Workflows

### Workflow 1: Periodic Bridge to Hub
```
1. Vault fees accumulate on spoke chain at vaultBeneficiary address
2. Periodically (e.g., weekly), bridge accumulated EAGLE shares to Ethereum
3. On Ethereum, redeem EAGLE shares for WLFI/USD1 from EagleOVault
4. Reinvest WLFI/USD1 back into vault strategies
5. Result: Boosts totalAssets() which increases share price
```

### Workflow 2: Protocol-Owned Liquidity
```
1. Set vaultBeneficiary to protocol-owned liquidity (POL) address
2. Use accumulated EAGLE to provide liquidity on spoke chains
3. Trading fees from POL positions generate additional revenue
4. Result: Self-sustaining liquidity + fee generation
```

### Workflow 3: Governance Treasury
```
1. Set vaultBeneficiary to governance multisig
2. Governance votes on optimal use of accumulated vault shares
3. Options: Bridge to hub, provide liquidity, fund development, etc.
4. Result: Community-controlled value allocation
```

## 🎯 Value Accrual Mechanisms

### Direct Value Accrual (Burn)
- **Mechanism**: Burning reduces circulating EAGLE supply
- **Effect**: Each remaining EAGLE share represents a larger portion of vault assets
- **Math**: If vault has $1M assets and 1M shares, each share = $1. After burning 100K shares, each of the remaining 900K shares = $1.11

### Indirect Value Accrual (Beneficiary)
- **Mechanism**: Accumulated fees can be strategically deployed
- **Effect**: Increases protocol revenue, liquidity, or vault TVL
- **Examples**: 
  - Bridge and reinvest → increases totalAssets directly
  - Provide liquidity → generates trading fees for protocol
  - Marketing/development → attracts more deposits → increases TVL

## 🔐 Security Considerations

### Validations
1. ✅ Treasury address must be non-zero (enforced in `_setSwapFeeConfig`)
2. ✅ Fee shares must sum to exactly 10,000 basis points (100%)
3. ✅ Maximum fee cap of 1,000 basis points (10%)
4. ✅ Only owner can update configuration

### Fallback Safety
- If `vaultBeneficiary` is set to `address(0)`, vault fees are automatically burned
- No fees are ever "lost" or stuck in the contract

### Reentrancy Protection
- All fee distributions use `super._transfer()` which includes OpenZeppelin's reentrancy guards
- Burn operations use OpenZeppelin's `_burn()` which is reentrancy-safe

## 📝 Events

### Vault-Specific Events
```solidity
// When vault fees are sent to beneficiary
emit FeesDistributed(vaultBeneficiary, amount, "buy_vault" or "sell_vault");

// When vault fees are burned (fallback)
emit FeesDistributed(address(0), amount, "buy_vault_burned" or "sell_vault_burned");
```

### Monitoring
Monitor these events to track:
- How much is going to the beneficiary vs. being burned
- Whether beneficiary is actively using/bridging accumulated fees
- Total value accrued through vault injection mechanism

## 🚀 Deployment Checklist

When deploying `EagleShareOFTWithFees`:

- [ ] Decide on vault beneficiary address (multisig, treasury, POL, etc.)
- [ ] If uncertain, can set to `address(0)` initially (will burn instead)
- [ ] Configure appropriate fee percentages (recommend 10-20% to vault)
- [ ] Set up monitoring for `FeesDistributed` events
- [ ] Document operational procedures for beneficiary address
- [ ] Plan periodic bridge schedule if using accumulation model

## 💡 Recommendations

### For Production Launch
1. **Conservative Start**: Begin with 10% vault share, can increase later if successful
2. **Multisig Beneficiary**: Use governance multisig as initial beneficiary for flexibility
3. **Monitoring**: Track `totalVaultInjected` metric closely
4. **Documentation**: Document beneficiary address purpose in governance proposals

### For Long-Term Operations
1. **Quarterly Reviews**: Assess effectiveness of vault injection mechanism
2. **Transparency Reports**: Publish on-chain metrics showing value accrual
3. **Governance Votes**: Let community decide optimal vaultShare percentage
4. **Cross-Chain Coordination**: Maintain consistent policies across all spoke chains

## 🎓 Technical Notes

### Why Not Direct Cross-Chain Injection?
- **Complexity**: Would require LayerZero messaging and composer integration
- **Cost**: Cross-chain messages are expensive (gas on source + destination)
- **Risk**: Additional attack surface with cross-chain calls
- **Flexibility**: Accumulation model allows batching and strategic timing

### Why Beneficiary Model?
- **Versatility**: One size doesn't fit all; different protocols have different needs
- **Governance**: Allows community to experiment with optimal strategies
- **Safety**: Fallback burn ensures no funds are ever stuck
- **Transparency**: Clear on-chain tracking of where fees go

## 📚 Related Contracts

- `EagleShareOFTV2.sol` - Fee-on-swap implementation (this contract)
- `EagleOVault.sol` - Hub chain vault managing WLFI/USD1 assets
- `EagleShareAdapter.sol` - Hub chain adapter for cross-chain share transfers
- `EagleOVaultComposer.sol` - LayerZero composer for omnichain operations

---

**Implementation Date**: October 2025  
**Version**: 2.1.0-fees-v3-compatible

