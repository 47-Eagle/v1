# 📂 Eagle OVault Repository Structure

**Version:** v2.3 (Deep Cleanup + Optimization)  
**Last Updated:** November 4, 2025  
**Status:** ✅ Fully Organized & Production-Ready

---

## 🎯 Quick Navigation

| Purpose | Location | Description |
|---------|----------|-------------|
| **Start Here** | [`README.md`](./README.md) | Main project overview |
| **Architecture** | [`ARCHITECTURE_OVERVIEW.md`](./ARCHITECTURE_OVERVIEW.md) | Complete system architecture |
| **Deployment** | [`CREATE2_DEPLOYMENT_GUIDE.md`](./CREATE2_DEPLOYMENT_GUIDE.md) | Deployment strategy |
| **Testing** | [`TESTING_GUIDE.md`](./TESTING_GUIDE.md) | Test documentation |
| **Monitoring** | [`MONITORING_GUIDE.md`](./MONITORING_GUIDE.md) | Production monitoring |
| **Detailed Docs** | [`docs/`](./docs/) | In-depth documentation |

---

## 📁 Root Level (Clean & Minimal)

```
eagle-ovault-clean/
│
├── README.md                          # Project overview
├── ARCHITECTURE_OVERVIEW.md           # System architecture
├── CREATE2_DEPLOYMENT_GUIDE.md        # Deployment guide
├── TESTING_GUIDE.md                   # Testing documentation
├── MONITORING_GUIDE.md                # Monitoring & operations
├── REPOSITORY_STRUCTURE.md            # This file
│
├── contracts/                         # 💎 Smart contracts
├── test/                              # 🧪 Test suite
├── script/                            # 🚀 Foundry scripts
├── scripts/                           # 📜 Hardhat scripts
├── frontend/                          # 🎨 React UI
├── docs/                              # 📚 Detailed docs
│
└── Configuration files (see below)
```

**Philosophy:** Root level contains ONLY essential files. Everything else in organized subdirectories.

---

## 💎 Contracts Directory

```
contracts/
│
├── EagleOVault.sol                    # Main vault (ERC4626, 27KB)
├── EagleVaultWrapper.sol              # Wrapper (44KB)
├── EagleRegistry.sol                  # Configuration registry
│
├── strategies/
│   ├── CharmStrategyUSD1.sol          # USD1 strategy (40KB)
│   └── CharmStrategy.sol              # WETH strategy (39KB)
│
├── layerzero/
│   ├── oft/
│   │   ├── EagleShareOFT.sol          # Cross-chain share token (35KB)
│   │   ├── WLFIAssetOFT.sol           # Cross-chain WLFI (Future)
│   │   └── USD1AssetOFT.sol           # Cross-chain USD1 (Future)
│   │
│   ├── composers/
│   │   └── EagleOVaultComposer.sol    # Deposit orchestrator (Future)
│   │
│   └── adapters/
│       ├── WLFIAdapter.sol            # WLFI adapter
│       ├── USD1Adapter.sol            # USD1 adapter
│       └── productive/                # Productive adapters (Future)
│           ├── ProductiveWLFIAdapter.sol
│           ├── ProductiveUSD1Adapter.sol
│           └── README.md              # Productive adapter docs
│
├── factories/
│   └── DeterministicEagleFactory.sol  # CREATE2 factory
│
├── balancer/
│   └── EagleBalancerPools.sol         # Balancer integration (Future)
│
├── interfaces/
│   └── *.sol                          # Contract interfaces
│
└── mocks/
    └── *.sol                          # Test mocks
```

**All contracts compile successfully** ✅

---

## 🧪 Test Directory

```
test/
│
├── EagleOVault.t.sol                  # Vault tests
├── EagleOVault.whitelist.t.sol        # Whitelist tests
├── EagleOVault.security.t.sol         # Security tests
├── EagleOVault.edgecases.t.sol        # Edge case tests
├── EagleOVault.fork.t.sol             # Fork tests
│
├── EagleShareOFT.t.sol                # OFT tests
├── EagleVaultWrapper.t.sol            # Wrapper tests
├── CharmStrategyUSD1.t.sol            # Strategy tests
│
└── Documentation
    ├── TEST_SUITE_OVERVIEW.md         # Test overview
    ├── EAGLESHAREOFT_TEST_README.md   # OFT test docs
    └── QUICK_TEST_REFERENCE.md        # Quick reference
```

**Test Status:** 71/71 passing (100%) ✅

---

## 🚀 Scripts Directories

### Foundry Scripts (`script/`)

```
script/
├── DeployProductionVanity.s.sol       # Production deployment
├── Deploy1_Vault.s.sol                # Vault deployment
├── Deploy2_Strategy.s.sol             # Strategy deployment
├── Deploy3_Wrapper.s.sol              # Wrapper deployment
├── Deploy4_ShareOFT.s.sol             # OFT deployment
├── DeployRegistryCreate2.s.sol        # Registry deployment
└── multi-chain/                       # Multi-chain scripts
```

### Hardhat Scripts (`scripts/`)

```
scripts/
│
├── Essential Monitoring Scripts
│   ├── check-charm-success.ts         # Check Charm position
│   ├── check-current-vault-state.ts   # Check vault status
│   ├── check-strategy-approvals.ts    # Check approvals
│   └── check-vault-approvals.ts       # Check vault approvals
│
├── Production Scripts
│   ├── production/                    # Production utilities
│   ├── deployment/                    # Deployment orchestration
│   │   ├── orchestrator.ts            # Deployment orchestrator
│   │   ├── health-check.ts            # Health checks
│   │   └── post-deployment-tests.ts   # Post-deploy tests
│   └── production-deployment-orchestrator.ts
│
├── Security & Monitoring
│   ├── security/                      # Security scripts
│   │   └── README.md
│   └── monitoring/                    # Monitoring scripts
│
├── Testing Utilities
│   ├── testing/                       # Test utilities
│   │   └── README.md
│   ├── simulate-deposit.ts            # Simulate deposits
│   └── simulate-production-deployment.ts
│
├── Configuration
│   ├── set-deployment-threshold.ts    # Set threshold
│   ├── set-vault-bridge.ts            # Configure bridge
│   └── setupWhitelist.ts              # Whitelist setup
│
└── Utilities
    ├── calculate-create2-address.ts   # CREATE2 calculator
    ├── verify-charm-vault.ts          # Verify Charm
    ├── verify-production-deployment.ts
    └── README.md                      # Scripts documentation
```

**Cleaned:** Removed 80+ archived scripts, 40+ old deployment/test scripts

---

## 📚 Docs Directory (Organized)

```
docs/
│
├── README.md                          # Docs navigation
│
├── architecture/                      # 🏗️ Architecture docs
│   ├── ARCHITECTURE_DECISION.md       # Key decisions
│   ├── LAYERZERO_INTEGRATION.md       # LayerZero integration
│   ├── COMPOSER_VAULT_COUPLING.md     # Composer architecture
│   ├── ABSTRACTION_LAYER.md           # UX abstraction
│   ├── UNIFIED_COMPOSER.md            # Unified composer
│   ├── EAGLESHAREOFT_REVIEW.md        # OFT review
│   ├── WRAPPER_USAGE.md               # Wrapper guide
│   ├── WLFI_DENOMINATION_IMPACT.md    # WLFI denomination
│   └── README_EAGLEOVAULT.md          # Vault deep dive
│
├── deployment/                        # 🚀 Deployment docs
│   ├── README.md                      # Deployment index
│   ├── PRODUCTION_ADDRESSES.md        # Production addresses
│   ├── DEPLOYMENT_VERIFICATION.md     # Verification guide
│   ├── SECURITY_AUDIT_CHECKLIST.md    # Security checklist
│   ├── GAS_ESTIMATION.md              # Gas requirements
│   ├── GAS_OPTIMIZATION_STRATEGY.md   # Optimization
│   ├── SIMULATION_GUIDE.md            # Simulation guide
│   └── ALPHA_PRO_VAULT.md             # Charm integration
│
├── features/                          # ✨ Feature docs
│   ├── CHARM_STRATEGY_GUIDE.md        # Charm strategy
│   ├── CHARM_USD1_STRATEGY_GUIDE.md   # USD1 strategy
│   └── WHITELIST_FUNCTIONALITY.md     # Whitelist feature
│
├── testing/                           # 🧪 Test docs
│   ├── COMPREHENSIVE_TEST_REPORT.md   # Test report
│   ├── MAINNET_FORK_TESTING.md        # Fork testing
│   ├── WRAPPER_TEST_REPORT.md         # Wrapper tests
│   └── TEST_REPORT.md                 # Overall report
│
├── tokenomics/                        # 💰 Tokenomics
│   └── TOKENOMICS_SUMMARY.md          # Tokenomics overview
│
├── maintenance/                       # 🛠️ Maintenance
│   ├── DEBUGGING_NOTES.md             # Debug notes
│   ├── DEPENDENCY_FIX.md              # Dependency fixes
│   └── OPTIMIZATIONS_AND_FIXES.md     # Optimizations
│
└── archive/                           # 📦 Historical docs
    ├── COMPLETE_DEPLOYMENT_SUMMARY.md
    ├── FINAL_STATUS.md
    └── ...                            # Historical references
```

**Cleaned:** Removed 100+ duplicate documentation files

---

## ⚙️ Configuration Files

```
Root Level:
├── hardhat.config.ts                  # Hardhat configuration
├── foundry.toml                       # Foundry configuration
├── layerzero.config.ts                # LayerZero (BSC-Ethereum)
├── layerzero.config.eagle-shares.ts   # LayerZero (Arbitrum-Sonic)
├── package.json                       # NPM dependencies
├── package-lock.json                  # NPM lock file
├── pnpm-lock.yaml                     # PNPM lock file
├── tsconfig.json                      # TypeScript config
├── vercel.json                        # Vercel deployment
└── .gitignore                         # Git ignore rules
```

---

## 🎨 Frontend Directory

```
frontend/
├── src/                               # Source code
├── public/                            # Static assets
├── README.md                          # Frontend docs
├── package.json                       # Dependencies
└── .env                               # Environment (local)
```

**Status:** Live at https://test.47eagle.com ✅

---

## 📊 Build Artifacts (Git-Ignored)

```
Build Directories (33MB total):
├── artifacts/           (14MB)        # Hardhat artifacts
├── cache/               (4.7MB)       # Hardhat cache
├── broadcast/           (3.9MB)       # Foundry broadcasts
├── out/                 (6.4MB)       # Foundry output
└── typechain-types/     (3.8MB)       # TypeChain types

Dependency Directories:
├── node_modules/        (~3.5GB)      # Node dependencies
└── lib/                 (~small)      # Foundry libraries
```

**All properly git-ignored** ✅

---

## 📋 Other Directories

```
deployments/                           # Deployment artifacts
├── production-metrics.json
├── arbitrum.json
├── wrapper-production.json
└── *.json                            # Mainnet only

logs/                                  # Minimal logs
├── README.md
└── simulation-results.json

monitoring/                            # Monitoring configs
├── grafana-dashboard.json
└── production-grafana-dashboard.json

infrastructure/                        # Infrastructure as code
└── terraform/
    └── README.md

tasks/                                 # Hardhat tasks
├── deploy.ts
├── ovault.ts
└── index.ts

devtools/                              # Dev utilities
└── deployConfig.ts

.github/                               # GitHub configs
└── CLEANUP_SUMMARY.md                # Cleanup documentation
```

---

## 📈 Repository Statistics

### File Counts

| Category | Count |
|----------|-------|
| **Root MD files** | 6 (essential only) |
| **Smart contracts** | ~30 files |
| **Test files** | ~15 files |
| **Scripts (active)** | ~45 files |
| **Docs (organized)** | ~40 files |
| **Total size** | 3.6 GB |

### Cleanup Results

| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| Root docs | 80+ | 6 | 93% ✅ |
| Deployment docs | 60+ | 8 | 87% ✅ |
| Scripts | 125+ | 45 | 64% ✅ |
| Test docs | 27 | 4 | 85% ✅ |
| Logs | 22 | 2 | 91% ✅ |

---

## 🎯 Best Practices

### Adding New Documentation

1. **Simple docs** → Root level (only if absolutely essential)
2. **Detailed docs** → `docs/` subdirectories
3. **Historical docs** → `docs/archive/`
4. **Test docs** → `test/`
5. **Script docs** → `scripts/README.md`

### Adding New Scripts

1. **Production scripts** → `scripts/production/`
2. **Monitoring scripts** → `scripts/monitoring/`
3. **Test scripts** → `scripts/testing/`
4. **Foundry scripts** → `script/`
5. **Archive old scripts** → Delete (don't archive)

### File Organization

✅ **DO:**
- Keep root level minimal
- Use descriptive names
- Organize by purpose
- Delete outdated files
- Document important changes

❌ **DON'T:**
- Add status/update logs to root
- Keep duplicate documentation
- Archive everything (delete instead)
- Mix production and test files
- Hardcode configuration

---

## 🚀 Quick Commands

### Development
```bash
# Install dependencies
npm install && forge install

# Compile contracts
forge build
npx hardhat compile

# Run tests
forge test
npx hardhat test

# Check vault status
npx hardhat run scripts/check-current-vault-state.ts --network ethereum
```

### Documentation
```bash
# View structure
tree -L 2 -I 'node_modules|lib|out|artifacts'

# Count files
find . -name "*.md" -not -path "./node_modules/*" | wc -l

# Find specific docs
find docs/ -name "*strategy*"
```

### Cleanup
```bash
# Clean build artifacts
forge clean
npx hardhat clean

# Clean logs
rm -f logs/*.log

# Check git status
git status
```

---

## 📞 Support & Resources

- **Documentation:** Start with [`README.md`](./README.md)
- **Architecture:** See [`ARCHITECTURE_OVERVIEW.md`](./ARCHITECTURE_OVERVIEW.md)
- **Deployment:** See [`CREATE2_DEPLOYMENT_GUIDE.md`](./CREATE2_DEPLOYMENT_GUIDE.md)
- **Issues:** Check [`docs/maintenance/`](./docs/maintenance/)
- **Updates:** See [`.github/CLEANUP_SUMMARY.md`](./.github/CLEANUP_SUMMARY.md)

---

## ✅ Repository Health

- ✅ **Clean structure** - Organized and minimal
- ✅ **Production-ready** - Live on Ethereum mainnet
- ✅ **Well-documented** - Clear and comprehensive
- ✅ **Fully tested** - 71/71 tests passing
- ✅ **Optimized** - Build artifacts managed
- ✅ **Maintainable** - Easy to update and extend

---

**Last Updated:** November 4, 2025  
**Version:** v2.3 (Deep Cleanup + Optimization)  
**Maintenance:** Review quarterly or after major updates

