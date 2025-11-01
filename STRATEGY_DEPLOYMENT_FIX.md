# Strategy Deployment Fix

## **🔍 Diagnosis Complete**

Your `forceDeployToStrategies()` call is reverting with **GS013** (execution reverted).

### **What We Found:**

✅ **Vault Status:**
- Not paused
- Not shutdown
- Has 5000 WLFI to deploy
- Total strategy weight: 10000 (100%)

✅ **Access Control:**
- Multisig (`0xe5a1d534eb7f00397361F645f0F39e5D16cc1De3`) is the **owner** ✅
- Management is `0x7310Dd6EF89b7f829839F140C6840bc929ba2031`

✅ **Strategy Status:**
- Strategy is active in vault
- Strategy is initialized
- Charm vault is configured: `0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71`

---

## **❌ Most Likely Issue: Strategy `active` Flag**

The `CharmStrategyUSD1.deposit()` function has this modifier:

```solidity
function deposit(uint256 wlfiAmount, uint256 usd1Amount) 
    external 
    onlyVault
    whenActive  // <-- This checks if active == true
    nonReentrant
```

If the strategy's internal `active` flag is `false`, the deposit will revert with `StrategyPaused()`.

---

## **✅ Solution: Resume the Strategy**

You need to call `resume()` on the strategy contract to set `active = true`.

### **Option 1: Via Gnosis Safe (Recommended)** ⭐

1. Visit: https://app.safe.global/home?safe=eth:0xe5a1d534eb7f00397361F645f0F39e5D16cc1De3
2. **New Transaction** → **Contract Interaction**
3. **Contract Address:** `0x47B2659747d6A7E00c8251c3C3f7e92625a8cf6f` (CharmStrategyUSD1)
4. **ABI:** Paste the ABI or use the Contract Interface
5. **Function:** `resume()`
6. **No parameters needed**
7. **Submit and Execute**

### **Option 2: Via Cast (If You Have Admin Access)**

```bash
cast send 0x47B2659747d6A7E00c8251c3C3f7e92625a8cf6f \
  "resume()" \
  --rpc-url https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY \
  --private-key $ADMIN_KEY
```

---

### **Why `resume()` and not just setting a flag?**

The strategy's `deposit()` function has this check:

```solidity
modifier whenActive() {
    if (!active) revert StrategyPaused();
    _;
}

function resume() external onlyOwner {
    if (address(charmVault) == address(0)) revert NotInitialized();
    active = true;
}
```

The `resume()` function:
1. Checks that Charm vault is configured
2. Sets `active = true`
3. Can only be called by the owner (which is the multisig)

---

## **📋 After Activation: Deploy to Strategy**

Once the strategy is active, retry the deployment:

1. Visit: https://app.safe.global/home?safe=eth:0xe5a1d534eb7f00397361F645f0F39e5D16cc1De3
2. **New Transaction** → **Contract Interaction**
3. **Contract Address:** `0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953` (EagleOVault)
4. **Function:** `forceDeployToStrategies()`
5. **Submit and Execute**

---

## **🔍 Verify Deployment**

After successful deployment, check:

```bash
# Check vault balances (should be 0 or reduced)
cast call 0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953 \
  "wlfiBalance()(uint256)" \
  --rpc-url https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY

# Check strategy holdings
cast call 0x47B2659747d6A7E00c8251c3C3f7e92625a8cf6f \
  "totalAssets()(uint256,uint256)" \
  --rpc-url https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
```

---

## **🛠️ Other Potential Issues (Less Likely)**

If activating the strategy doesn't work, check:

1. **Charm Vault Allowance:**
   - The strategy needs approval to deposit into Charm
   
2. **Token Approvals:**
   - WLFI and USD1 need to be approved from strategy to Charm vault

3. **Charm Vault Status:**
   - Check if the Charm vault itself is paused or has issues

---

## **📞 Need More Help?**

If the issue persists after activation, we can:
1. Use a different RPC (Alchemy, Infura) to avoid rate limits
2. Check Charm vault status
3. Simulate the transaction with Tenderly
4. Review strategy logs and events

---

## **Quick Reference:**

**Vault:** `0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953`  
**Strategy:** `0x47B2659747d6A7E00c8251c3C3f7e92625a8cf6f`  
**Multisig:** `0xe5a1d534eb7f00397361F645f0F39e5D16cc1De3`  
**Charm Vault:** `0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71`

