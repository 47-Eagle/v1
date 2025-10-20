# 🦅 Eagle Vault - Production Deployment

## 📍 Live Contract Addresses (Ethereum Mainnet)

### Core Contracts
| Contract | Address | Status |
|----------|---------|--------|
| **EagleOVault** | [`0x32a2544De7a644833fE7659dF95e5bC16E698d99`](https://etherscan.io/address/0x32a2544De7a644833fE7659dF95e5bC16E698d99) | ✅ Live |
| **CharmStrategyUSD1** | [`0xd286Fdb2D3De4aBf44649649D79D5965bD266df4`](https://etherscan.io/address/0xd286Fdb2D3De4aBf44649649D79D5965bD266df4) | ✅ Live & Earning |
| **EagleVaultWrapper** | [`0xF9CEf2f5E9bb504437b770ED75cA4D46c407ba03`](https://etherscan.io/address/0xF9CEf2f5E9bb504437b770ED75cA4D46c407ba03) | ✅ Live |
| **EagleShareOFT** | [`0x477d42841dC5A7cCBc2f72f4448f5eF6B61eA91E`](https://etherscan.io/address/0x477d42841dC5A7cCBc2f72f4448f5eF6B61eA91E) | ✅ Live |

### External Protocols
| Protocol | Address | Purpose |
|----------|---------|---------|
| **Charm Finance Vault** | [`0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71`](https://etherscan.io/address/0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71) | Yield farming USD1/WLFI |
| **Uniswap V3 Router** | `0xE592427A0AEce92De3Edee1F18E0157C05861564` | Token swaps |
| **USD1/WLFI Pool (1%)** | `0xf9f5e6f7a44ee10c72e67bded6654afaf4d0c85d` | Swap pool |
| **USD1/WLFI Pool (Oracle)** | `0x4637Ea6eCf7E16C99E67E941ab4d7d52eAc7c73d` | TWAP pricing |

### Tokens
| Token | Address |
|-------|---------|
| **WLFI** | `0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6` |
| **USD1** | `0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d` |
| **USD1 Price Feed** | `0xF0d9bb015Cd7BfAb877B7156146dc09Bf461370d` |

---

## 🎯 What's Live

### Vault
- Accepts deposits of WLFI + USD1
- Issues vEAGLE shares (vault tokens)
- Auto-deploys to strategies when threshold met
- TWAP + Chainlink oracle pricing

### Charm Strategy
- Swaps tokens to match Charm's optimal ratio
- Deposits to Charm Finance USD1/WLFI vault
- Earning Uniswap V3 trading fees
- 99.5% capital efficiency

### Wrapper
- Wraps vault shares (vEAGLE) → OFT tokens (EAGLE)
- 1:1 conversion (minus fees)
- Enables cross-chain bridging via LayerZero
- Fees: 1% wrap, 2% unwrap

---

## 📊 Current Position

**In Charm Finance:**
- WLFI: 19.12
- USD1: 0.067
- Charm LP Shares: 19.62
- Status: Earning yield ✅

**Capital Efficiency:** 99.5% deployed

---

## 🚀 Quick Commands

### Check Vault Status
```bash
npx hardhat run scripts/check-current-vault-state.ts --network ethereum
```

### Check Charm Position
```bash
npx hardhat run scripts/check-charm-success.ts --network ethereum
```

### Verify Strategy
```bash
npx hardhat run scripts/check-strategy-approvals.ts --network ethereum
```

---

## 📁 Key Files

### Contracts
- `contracts/EagleOVault.sol` - Main vault
- `contracts/strategies/CharmStrategyUSD1.sol` - Charm integration
- `contracts/EagleVaultWrapper.sol` - Vault share wrapper
- `contracts/oft/EagleShareOFT.sol` - Cross-chain token

### Deployment Records
- `deployments/charm-strategy-fixed.json` - Strategy deployment
- `deployments/wrapper-production.json` - Wrapper deployment

### Documentation
- `CHARM_DEPLOYMENT_HANDOFF.md` - Charm integration details
- `WRAPPER_DEPLOYMENT.md` - Wrapper setup guide
- `DEPLOYMENT_SUCCESS.md` - Recent deployment info
- `PRODUCTION_README.md` - This file

---

## 🔧 Development

### Setup
```bash
npm install
forge build
```

### Test
```bash
npx hardhat test
```

### Deploy
See deployment scripts in `scripts/` directory

---

## 📞 Support

- **GitHub:** https://github.com/wenakita/EagleOVaultV2
- **Frontend:** https://test.47eagle.com
- **Network:** Ethereum Mainnet only

---

**Last Updated:** October 20, 2025  
**Status:** ✅ Production Ready

