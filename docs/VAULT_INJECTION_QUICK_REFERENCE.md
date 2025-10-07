# 🚀 Vault Injection Quick Reference

## TL;DR

The vault injection mechanism sends 10% of swap fees (configurable) to a designated `vaultBeneficiary` address, which can accumulate shares and periodically bridge them to the hub chain or use them strategically. If no beneficiary is set, fees are burned instead.

> 🧪 **Testing automatic documentation deployment!**

## Quick Start

### Set Vault Beneficiary
```solidity
// As contract owner
eagleShareOFT.setVaultBeneficiary(0xYourMultisigOrTreasuryAddress);
```

### Check Vault Stats
```solidity
(
    uint256 buyFees,
    uint256 sellFees,
    uint256 burned,
    uint256 vaultInjected,  // ← This is vault accumulation
    uint256 swaps
) = eagleShareOFT.getFeeStats();
```

### View Current Config
```solidity
SwapFeeConfig memory config = eagleShareOFT.swapFeeConfig();
console.log("Vault Beneficiary:", config.vaultBeneficiary);
console.log("Vault Share:", config.vaultShare); // Basis points (1000 = 10%)
```

## Configuration Examples

### Example 1: Governance Treasury
```solidity
// 70% treasury, 20% burn, 10% vault (to governance multisig)
setSwapFeeConfig(
    300,    // 3% buy fee
    500,    // 5% sell fee
    7000,   // 70% to treasury
    2000,   // 20% burned
    1000,   // 10% to vault
    0x...,  // Treasury address
    0x...,  // Governance multisig as vault beneficiary
    true    // Fees enabled
);
```

### Example 2: Protocol-Owned Liquidity
```solidity
// 60% treasury, 20% burn, 20% vault (to POL manager)
setSwapFeeConfig(
    300,    // 3% buy fee
    500,    // 5% sell fee
    6000,   // 60% to treasury
    2000,   // 20% burned
    2000,   // 20% to vault
    0x...,  // Treasury address
    0x...,  // POL manager contract
    true    // Fees enabled
);
```

### Example 3: Max Burn Strategy
```solidity
// 50% treasury, 40% burn, 10% vault (burned if no beneficiary)
setSwapFeeConfig(
    300,    // 3% buy fee
    500,    // 5% sell fee
    5000,   // 50% to treasury
    4000,   // 40% burned
    1000,   // 10% to vault
    0x...,  // Treasury address
    address(0), // No beneficiary = burn vault portion too
    true    // Fees enabled
);
```

## Common Operations

### Change Vault Beneficiary Only
```solidity
eagleShareOFT.setVaultBeneficiary(newAddress);
```

### Disable Vault Injection (Burn Instead)
```solidity
eagleShareOFT.setVaultBeneficiary(address(0));
```

### Check Balance at Beneficiary
```solidity
uint256 accumulated = eagleShareOFT.balanceOf(vaultBeneficiary);
```

## Monitoring

### Key Metrics to Track
1. **Total Vault Injected**: `totalVaultInjected`
2. **Beneficiary Balance**: `balanceOf(vaultBeneficiary)`
3. **Vault Share %**: `swapFeeConfig.vaultShare` (in basis points)
4. **Burn vs Inject Ratio**: Compare `totalBurnedAmount` to `totalVaultInjected`

### Events to Monitor
```solidity
// Successful vault injection
event FeesDistributed(address indexed vaultBeneficiary, uint256 amount, "buy_vault");
event FeesDistributed(address indexed vaultBeneficiary, uint256 amount, "sell_vault");

// Fallback burn (no beneficiary set)
event FeesDistributed(address(0), uint256 amount, "buy_vault_burned");
event FeesDistributed(address(0), uint256 amount, "sell_vault_burned");
```

## Operational Playbook

### Weekly Routine
```
1. Check accumulated balance at vaultBeneficiary
2. If balance > threshold (e.g., 1000 EAGLE):
   a. Initiate bridge to Ethereum hub chain
   b. Redeem EAGLE for WLFI/USD1 on hub
   c. Reinject assets into EagleOVault strategies
3. Record metrics for transparency report
```

### Monthly Review
```
1. Analyze vault injection efficiency
2. Compare to burn-only approach
3. Adjust vaultShare % if needed (governance vote)
4. Publish transparency report
```

## Math Examples

### Example Swap with Fees
```
User sells 1000 EAGLE tokens
├─ 5% sell fee = 50 EAGLE total fees
    ├─ 70% treasury = 35 EAGLE → sent to treasury
    ├─ 20% burn = 10 EAGLE → burned
    └─ 10% vault = 5 EAGLE → sent to vaultBeneficiary
```

### Accumulated Value Example
```
After 1000 swaps of 1000 EAGLE each:
- Total fees collected: 50,000 EAGLE
- Vault injection (10%): 5,000 EAGLE
- If bridged and redeemed at $1/EAGLE: $5,000 added to vault
- Vault TVL increase: $5,000
- Share price increase: depends on total shares outstanding
```

## Troubleshooting

### Vault fees being burned instead of sent?
→ Check that `vaultBeneficiary != address(0)`

### Want to change vault percentage?
→ Call `setSwapFeeConfig()` with new `vaultShare` (must sum to 10000 with treasury + burn)

### Need to emergency disable?
→ Call `setSwapFeeConfig()` with `feesEnabled = false`

### Want to track individual swaps?
→ Monitor `SwapFeeApplied` events with filters

## Security Reminders

- ✅ Only contract owner can change configuration
- ✅ VaultBeneficiary can be any address (EOA, multisig, contract)
- ✅ Fees are never "stuck" - either sent or burned
- ✅ No reentrancy risks - uses OpenZeppelin standards
- ⚠️ VaultBeneficiary has no special powers, just receives tokens
- ⚠️ If beneficiary is a contract, ensure it can handle ERC20 tokens

## Gas Optimization

### Batch Operations
When bridging, batch multiple accumulated amounts to save on LayerZero fees:
```
Weekly bridge of 10,000 EAGLE > Daily bridge of 1,428 EAGLE
```

### Configuration Updates
Changing `vaultBeneficiary` alone is cheaper than full `setSwapFeeConfig()` call:
```
setVaultBeneficiary(addr)  // ~30k gas
vs
setSwapFeeConfig(...)      // ~50k gas
```

## Integration Examples

### With Governance
```solidity
// Governance proposal
function updateVaultStrategy(address newBeneficiary) external {
    require(msg.sender == governance, "Not governance");
    eagleShareOFT.setVaultBeneficiary(newBeneficiary);
}
```

### With Bridge Automation
```solidity
// Automated bridge when threshold reached
if (balanceOf(vaultBeneficiary) >= BRIDGE_THRESHOLD) {
    bridgeToHub(balanceOf(vaultBeneficiary));
}
```

---

**Need More Details?** See [VAULT_INJECTION_IMPLEMENTATION.md](./VAULT_INJECTION_IMPLEMENTATION.md)

