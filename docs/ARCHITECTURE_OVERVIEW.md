# 🏗️ Eagle OVault Architecture Overview

**IMPORTANT: All AI agents must read this file to understand the custom architecture**

---

## 🎯 Custom Architecture: EagleVaultWrapper Pattern

This project uses a **custom LayerZero OVault implementation** that differs from standard patterns.

### ⚠️ Key Difference from Standard OVault

**Standard OVault Pattern:**
```
Vault (ERC4626) → OFTAdapter → LayerZero
```

**Eagle OVault Pattern (Custom):**
```
EagleOVault (ERC4626) → EagleVaultWrapper → EagleShareOFT → LayerZero
```

---

## 🔧 Architecture Components

### 1. EagleOVault (Hub Chain Only - Ethereum)

**Location:** `contracts/EagleOVault.sol`  
**Type:** ERC4626 Vault  
**Chain:** Ethereum Mainnet only

**Purpose:**
- Accepts deposits of WLFI + USD1 tokens
- Issues vault shares (vEAGLE)
- Manages yield strategies
- Uses Chainlink + Uniswap TWAP oracles for pricing

**Key Features:**
- Dual-token deposits (WLFI + USD1)
- Multi-strategy support (currently Charm Finance)
- Auto-deployment to strategies when threshold reached
- Access control (Owner, Manager, Keeper, Emergency Admin)

**Does NOT:**
- ❌ Implement OFT directly
- ❌ Handle cross-chain transfers itself
- ❌ Deploy to spoke chains

---

### 2. EagleVaultWrapper (Hub Chain Only - Ethereum)

**Location:** `contracts/EagleVaultWrapper.sol`  
**Type:** Custom Wrapper Contract  
**Chain:** Ethereum Mainnet only

**Purpose:**
- **Wraps vault shares (vEAGLE) ↔ OFT tokens (EAGLE) at 1:1 ratio**
- Acts as the bridge between vault and cross-chain functionality
- Enables the same EAGLE token on all chains

**Key Functions:**
```solidity
// Wrap vault shares → OFT tokens
function wrap(uint256 shares) external returns (uint256)

// Unwrap OFT tokens → vault shares
function unwrap(uint256 amount) external returns (uint256)

// Get wrapped balance
function balanceOf(address user) external view returns (uint256)
```

**Why This Pattern?**
- ✅ Same EAGLE token address on all chains (via CREATE2)
- ✅ Same token metadata everywhere
- ✅ Cleaner UX - users see "EAGLE" not "vEAGLE"
- ✅ Separates vault logic from cross-chain logic

**Architecture Decision:**
See `ARCHITECTURE_DECISION.md` for full rationale.

---

### 3. EagleShareOFT (All Chains)

**Location:** `contracts/layerzero/oft/EagleShareOFT.sol`  
**Type:** LayerZero OFT (Omnichain Fungible Token)  
**Chains:** Ethereum + BSC + Arbitrum + Base + Avalanche

**⭐ CRITICAL: SAME ADDRESS ON ALL CHAINS ⭐**

**Purpose:**
- The actual cross-chain token (EAGLE)
- Implements LayerZero OFT standard
- Same contract deployed to ALL chains
- **MUST have same address on all chains (via CREATE2)**

**Deployment Method:**
- Uses CREATE2 for deterministic addresses
- Same salt on all chains
- Same bytecode on all chains
- Same deployer on all chains
- **Result: `0x64831bbc309f74eeFD447d00EFDcf92cA3EB2e61` on ALL chains**

**Why Same Address Matters:**
- ✅ Consistent user experience
- ✅ Easy to verify across chains
- ✅ Professional appearance
- ✅ Simplified integration
- ✅ Trust and transparency

**See `CREATE2_DEPLOYMENT_GUIDE.md` for detailed instructions.**

**Key Features:**
- LayerZero V2 integration
- Cross-chain transfers
- No transfer fees (removed in production)
- Access control for wrapper

**On Ethereum (Hub):**
- Connected to EagleVaultWrapper
- Wrapper can mint/burn when wrapping/unwrapping

**On Spoke Chains (BSC, Arbitrum, Base, Avalanche):**
- Standalone OFT
- Receives tokens via LayerZero
- Users can hold and transfer EAGLE
- Can bridge back to Ethereum

---

### 4. EagleRegistry (All Chains)

**Location:** `contracts/EagleRegistry.sol`  
**Type:** Configuration Registry  
**Chains:** Deployed on all chains (Ethereum + spokes)

**Purpose:**
- **Centralized configuration management**
- Stores LayerZero endpoint addresses
- Stores chain-specific settings
- Provides dynamic configuration lookup

**Key Functions:**
```solidity
// Get LayerZero endpoint for current chain
function getLayerZeroEndpoint(uint256 chainId) external view returns (address)

// Get OFT address for a specific chain
function getOFTAddress(uint256 chainId) external view returns (address)

// Get vault address (hub chain only)
function getVaultAddress() external view returns (address)
```

**Why Registry Pattern?**
- ✅ No hardcoded addresses in contracts
- ✅ Easy to update configuration without redeployment
- ✅ Consistent across all contracts
- ✅ Supports future upgrades (LayerZero V3, etc.)

**Deployment:**
- Deploy EagleRegistry FIRST on each chain
- Then deploy other contracts that reference the registry

---

### 5. CharmStrategyUSD1 (Hub Chain Only - Ethereum)

**Location:** `contracts/strategies/CharmStrategyUSD1.sol`  
**Type:** Yield Strategy  
**Chain:** Ethereum Mainnet only

**Purpose:**
- Deploys vault assets to Charm Finance
- Earns Uniswap V3 LP fees
- Swaps tokens to optimal ratio via Uniswap
- Auto-compounds earnings

**Integration:**
- Vault → Strategy (deposits assets)
- Strategy → Charm Finance (earns yield)
- Strategy → Vault (returns assets + yield)

---

## 🌐 Multi-Chain Architecture

### Hub-and-Spoke Model

```
                    ETHEREUM (Hub)
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        │                │                │
    EagleOVault   EagleVaultWrapper   CharmStrategy
        │                │                │
        │         (wraps shares)          │
        │                │                │
        │         EagleShareOFT           │
        │         (hub OFT)               │
        │                │                │
        └────────────────┼────────────────┘
                         │
            ┌────────────┼────────────┐
            │            │            │
         LayerZero   LayerZero   LayerZero
            │            │            │
    ┌───────┴───┐   ┌───┴────┐   ┌──┴──────┐
    │           │   │        │   │         │
   BSC      Arbitrum Base  Avalanche    (more...)
    │           │   │        │   │         │
EagleShareOFT  │   │        │   │    EagleShareOFT
(spoke OFT)    │   │        │   │    (spoke OFT)
               │   │        │   │
        EagleShareOFT  EagleShareOFT
        (spoke OFT)    (spoke OFT)
```

---

## 🔄 User Flow Examples

### Flow 1: Deposit on Ethereum
```
1. User deposits WLFI + USD1
   ↓
2. EagleOVault mints vEAGLE shares
   ↓
3. User wraps vEAGLE → EAGLE (via EagleVaultWrapper)
   ↓
4. User holds EAGLE tokens (can bridge to other chains)
```

### Flow 2: Cross-Chain Transfer (Ethereum → BSC)
```
1. User has EAGLE on Ethereum
   ↓
2. User calls send() on EagleShareOFT (Ethereum)
   ↓
3. LayerZero burns EAGLE on Ethereum
   ↓
4. LayerZero mints EAGLE on BSC
   ↓
5. User receives EAGLE on BSC
```

### Flow 3: Withdraw from Ethereum
```
1. User has EAGLE on Ethereum
   ↓
2. User unwraps EAGLE → vEAGLE (via EagleVaultWrapper)
   ↓
3. User redeems vEAGLE from EagleOVault
   ↓
4. User receives WLFI + USD1 tokens
```

### Flow 4: Deposit on Spoke Chain (Future Feature)
```
1. User has WLFI on BSC
   ↓
2. User deposits via EagleOVaultComposer (future)
   ↓
3. Composer bridges to Ethereum
   ↓
4. Deposits to EagleOVault
   ↓
5. Wraps to EAGLE
   ↓
6. Bridges EAGLE back to BSC
```

---

## 📁 Contract Locations

### Core Contracts (Ethereum Only)
```
contracts/
├── EagleOVault.sol                    # Main vault (ERC4626)
├── EagleVaultWrapper.sol              # Wrapper (shares ↔ OFT)
├── EagleRegistry.sol                  # Chain registry
└── strategies/
    ├── CharmStrategyUSD1.sol          # USD1 strategy
    └── CharmStrategy.sol              # WETH strategy (alternative)
```

### LayerZero Contracts (All Chains)
```
contracts/layerzero/
├── oft/
│   └── EagleShareOFT.sol              # OFT token (all chains)
├── composers/
│   └── EagleOVaultComposer.sol        # Unified composer (future)
└── adapters/
    ├── EagleAssetAdapter.sol          # Asset adapter (future)
    └── EagleShareAdapter.sol          # Share adapter (future)
```

---

## 🔑 Key Design Decisions

### Why EagleVaultWrapper Instead of OFTAdapter?

**Standard OFTAdapter Issues:**
- Different token addresses on each chain
- Hub has vault shares, spokes have OFT tokens
- Inconsistent metadata across chains
- Complex UX

**EagleVaultWrapper Benefits:**
- ✅ Same EAGLE token on ALL chains (via CREATE2)
- ✅ Same address everywhere
- ✅ Consistent metadata
- ✅ Simple UX - always "EAGLE"
- ✅ Separates concerns (vault vs. cross-chain)

**Trade-off:**
- Extra step: deposit → wrap → bridge
- But: Much better UX and consistency

See `ARCHITECTURE_DECISION.md` for full analysis.

---

## 🎯 Deployment Strategy

### Phase 1: Ethereum (Hub)
```
1. Deploy EagleOVault
2. Deploy CharmStrategyUSD1
3. Connect strategy to vault
4. Deploy EagleVaultWrapper
5. Connect wrapper to vault
6. Deploy EagleShareOFT (hub)
7. Connect OFT to wrapper
```

### Phase 2: Spoke Chains
```
For each chain (BSC, Arbitrum, Base, Avalanche):
1. Deploy EagleShareOFT (spoke)
2. Use same CREATE2 salt for same address
```

### Phase 3: LayerZero Configuration
```
1. Set peers (Ethereum ↔ each spoke)
2. Configure DVN settings
3. Test cross-chain transfers
```

---

## 🧪 Testing Strategy

### Unit Tests
- EagleOVault: deposit, withdraw, strategy deployment
- EagleVaultWrapper: wrap, unwrap, access control
- EagleShareOFT: transfer, cross-chain, LayerZero
- CharmStrategy: deploy, harvest, emergency

### Integration Tests
- Vault → Strategy flow
- Wrapper → OFT flow
- Cross-chain transfers
- Emergency procedures

### E2E Tests
- Full user journey: deposit → wrap → bridge → unwrap → withdraw
- Multi-chain scenarios

---

## 📊 Contract Sizes

All contracts optimized for deployment:

| Contract | Size | Status |
|----------|------|--------|
| EagleOVault | ~27 KB | ✅ Optimized |
| EagleVaultWrapper | ~44 KB | ⚠️ Large but necessary |
| EagleShareOFT | ~35 KB | ✅ Optimized |
| CharmStrategyUSD1 | ~40 KB | ✅ Optimized |

**Optimization settings:**
- Solidity 0.8.22
- Optimizer runs: 1 (for deployment)
- Via IR: true
- EVM version: paris

---

## 🔐 Access Control

### EagleOVault Roles
- **Owner:** Can transfer ownership, update critical params
- **Manager:** Can add/remove strategies, update fees
- **Keeper:** Can trigger strategy deployments
- **Emergency Admin:** Can pause contracts

### EagleVaultWrapper Roles
- **Owner:** Can update vault address, pause
- **Emergency Admin:** Can pause wrapping

### EagleShareOFT Roles
- **Owner:** Can set peers, configure LayerZero
- **Wrapper:** Can mint/burn (only on Ethereum)

---

## 🌉 LayerZero Integration

### Endpoints (V2) - Retrieved from EagleRegistry

**Important:** LayerZero endpoints are NOT hardcoded in contracts. They are retrieved dynamically from `EagleRegistry`.

**EagleRegistry Pattern:**
```solidity
// Contracts query the registry for endpoints
address endpoint = registry.getLayerZeroEndpoint(chainId);
```

**Actual Endpoints (LayerZero V2):**
- Ethereum: `0x1a44076050125825900e736c501f859c50fE728c`
- BSC: `0x1a44076050125825900e736c501f859c50fE728c`
- Arbitrum: `0x1a44076050125825900e736c501f859c50fE728c`
- Base: `0x1a44076050125825900e736c501f859c50fE728c`
- Avalanche: `0x1a44076050125825900e736c501f859c50fE728c`

**Why Use Registry?**
- ✅ Centralized configuration management
- ✅ Easy to update if LayerZero upgrades
- ✅ No need to redeploy contracts for endpoint changes
- ✅ Consistent across all contracts

### Chain IDs (LayerZero)
- Ethereum: 30101
- BSC: 30102
- Arbitrum: 30110
- Base: 30184
- Avalanche: 30106

### Peer Configuration
Each EagleShareOFT must have peers set:
```solidity
// On Ethereum OFT
setPeer(30102, bytes32(bscOFTAddress))      // BSC
setPeer(30110, bytes32(arbitrumOFTAddress)) // Arbitrum
setPeer(30184, bytes32(baseOFTAddress))     // Base
setPeer(30106, bytes32(avalancheOFTAddress))// Avalanche

// On each spoke OFT
setPeer(30101, bytes32(ethereumOFTAddress)) // Ethereum
```

---

## 🔗 External Integrations

### Charm Finance
- Vault: `0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71`
- Strategy deposits WLFI + USD1
- Earns Uniswap V3 LP fees
- Auto-rebalances positions

### Uniswap V3
- Router: `0xE592427A0AEce92De3Edee1F18E0157C05861564`
- Used for token swaps in strategy
- TWAP oracle for pricing

### Chainlink
- USD1 Price Feed: `0xF0d9bb015Cd7BfAb877B7156146dc09Bf461370d`
- Used for accurate pricing

---

## 📚 Additional Documentation

For more details, see:
- `ARCHITECTURE_DECISION.md` - Why EagleVaultWrapper pattern
- `EAGLESHAREOFT_REVIEW.md` - OFT contract review
- `WRAPPER_TEST_REPORT.md` - Wrapper testing analysis
- `contracts/layerzero/README.md` - LayerZero integration guide
- `contracts/layerzero/WRAPPER_ARCHITECTURE.md` - Detailed wrapper flow
- `contracts/layerzero/COMPLETE_ARCHITECTURE.md` - Complete technical guide

---

## 🚨 Important Notes for AI Agents

### When Building Backend (Agent 2):
- Track both vEAGLE (vault shares) AND EAGLE (OFT tokens)
- Index wrap/unwrap events from EagleVaultWrapper
- Track cross-chain transfers from EagleShareOFT
- Support multi-chain (Ethereum + 4 spokes)

### When Creating Tests (Agent 3):
- Test EagleOVault independently
- Test EagleVaultWrapper wrap/unwrap flow
- Test EagleShareOFT cross-chain transfers
- Test full flow: deposit → wrap → bridge → unwrap → withdraw
- Test on multiple chains

### When Auditing Security (Agent 4):
- Review wrapper access control (only vault can mint/burn)
- Check LayerZero peer configuration
- Verify 1:1 wrap/unwrap ratio maintained
- Audit cross-chain message handling
- Check for reentrancy in wrapper

---

## ✅ Architecture Checklist

Understanding the architecture means knowing:
- [ ] EagleOVault is ERC4626 vault (Ethereum only)
- [ ] EagleVaultWrapper wraps shares ↔ OFT (Ethereum only)
- [ ] EagleShareOFT is the cross-chain token (all chains)
- [ ] Same EAGLE address on all chains (CREATE2)
- [ ] Hub-and-spoke model (Ethereum = hub)
- [ ] LayerZero V2 for cross-chain
- [ ] Charm Finance for yield
- [ ] No fees on OFT transfers

---

**Last Updated:** October 31, 2025  
**Architecture Version:** EagleVaultWrapper Pattern v2.1

