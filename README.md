# 🦅 Eagle Omnichain Vault

**Production-ready dual-token vault with Charm Finance integration and LayerZero omnichain capabilities**

**Network:** Ethereum Mainnet  
**Status:** ✅ Live & Earning Yield

---

## 📍 Production Contract Addresses

### Core Contracts (Ethereum Mainnet)

| Contract | Address | Status |
|----------|---------|--------|
| **EagleOVault** | [`0x32a2544De7a644833fE7659dF95e5bC16E698d99`](https://etherscan.io/address/0x32a2544De7a644833fE7659dF95e5bC16E698d99) | ✅ Live |
| **CharmStrategyUSD1** | [`0xd286Fdb2D3De4aBf44649649D79D5965bD266df4`](https://etherscan.io/address/0xd286Fdb2D3De4aBf44649649D79D5965bD266df4) | ✅ Earning |
| **EagleVaultWrapper** | [`0xF9CEf2f5E9bb504437b770ED75cA4D46c407ba03`](https://etherscan.io/address/0xF9CEf2f5E9bb504437b770ED75cA4D46c407ba03) | ✅ Live |
| **EagleShareOFT** | [`0x477d42841dC5A7cCBc2f72f4448f5eF6B61eA91E`](https://etherscan.io/address/0x477d42841dC5A7cCBc2f72f4448f5eF6B61eA91E) | ✅ Live |

### External Integrations

| Protocol | Address | Purpose |
|----------|---------|---------|
| **Charm Finance** | `0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71` | Yield farming |
| **WLFI Token** | `0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6` | Vault asset |
| **USD1 Token** | `0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d` | Vault asset |

---

## 🎯 What It Does

### EagleOVault
- Accepts deposits of WLFI + USD1 tokens
- Issues vEAGLE vault shares (ERC4626)
- Auto-deploys to yield strategies
- Uses Chainlink + Uniswap TWAP oracles for pricing

### Charm Strategy
- Swaps tokens to optimal ratio for Charm Finance
- Deposits to Charm's USD1/WLFI AlphaProVault
- Earns Uniswap V3 trading fees
- **99.5% capital efficiency**

### Vault Wrapper
- Converts vault shares (vEAGLE) ↔ OFT tokens (EAGLE)
- Enables cross-chain bridging via LayerZero
- 1:1 conversion with small fees (1% wrap, 2% unwrap)

---

## 📊 Current Status

**Funds in Charm Finance:**
- 19.12 WLFI + 0.067 USD1
- 19.62 Charm LP shares
- Status: Earning yield ✅

**Capital Efficiency:** 99.5% deployed and earning

---

## 🚀 Quick Start

### Setup
```bash
npm install
forge build
```

### Check Vault Status
```bash
npx hardhat run scripts/check-current-vault-state.ts --network ethereum
```

### Check Charm Position
```bash
npx hardhat run scripts/check-charm-success.ts --network ethereum
```

---

## 📁 Repository Structure

```
eagle-ovault-clean/
├── contracts/
│   ├── EagleOVault.sol              # Main vault (ERC4626)
│   ├── strategies/
│   │   └── CharmStrategyUSD1.sol   # Charm Finance integration
│   ├── EagleVaultWrapper.sol        # Vault share wrapper
│   └── oft/
│       └── EagleShareOFT.sol       # Cross-chain token
├── frontend/                         # React + Vite UI
├── scripts/                          # Deployment & monitoring
├── deployments/                      # Deployment records
└── docs/                            # Documentation
```

---

## 🔑 Key Features

### Vault
- ✅ Dual-token deposits (WLFI + USD1)
- ✅ ERC4626 standard compliance
- ✅ Oracle-based pricing (Chainlink + TWAP)
- ✅ Multi-strategy support
- ✅ Auto-deployment to strategies

### Charm Integration
- ✅ Smart ratio matching via Uniswap swaps
- ✅ Deposits to Charm AlphaProVault
- ✅ Earns Uniswap V3 LP fees
- ✅ Automatic rebalancing

### Cross-Chain
- ✅ LayerZero OFT standard
- ✅ Wrapper for 1:1 conversion
- ✅ Same OFT address all chains
- ✅ Secure bridging

---

## 📜 Scripts

See `scripts/README.md` for full list.

**Essential Commands:**
```bash
# Check vault
npx hardhat run scripts/check-current-vault-state.ts --network ethereum

# Check Charm position
npx hardhat run scripts/check-charm-success.ts --network ethereum

# Check approvals
npx hardhat run scripts/check-strategy-approvals.ts --network ethereum

# Set deployment threshold
npx hardhat run scripts/set-deployment-threshold.ts --network ethereum
```

---

## 🧪 Testing

```bash
# Run tests
npx hardhat test

# Specific test
npx hardhat test test/VaultDeploymentTest.test.ts
```

---

## 📖 Documentation

- **[Charm Deployment Guide](CHARM_DEPLOYMENT_HANDOFF.md)** - Charm integration details
- **[Wrapper Guide](WRAPPER_DEPLOYMENT.md)** - Wrapper setup
- **[Deployment Success](DEPLOYMENT_SUCCESS.md)** - Recent deployments
- **[Production README](PRODUCTION_README.md)** - Complete address list

---

## 🔧 Development

### Prerequisites
- Node.js v18+
- Foundry
- Hardhat

### Install Dependencies
```bash
npm install
forge install
```

### Compile Contracts
```bash
forge build
# or
npx hardhat compile
```

### Run Local Node
```bash
npx hardhat node
```

---

## 🌐 Frontend

Live at: **https://test.47eagle.com**

```bash
cd frontend
npm install
npm run dev    # Development
npm run build  # Production
```

---

## 📞 Support

- **GitHub:** https://github.com/wenakita/EagleOVaultV2
- **Network:** Ethereum Mainnet
- **Explorer:** https://etherscan.io

---

## 🏆 Achievements

- ✅ Deployed on Ethereum Mainnet
- ✅ Integrated with Charm Finance
- ✅ Earning Uniswap V3 fees
- ✅ 99.5% capital efficiency
- ✅ Production-ready frontend
- ✅ LayerZero OFT enabled

---

**Last Updated:** October 20, 2025  
**License:** MIT  
**Version:** Production v1.0
