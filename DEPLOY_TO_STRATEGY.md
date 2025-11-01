# 🚀 Deploy Assets to Strategy

## Current Status
- **Vault Address**: `0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953`
- **Strategy Address**: `0x47B2659747d6A7E00c8251c3C3f7e92625a8cf6f`
- **Multisig (Owner)**: `0xe5a1d534eb7f00397361F645f0F39e5D16cc1De3`

---

## 📋 Steps to Deploy 5000 WLFI to Strategy

### Method 1: Using Cast (Command Line)

```bash
# 1. Call forceDeployToStrategies() from the multisig
cast send 0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953 \
  "forceDeployToStrategies()" \
  --rpc-url $ETHEREUM_RPC \
  --private-key $DEPLOYER_KEY
```

### Method 2: Via Gnosis Safe UI

1. **Go to Gnosis Safe**: https://app.safe.global/home?safe=eth:0xe5a1d534eb7f00397361F645f0F39e5D16cc1De3

2. **New Transaction** → **Contract Interaction**

3. **Contract Details:**
   - **Address**: `0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953` (Eagle Vault)
   - **ABI**: Use the EagleOVault ABI

4. **Function to Call:**
   - **Function**: `forceDeployToStrategies()`
   - **Parameters**: None (it automatically deploys all vault balances)

5. **Review & Submit**
   - Gas limit: ~500,000 (estimate)
   - Submit transaction
   - Wait for other signers to approve
   - Execute transaction

---

## 🔍 What This Does

The `forceDeployToStrategies()` function will:

1. ✅ Check that strategies exist (totalStrategyWeight > 0)
2. ✅ Deploy **ALL** current vault balances to strategies according to their weights
3. ✅ In your case: ~5000 WLFI and corresponding USD1 will be sent to CharmStrategyUSD1
4. ✅ The strategy will automatically:
   - Swap tokens to match Charm vault's ratio
   - Deposit to Charm Finance
   - Return any unused tokens to the vault
5. ✅ Update lastDeployment timestamp

---

## 📊 Pre-Deployment Checks

Before deploying, verify:

```bash
# Check vault's current WLFI balance
cast call 0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953 \
  "wlfiBalance()(uint256)" \
  --rpc-url $ETHEREUM_RPC

# Check vault's current USD1 balance
cast call 0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953 \
  "usd1Balance()(uint256)" \
  --rpc-url $ETHEREUM_RPC

# Check strategy is active
cast call 0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953 \
  "activeStrategies(address)(bool)" \
  0x47B2659747d6A7E00c8251c3C3f7e92625a8cf6f \
  --rpc-url $ETHEREUM_RPC
```

---

## 🎯 After Deployment

Monitor the deployment:

```bash
# 1. Check strategy now holds the assets
cast call 0x47B2659747d6A7E00c8251c3C3f7e92625a8cf6f \
  "getTotalAmounts()(uint256,uint256)" \
  --rpc-url $ETHEREUM_RPC

# 2. Check Charm vault position (if deposited successfully)
# Visit: https://alpha.charm.fi/vault/0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71

# 3. Check vault's updated balances
cast call 0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953 \
  "getVaultBalances()(uint256,uint256)" \
  --rpc-url $ETHEREUM_RPC
```

---

## ⚠️ Important Notes

1. **Automatic Deployment**: The function deploys **ALL** vault balances, not just 5000 WLFI
   - If you want to deploy exactly 5000 WLFI, you'd need to ensure the vault only holds that amount

2. **Strategy Weight**: Currently 100% allocation to CharmStrategyUSD1
   - All deployed assets go to this single strategy

3. **Charm Auto-Balancing**: The strategy will automatically:
   - Match Charm vault's current WLFI/USD1 ratio
   - Swap excess tokens via Uniswap if needed
   - Return any unused tokens back to the vault

4. **Access Control**: Only callable by:
   - Owner (Multisig: `0xe5a1d534...`)
   - Manager (if set separately)

5. **Safety**: The function has:
   - ✅ ReentrancyGuard protection
   - ✅ onlyManagement modifier
   - ✅ Strategy validation checks

---

## 🔧 Alternative: Deploy Specific Amount

If you want to deploy ONLY 5000 WLFI (not all vault balances), you would need to:

1. First withdraw excess tokens from vault to multisig
2. Then call `forceDeployToStrategies()`
3. Then re-deposit the excess

**OR** create a custom function that accepts amounts as parameters.

---

## 📞 Support

If you encounter issues:
- Check the vault's current balances first
- Verify the strategy is active and not paused
- Check gas prices (recommend < 30 gwei)
- Monitor the transaction on Etherscan

**Etherscan Links:**
- Vault: https://etherscan.io/address/0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953
- Strategy: https://etherscan.io/address/0x47B2659747d6A7E00c8251c3C3f7e92625a8cf6f
- Multisig: https://etherscan.io/address/0xe5a1d534eb7f00397361F645f0F39e5D16cc1De3

