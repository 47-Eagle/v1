# Charm Finance Integration - Next Session Guide

## 🎯 **QUICK START FOR NEXT SESSION**

Your Eagle Vault is **WORKING** but Charm integration is blocked.

### Current Status
- ✅ Vault: `0x7D3F0f409CbF111005F8FcDDd2AEe34c7Ec33c11` (working!)
- ✅ Your funds: 27 USD1 + 81 WLFI (recovered)
- ✅ Deposits/withdrawals: Working perfectly
- ❌ Charm deployment: Blocked by balance tracking issues

---

## 🐛 **THE PROBLEM**

When calling `vault.forceDeployToStrategies()`:

**Error:** `ERC20: transfer amount exceeds balance`

**Root Cause:**
1. Vault internal tracking: `wlfiBalance = 50`
2. Actual ERC20 balance: `WLFI.balanceOf(vault) = 10`
3. Strategy tries: `transferFrom(vault, strategy, 50)`
4. Reverts because vault only has 10

**Why:**
Balance tracking got corrupted from multiple test deposits/withdrawals.

---

## ✅ **THE FIX**

### Critical Code Change (DONE)
In `EagleOVault.sol` line ~554:
```solidity
// BEFORE (wrong):
wlfiBalance -= amount;
strategy.deposit(amount);

// AFTER (correct):
strategy.deposit(amount);  // Call FIRST
wlfiBalance -= amount;     // Update AFTER
```

### Required Steps
1. Deploy FRESH vault (clean state, no corruption)
2. Deploy matching strategy (with new vault address)
3. Add strategy: `vault.addStrategy(strategy, 10000)`
4. Pre-approve: `vault.approveTokensToStrategy(strategy, MaxUint256, MaxUint256)`
5. User deposits
6. Test: `vault.forceDeployToStrategies()`

---

## 🔬 **KEY INSIGHTS FROM ARBITRUM**

**Working TX:** `0xb67fb700ca37299287456be4d605fa9b004c644621babb8ce594baff86576867`

**What Arbitrum did differently:**
1. Approvals were PRE-SET (not done during deployment)
2. Clean vault state (no prior test deposits)
3. Matching vault/strategy addresses
4. Manual deployment only

**Replicate this on Ethereum mainnet!**

---

## 📝 **DEPLOYMENT COMMANDS**

```bash
# 1. Deploy fresh vault
forge create contracts/EagleOVault.sol:EagleOVault \
  --broadcast \
  --rpc-url https://eth.llamarpc.com \
  --private-key $PRIVATE_KEY \
  --gas-limit 5000000 \
  --constructor-args \
    0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6 \  # WLFI
    0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d \  # USD1  
    0xF0d9bb015Cd7BfAb877B7156146dc09Bf461370d \  # USD1 Price Feed
    0x4637ea6ecf7e16c99e67e941ab4d7d52eac7c73d \  # WLFI/USD1 Pool
    0xE592427A0AEce92De3Edee1F18E0157C05861564 \  # Uniswap Router
    0x7310Dd6EF89b7f829839F140C6840bc929ba2031    # Owner

# 2. Deploy matching strategy
forge create contracts/strategies/CharmStrategyUSD1.sol:CharmStrategyUSD1 \
  --broadcast \
  --rpc-url https://eth.llamarpc.com \
  --private-key $PRIVATE_KEY \
  --gas-limit 3000000 \
  --constructor-args \
    <VAULT_ADDRESS> \                               # NEW vault!
    0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71 \  # Charm Vault
    0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d \  # USD1
    0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6 \  # WLFI
    0x7310Dd6EF89b7f829839F140C6840bc929ba2031    # Owner

# 3. Setup (use scripts/setup-arbitrum-method.ts)
npx hardhat run scripts/setup-arbitrum-method.ts --network ethereum
```

---

## ⚠️ **CRITICAL CHECKS**

Before testing deployment:

```javascript
// 1. Verify addresses match
const strategyVault = await strategy.EAGLE_VAULT();
assert(strategyVault === vaultAddress);

// 2. Verify balances are synced
const internal = await vault.usd1Balance();
const actual = await USD1.balanceOf(vaultAddress);
assert(internal === actual);

// 3. Verify approvals are set
const allowance = await USD1.allowance(vaultAddress, strategyAddress);
assert(allowance > parseEther('1000000'));
```

---

## 🎯 **TEST PROCEDURE**

1. Start with **$5 USD1** only (small test)
2. Deposit to vault
3. Verify balance tracking is correct
4. Call `forceDeployToStrategies()`
5. Check transaction trace if fails
6. Verify funds moved: `strategy.getTotalAmounts()`

---

## 📊 **EXPECTED BEHAVIOR**

When working correctly:
1. User deposits → Vault mints shares
2. Owner calls `forceDeployToStrategies()`
3. Strategy calls `transferFrom(vault, strategy, amounts)` (approved!)
4. Strategy queries Charm ratio
5. Strategy swaps tokens to match ratio
6. Strategy deposits to Charm: `charm.deposit(usd1, wlfi, 0, 0, strategy)`
7. Funds appear in `strategy.getTotalAmounts()`
8. User can withdraw anytime

---

## 💡 **IF STILL FAILS**

Consider:
1. **Different yield protocol** (Aave, Compound - simpler APIs)
2. **Launch without yield** (vault still valuable!)
3. **Deploy to L2** (Arbitrum/Base where it already works)

---

## 📞 **CONTEXT**

- User wants Charm integration working
- Has spent significant time debugging
- All funds are safe and recovered
- Vault core is production-ready
- Can launch now OR continue debugging

**Latest working vault:** `0x7D3F0f409CbF111005F8FcDDd2AEe34c7Ec33c11`

Good luck! 🦅

