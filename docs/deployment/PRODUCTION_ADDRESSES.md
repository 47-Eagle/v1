# 🦅 Eagle Vault - Production Addresses

**Network:** Ethereum Mainnet  
**Deployment Date:** October 20, 2025  
**Status:** ✅ Live & Earning Yield

---

## 📍 Core Contracts

| Contract | Address | Etherscan |
|----------|---------|-----------|
| **EagleOVault** | `0x32a2544De7a644833fE7659dF95e5bC16E698d99` | [View](https://etherscan.io/address/0x32a2544De7a644833fE7659dF95e5bC16E698d99) |
| **CharmStrategyUSD1** | `0xd286Fdb2D3De4aBf44649649D79D5965bD266df4` | [View](https://etherscan.io/address/0xd286Fdb2D3De4aBf44649649D79D5965bD266df4) |
| **EagleVaultWrapper** | `0xF9CEf2f5E9bb504437b770ED75cA4D46c407ba03` | [View](https://etherscan.io/address/0xF9CEf2f5E9bb504437b770ED75cA4D46c407ba03) |
| **EagleShareOFT** | `0x477d42841dC5A7cCBc2f72f4448f5eF6B61eA91E` | [View](https://etherscan.io/address/0x477d42841dC5A7cCBc2f72f4448f5eF6B61eA91E) |

---

## 🔗 External Protocols

| Protocol | Address | Purpose |
|----------|---------|---------|
| **Charm Finance Vault** | `0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71` | USD1/WLFI yield farming |
| **Uniswap V3 Router** | `0xE592427A0AEce92De3Edee1F18E0157C05861564` | Token swaps |
| **USD1/WLFI Pool (Swaps)** | `0xf9f5e6f7a44ee10c72e67bded6654afaf4d0c85d` | 1% fee tier |
| **USD1/WLFI Pool (Oracle)** | `0x4637Ea6eCf7E16C99E67E941ab4d7d52eAc7c73d` | TWAP pricing |

---

## 🪙 Tokens

| Token | Address | Decimals |
|-------|---------|----------|
| **WLFI** | `0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6` | 18 |
| **USD1** | `0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d` | 18 |
| **USD1 Price Feed** | `0xF0d9bb015Cd7BfAb877B7156146dc09Bf461370d` | Chainlink |

---

## 📊 Current Position

**In Charm Finance:**
- WLFI: 19.12
- USD1: 0.067
- Charm LP Shares: 19.62
- Status: ✅ Earning Uniswap V3 fees

**Capital Efficiency:** 99.5%

---

## 🔧 Configuration

### Vault Parameters
- **Deployment Threshold:** $10 USD
- **Shares Per USD:** 80,000 vEAGLE
- **TWAP Interval:** 300 seconds
- **Max Price Age:** 3600 seconds

### Strategy Parameters
- **Pool Fee:** 1% (10000 basis points)
- **Max Slippage:** 5% (500 basis points)
- **Auto-rebalancing:** Enabled

### Wrapper Fees
- **Wrap Fee (vEAGLE → EAGLE):** 1%
- **Unwrap Fee (EAGLE → vEAGLE):** 2%

---

## 🌐 Frontend

**Live Site:** https://test.47eagle.com  
**Repository:** https://github.com/wenakita/EagleOVaultV2

### Environment Variables
```bash
VITE_VAULT_ADDRESS=0x32a2544De7a644833fE7659dF95e5bC16E698d99
VITE_STRATEGY_ADDRESS=0xd286Fdb2D3De4aBf44649649D79D5965bD266df4
VITE_WRAPPER_ADDRESS=0xF9CEf2f5E9bb504437b770ED75cA4D46c407ba03
VITE_OFT_ADDRESS=0x477d42841dC5A7cCBc2f72f4448f5eF6B61eA91E
VITE_CHARM_VAULT_ADDRESS=0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71
```

---

## ✅ Verification

### Check Vault Status
```bash
npx hardhat run scripts/check-current-vault-state.ts --network ethereum
```

### Check Charm Position
```bash
npx hardhat run scripts/check-charm-success.ts --network ethereum
```

### Check Approvals
```bash
npx hardhat run scripts/check-strategy-approvals.ts --network ethereum
```

---

**Last Updated:** October 20, 2025  
**All addresses verified and operational** ✅
