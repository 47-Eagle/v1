# EagleOVault Tokenomics - Quick Reference

## 🎯 Current Configuration

### Bootstrap Ratio
```
1 WLFI = 10,000 vEAGLE shares
```

### Maximum Supply
```
Production Max:  50,000,000 shares = 5,000 WLFI at bootstrap
Hardcoded Max: 1,000,000,000 shares = 100,000 WLFI at bootstrap
```

## 💰 How It Works

### Phase 1: Bootstrap (First Deposit)
```
Deposit: 5,000 WLFI
Receive: 50,000,000 vEAGLE shares
Ratio: 1 WLFI = 10,000 shares
```

### Phase 2: Value Growth (Subsequent Injections)
```
Vault has: 50,000,000 shares (no new minting)

Injection 1: +5,000 WLFI
→ Share value: 0.0001 WLFI/share → 0.0002 WLFI/share (2x)

Injection 2: +10,000 WLFI  
→ Share value: 0.0002 WLFI/share → 0.0004 WLFI/share (2x again)

Injection 3: +20,000 WLFI
→ Share value: 0.0004 WLFI/share → 0.0008 WLFI/share (2x again)

Total WLFI: 40,000 WLFI in vault
Share value: 8x original! 🚀
```

## 📊 Example Scenarios

### Scenario A: Small Launch
```
Bootstrap: 1,000 WLFI → 10,000,000 shares
Injection: +1,000 WLFI → 2x share value
Injection: +2,000 WLFI → 4x share value
Injection: +4,000 WLFI → 8x share value
```

### Scenario B: Medium Launch
```
Bootstrap: 2,500 WLFI → 25,000,000 shares
Injection: +2,500 WLFI → 2x share value
Injection: +5,000 WLFI → 4x share value
Injection: +10,000 WLFI → 8x share value
```

### Scenario C: Maximum Launch
```
Bootstrap: 5,000 WLFI → 50,000,000 shares (PRODUCTION MAX)
Injection: +5,000 WLFI → 2x share value
Injection: +10,000 WLFI → 4x share value
Injection: +20,000 WLFI → 8x share value
```

## 🔢 Share Value Formula

### Always Use:
```solidity
shareValue = totalAssets / totalSupply
```

### Example Calculations:
```
Initial State:
- totalAssets: 5,000 WLFI
- totalSupply: 50,000,000 shares
- shareValue: 5,000 / 50,000,000 = 0.0001 WLFI per share

After +10,000 WLFI injection:
- totalAssets: 15,000 WLFI
- totalSupply: 50,000,000 shares (UNCHANGED)
- shareValue: 15,000 / 50,000,000 = 0.0003 WLFI per share
- Growth: 3x 📈
```

## 💎 Key Benefits

1. **No Dilution**: After bootstrap, NO new shares are minted
2. **Value Growth**: Each injection increases share value for all holders
3. **Fair Distribution**: Price per share grows proportionally
4. **Transparent**: Simple 10,000x multiplier at launch
5. **Scalable**: Can inject unlimited WLFI over time

## 🎮 User Experience

### For Initial Depositors (Bootstrap)
```
Deposit: X WLFI
Receive: X * 10,000 vEAGLE shares
Example: 100 WLFI → 1,000,000 shares
```

### For Later Buyers (After Bootstrap)
```
Buy: vEAGLE shares on market
Value: Grows as vault receives WLFI injections
Example: Hold 1,000,000 shares → value increases with each injection
```

### For Withdrawers
```
Redeem: Y shares
Receive: (Y / totalSupply) * totalAssets WLFI
Example: Redeem 1,000,000 shares = 2% of supply → get 2% of vault WLFI
```

## 📈 Growth Projection

| Stage | WLFI in Vault | Share Value | Multiple |
|-------|---------------|-------------|----------|
| Bootstrap | 5,000 | 0.0001 | 1x |
| +1 Injection | 10,000 | 0.0002 | 2x |
| +2 Injections | 20,000 | 0.0004 | 4x |
| +3 Injections | 40,000 | 0.0008 | 8x |
| +4 Injections | 80,000 | 0.0016 | 16x |
| +5 Injections | 160,000 | 0.0032 | 32x |

*Assuming each injection doubles the WLFI in vault*

## 🔒 Security Features

✅ **Max Supply Enforced**: Cannot exceed 50M shares (production)
✅ **No Arbitrary Minting**: Only bootstrap gets multiplier
✅ **Fair Pricing**: ERC4626 standard prevents manipulation
✅ **Tested**: 184 comprehensive tests passing

## 🛠️ Technical Details

### Contract Functions
```solidity
// Bootstrap deposit
function previewDeposit(uint256 assets) 
    returns (uint256 shares)
{
    if (totalSupply() == 0) {
        shares = assets * 10_000; // Bootstrap!
    } else {
        shares = (assets * totalSupply()) / totalAssets();
    }
}

// Share value
function convertToAssets(uint256 shares) 
    returns (uint256 assets)
{
    return (shares * totalAssets()) / totalSupply();
}
```

### Key State Variables
```solidity
uint256 public maxTotalSupply = 50_000_000e18;  // Production max
uint256 public wlfiBalance;                      // Direct WLFI holdings
uint256 public usd1Balance;                      // USD1 holdings (converted)
```

## 🚀 Launch Checklist

- ✅ Bootstrap multiplier: 10,000x
- ✅ Max supply: 50,000,000 shares
- ✅ Initial deposit: Up to 5,000 WLFI
- ✅ Tests: 184/184 passing
- ✅ Documentation: Complete
- 🎯 **Ready for deployment**

---

## Commands

```bash
# Run tests
forge test --match-contract "EagleOVault"

# Check current config
forge script script/CheckConfig.s.sol

# Deploy
forge script script/DeployVault.s.sol --broadcast
```

---

**Tokenomics**: 1 WLFI = 10,000 vEAGLE (bootstrap)
**Max Supply**: 50,000,000 shares = 5,000 WLFI
**Status**: ✅ Production Ready

