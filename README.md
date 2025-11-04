# 🦅 Eagle Omnichain Vault

**Production-ready dual-token vault with Charm Finance integration and LayerZero omnichain capabilities**

**Network:** Ethereum Mainnet  
**Status:** ✅ **LIVE & EARNING YIELD**

> **📘 Quick Start**: See [Architecture Overview](./ARCHITECTURE_OVERVIEW.md) | [Testing Guide](./TESTING_GUIDE.md) | [CREATE2 Deployment](./CREATE2_DEPLOYMENT_GUIDE.md)

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
- Converts vault shares ↔ EAGLE OFT tokens (1:1)
- Enables cross-chain bridging via LayerZero
- **Same EAGLE token on ALL chains** (via CREATE2)

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
│
├── 💎 CONTRACTS (PRODUCTION READY)
│   ├── EagleOVault.sol                    # Main vault (27KB, ERC4626)
│   ├── EagleVaultWrapper.sol              # Wrapper (44KB)
│   ├── EagleRegistry.sol                  # Chain registry
│   ├── strategies/
│   │   └── CharmStrategyUSD1.sol          # USD1 strategy (40KB)
│   ├── layerzero/
│   │   ├── oft/EagleShareOFT.sol          # OFT token (35KB)
│   │   ├── oft/WLFIAssetOFT.sol           # Cross-chain WLFI (Future)
│   │   ├── oft/USD1AssetOFT.sol           # Cross-chain USD1 (Future)
│   │   ├── composers/EagleOVaultComposer.sol  # Deposit orchestrator (Future)
│   │   └── adapters/productive/           # Productive adapters (Future)
│   └── factories/
│       └── DeterministicEagleFactory.sol  # CREATE2 factory
│
├── 🧪 TESTS (71/71 PASSING - 100%)
│   └── test/
│       ├── EagleOVault.t.sol              # Vault tests
│       ├── EagleShareOFT.t.sol            # OFT tests
│       ├── EagleVaultWrapper.t.sol        # Wrapper tests
│       └── CharmStrategyUSD1.t.sol        # Strategy tests
│
├── 🚀 DEPLOYMENT SCRIPTS
│   └── script/
│       ├── DeployProductionVanity.s.sol   # Production deployment
│       └── Deploy*.s.sol                  # Other deployment scripts
│
├── 📚 KEY DOCUMENTATION
│   ├── ARCHITECTURE_OVERVIEW.md           # Start here - system overview
│   ├── CREATE2_DEPLOYMENT_GUIDE.md        # Deterministic deployment
│   ├── TESTING_GUIDE.md                   # Test documentation
│   ├── MONITORING_GUIDE.md                # Production monitoring
│   └── contracts/layerzero/
│       ├── README.md                      # LayerZero integration
│       ├── COMPLETE_ARCHITECTURE.md       # Full omnichain architecture
│       └── adapters/productive/README.md  # Productive adapters (Future)
│
├── ⚙️ CONFIGURATION
│   ├── hardhat.config.ts                  # Hardhat config
│   ├── foundry.toml                       # Foundry config
│   ├── layerzero.config.ts                # LayerZero config
│   └── package.json                       # Dependencies
│
└── 🎨 FRONTEND
    └── frontend/                           # React + Vite UI (Live)
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

### Cross-Chain (EagleVaultWrapper Architecture)
- ✅ LayerZero OFT standard
- ✅ **Same EAGLE token on ALL chains** (Ethereum, Arbitrum, Base, etc.)
- ✅ Same address everywhere via CREATE2
- ✅ 1:1 wrapper for vault shares ↔ EAGLE conversion
- ✅ No fees on transfers

> **Architecture:** We use `EagleVaultWrapper` instead of standard OFTAdapter to achieve the same EAGLE token address and metadata on all chains. See [`ARCHITECTURE_DECISION.md`](./ARCHITECTURE_DECISION.md) for details.

---

## 🧪 Testing

```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/EagleOVault.t.sol

# Foundry tests
forge test

# With gas report
forge test --gas-report
```

---

## 📖 Documentation

### 🏗️ Core Architecture
- **[Architecture Overview](ARCHITECTURE_OVERVIEW.md)** - 📍 **START HERE** - Complete system architecture
- **[CREATE2 Deployment Guide](CREATE2_DEPLOYMENT_GUIDE.md)** - Deterministic deployment strategy
- **[Testing Guide](TESTING_GUIDE.md)** - Test coverage and testing strategy

### 🌐 LayerZero / Omnichain
- **[LayerZero README](contracts/layerzero/README.md)** - Cross-chain integration overview
- **[Complete Architecture](contracts/layerzero/COMPLETE_ARCHITECTURE.md)** - Full omnichain technical guide
- **[Productive Adapters](contracts/layerzero/adapters/productive/README.md)** - Capital efficiency optimization (Future)

### 📊 Operations & Monitoring
- **[Monitoring Guide](MONITORING_GUIDE.md)** - Production monitoring and alerting

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

---

## 🧹 Repository Status

**Last Major Cleanup:** November 4, 2025  
**Test Status:** 71/71 passing (100%) ✅  
**Build Status:** All contracts compile successfully ✅  
**Production Status:** Live on Ethereum Mainnet ✅

**Recent Cleanup (Nov 4, 2025):**
- ✅ Removed 50+ outdated deployment documentation files
- ✅ Removed multi-agent deployment system files (no longer needed)
- ✅ Removed vanity generation tools and artifacts (deployment complete)
- ✅ Removed old UI files and temporary scripts
- ✅ Updated .gitignore for build artifacts
- ✅ Streamlined README with only essential docs

**Contract Sizes (Optimized for Deployment):**
- EagleOVault: 27 KB ✅
- EagleVaultWrapper: 44 KB ✅
- EagleShareOFT: 35 KB ✅
- EagleOVaultComposer: 36 KB ✅ (Future)
- CharmStrategyUSD1: 40 KB ✅

---

**Last Updated:** November 4, 2025  
**License:** MIT  
**Version:** Production v2.2 (Deployed + Repository Cleanup)
