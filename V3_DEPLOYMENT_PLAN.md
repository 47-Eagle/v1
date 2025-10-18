# Eagle Vault V3 - Critical USD1 Fix Deployment Plan

**Date**: October 18, 2025  
**Status**: 🚨 **CRITICAL - V2 HAS BUGS, DO NOT USE** 🚨

---

## 🐛 Critical Bugs Found in V2

### Bug #1: Wrong USD1 Token Address
- ❌ **V2 Used**: `0x8C815948C41D2A87413E796281A91bE91C4a94aB` (Vellum USD1)
- ✅ **Should Use**: `0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d` (World Liberty Financial USD)
- **Verified**: https://etherscan.io/address/0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d

### Bug #2: Wrong Decimal Handling
- ❌ **V2 Assumed**: USD1 has 6 decimals (like USDC)
- ✅ **Actual**: USD1 has 18 decimals (verified on-chain)
- **Impact**: All price calculations were wrong by 1e12 factor!

### Code Locations Fixed:
```solidity
// contracts/EagleOVault.sol

// Line 320-328: _getSpotPrice()
// BEFORE: price = (1e18 * 1e18) / (rawPrice / 1e12)
// AFTER:  price = (1e18 * 1e18) / rawPrice

// Line 365-373: _sqrtPriceFromTick()  
// BEFORE: price = 1e36 / (ratio / 1e12)
// AFTER:  price = (1e18 * 1e18) / ratio
```

---

## ✅ What Was Fixed

### Smart Contract (`EagleOVault.sol`)
1. ✅ Removed `/1e12` decimal adjustments (lines 327, 370)
2. ✅ Updated comments to reflect 18 decimals for both tokens
3. ✅ Simplified price inversion logic
4. ✅ Compiles successfully

### Frontend
1. ✅ Updated USD1 address to correct token
2. ✅ Using `parseEther()` for USD1 (18 decimals)
3. ✅ Updated all config files
4. ✅ Builds successfully

### Configuration
1. ✅ `.env` - Updated USD1_ADDRESS
2. ✅ `frontend/.env` - Updated VITE_USD1_ADDRESS  
3. ✅ `frontend/config/contracts.ts` - Updated default address
4. ✅ `test/CharmStrategy.test.ts` - Updated test address
5. ✅ `frontend/VERCEL_DEPLOYMENT.md` - Updated deployment guide

---

## 🚀 V3 Deployment Steps

### Prerequisites
- [x] Smart contract fixes committed
- [x] Frontend fixes committed
- [x] Test compilation passes
- [ ] Run full test suite
- [ ] Audit price calculation logic
- [ ] Test with mainnet fork

### Step 1: Deploy V3 Vault
```bash
cd /home/akitav2/eagle-ovault-clean
npx hardhat run scripts/deploy-vault.ts --network mainnet
```

**Expected Constructor Args:**
```javascript
{
  _wlfiToken: "0x4780940f87d2Ce81d9dBAE8cC79B2239366e4747",
  _usd1Token: "0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d", // ✅ CORRECT
  _usd1PriceFeed: "0xF0d9bb015Cd7BfAb877B7156146dc09Bf461370d",
  _wlfiUsd1Pool: "0x4637ea6ecf7e16c99e67e941ab4d7d52eac7c73d",
  _uniswapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
  _owner: "0x7310Dd6EF89b7f829839F140C6840bc929ba2031"
}
```

### Step 2: Deploy Supporting Contracts
```bash
# Deploy Wrapper V3
npx hardhat run scripts/deploy-wrapper.ts --network mainnet

# Deploy OFT V3  
npx hardhat run scripts/deploy-oft.ts --network mainnet

# Deploy CharmStrategy V3
npx hardhat run scripts/deploy-charm-strategy.ts --network mainnet
```

### Step 3: Verify Contracts
```bash
npx hardhat verify --network mainnet <VAULT_V3_ADDRESS> \
  "0x4780940f87d2Ce81d9dBAE8cC79B2239366e4747" \
  "0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d" \
  "0xF0d9bb015Cd7BfAb877B7156146dc09Bf461370d" \
  "0x4637ea6ecf7e16c99e67e941ab4d7d52eac7c73d" \
  "0xE592427A0AEce92De3Edee1F18E0157C05861564" \
  "0x7310Dd6EF89b7f829839F140C6840bc929ba2031"
```

### Step 4: Test On-Chain
```javascript
// Test WLFI price retrieval
const wlfiPrice = await vault.getWLFIPrice();
console.log(`WLFI Price: $${wlfiPrice / 1e18}`);
// Expected: ~$0.125 - $0.130

// Test USD1 price retrieval  
const usd1Price = await vault.getUSD1Price();
console.log(`USD1 Price: $${usd1Price / 1e18}`);
// Expected: ~$0.995 - $1.005

// Test deposit preview
const [shares, usdValue] = await vault.previewDepositDual(
  ethers.parseEther("100"), // 100 WLFI
  ethers.parseEther("10")   // 10 USD1 (18 decimals!)
);
console.log(`Shares: ${ethers.formatEther(shares)}`);
console.log(`USD Value: $${ethers.formatEther(usdValue)}`);
// Expected: Reasonable numbers (not trillions!)
```

### Step 5: Update Frontend
Update `frontend/.env` with V3 addresses:
```bash
VITE_VAULT_ADDRESS=<VAULT_V3_ADDRESS>
VITE_WRAPPER_ADDRESS=<WRAPPER_V3_ADDRESS>
VITE_OFT_ADDRESS=<OFT_V3_ADDRESS>
VITE_STRATEGY_ADDRESS=<STRATEGY_V3_ADDRESS>
```

### Step 6: Redeploy Frontend to Vercel
- Commit V3 address updates
- Push to GitHub
- Vercel will auto-deploy
- Test live site

---

## 🧪 Testing Checklist

Before going live with V3:

### Price Oracle Tests
- [ ] WLFI price is ~$0.125 (not wildly off)
- [ ] USD1 price is ~$1.00 (±5%)
- [ ] Prices update correctly with TWAP
- [ ] No overflow/underflow errors

### Deposit Tests
- [ ] Small deposit (1 WLFI + 1 USD1) works
- [ ] Preview shows reasonable share amounts
- [ ] Actual shares match preview
- [ ] USD value calculation is correct

### Withdrawal Tests
- [ ] Can withdraw shares
- [ ] Proportional WLFI/USD1 return
- [ ] No loss of funds

### Frontend Tests
- [ ] USD1 input works correctly
- [ ] Deposit preview shows realistic numbers
- [ ] Balance displays correctly (18 decimals)
- [ ] Transactions succeed

---

## 📊 V2 vs V3 Comparison

| Aspect | V2 (Broken) | V3 (Fixed) |
|--------|-------------|------------|
| **USD1 Token** | Wrong address | ✅ Correct: 0x8d0D... |
| **USD1 Decimals** | Treated as 6 | ✅ Correctly 18 |
| **Price Calculation** | Off by 1e12 | ✅ Accurate |
| **Decimal Adjustment** | `/ 1e12` | ✅ No adjustment needed |
| **Deposit Preview** | Trillion vEAGLE | ✅ Realistic amounts |
| **Status** | 🚨 BROKEN | ✅ Ready to test |

---

## ⚠️ CRITICAL WARNING

**DO NOT USE V2 VAULT** (`0x9e6AFd836fF239e5Ab5fa60DB7c01080bDd964FB`)

This vault has:
- ❌ Wrong USD1 token
- ❌ Wrong decimal calculations  
- ❌ Will give incorrect shares
- ❌ Could cause loss of funds

**Wait for V3 deployment and testing!**

---

## 📝 Post-Deployment

After successful V3 deployment:

1. **Update Documentation**
   - Update V2_DEPLOYMENT.md → V3_DEPLOYMENT.md
   - Mark V2 as deprecated
   - Update README with V3 addresses

2. **Announce**
   - Notify team of new addresses
   - Update any public documentation
   - Add migration guide if needed

3. **Monitor**
   - Watch first few deposits closely
   - Verify oracle prices are correct
   - Check gas costs

---

**Prepared**: October 18, 2025  
**Next**: Deploy V3 contracts  
**Eagle Vault Team** 🦅

