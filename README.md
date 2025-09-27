# 🦅 Eagle Omnichain Vault (Clean LayerZero Implementation)

A **clean, standards-compliant** implementation of the Eagle Omnichain Vault using LayerZero's OVault standard.

## 🎯 **Architecture Overview**

This implementation follows the **official LayerZero OVault pattern** with 5 core contracts:

### **🏛️ Hub Chain (Ethereum)**
- **`EagleOVault`** - ERC4626 vault managing dual-token (WLFI + USD1) Uniswap V3 LP strategy
- **`EagleShareOFTAdapter`** - Lockbox adapter for cross-chain share transfers  
- **`EagleOVaultComposer`** - LayerZero composer orchestrating omnichain operations
- **`WLFIAssetOFT`** & **`USD1AssetOFT`** - Asset OFTs for cross-chain token transfers

### **🌐 Spoke Chains (BSC, Arbitrum, Base, Avalanche)**
- **`EagleShareOFT`** - Omnichain share tokens representing vault ownership
- **`WLFIAssetOFT`** & **`USD1AssetOFT`** - Asset OFTs mirroring hub chain tokens

## 🚀 **Quick Start**

### **1. Setup**
```bash
cd eagle-ovault-clean
cp .env.example .env
# Edit .env with your private key and API keys
npm install
```

### **2. Deploy Hub (Ethereum)**
```bash
npx hardhat deploy:eagle-ovault --network ethereum
```

### **3. Deploy Spokes**
```bash
npx hardhat deploy:eagle-ovault --network bsc
npx hardhat deploy:eagle-ovault --network arbitrum
npx hardhat deploy:eagle-ovault --network base
npx hardhat deploy:eagle-ovault --network avalanche
```

## 📋 **Contract Specifications**

### **`EagleOVault.sol`** (Hub Only)
- **Standard**: ERC4626 + Security Features
- **Assets**: WLFI (primary) + USD1 (secondary)  
- **Strategy**: Dual-token Uniswap V3 LP management
- **Security**: Reentrancy protection, slippage limits, TWAP validation
- **Management**: Rebalancing, emergency pause, access control

### **`EagleShareOFTAdapter.sol`** (Hub Only)
- **Standard**: LayerZero OFTAdapter (lockbox model)
- **Function**: Enables cross-chain transfer of EAGLE vault shares
- **Preserves**: Vault totalSupply() accounting

### **`EagleOVaultComposer.sol`** (Hub Only)
- **Standard**: LayerZero VaultComposerSync
- **Function**: Orchestrates cross-chain deposits and withdrawals
- **Operations**: Asset OFT → Vault → Share OFT routing

### **Asset OFTs** (All Chains)
- **`WLFIAssetOFT.sol`** - Omnichain WLFI token
- **`USD1AssetOFT.sol`** - Omnichain USD1 token

### **`EagleShareOFT.sol`** (Spoke Chains Only)
- **Standard**: LayerZero OFT
- **Function**: Vault share representation on spoke chains
- **Warning**: Never mint directly - breaks vault accounting

## 🎭 **Vanity Address Integration**

The deployment system supports vanity addresses with the pattern `0x47...EA91E`:

```typescript
// In deployConfig.ts
export const VANITY_CONFIG = {
  targetPrefix: '47',
  targetSuffix: 'EA91E',
  create2Factory: '0x695d6B3628B4701E7eAfC0bc511CbAF23f6003eE'
}
```

## 🛠️ **Available Tasks**

### **Deployment**
```bash
npx hardhat deploy:eagle-ovault --network <network>
```

### **Vault Operations**
```bash
# Get vault info
npx hardhat ovault:info --vault <address> --network <network>

# Dual-token deposit
npx hardhat ovault:deposit-dual --vault <address> --wlfi 1000 --usd1 1000 --network <network>

# Dual-token withdrawal  
npx hardhat ovault:withdraw-dual --vault <address> --shares 500 --network <network>

# Rebalance portfolio
npx hardhat ovault:rebalance --vault <address> --network <network>
```

## 🔒 **Security Features**

### **Reentrancy Protection**
- `nonReentrant` modifiers on all external functions
- Checks-Effects-Interactions pattern

### **Input Validation**
- Zero address checks on critical parameters
- Amount validation for deposits/withdrawals
- Balance verification before transfers

### **Access Control**
- Owner-only sensitive operations
- Manager system for vault operations
- Authorized user mapping

### **Slippage Protection**
- TWAP-based price validation
- Configurable slippage limits
- Rebalance thresholds

## 📊 **Cross-Chain Flow Examples**

### **Deposit Flow (BSC → Ethereum)**
```
1. User deposits WLFI on BSC
2. BSC WLFI OFT → Ethereum WLFI OFT (LayerZero)
3. Composer receives WLFI on Ethereum
4. Composer deposits into EagleOVault
5. Vault mints EAGLE shares
6. Composer sends EAGLE shares to user's destination chain
```

### **Withdrawal Flow (Base → Ethereum)**
```
1. User withdraws EAGLE shares on Base
2. Base EAGLE OFT → Ethereum Share Adapter (LayerZero)
3. Composer receives shares on Ethereum
4. Composer redeems from EagleOVault
5. Vault burns shares, returns WLFI/USD1
6. Composer sends assets to user's destination chain
```

## 🌐 **Network Configuration**

| Chain | Chain ID | LayerZero EID | LZ Endpoint |
|-------|----------|---------------|-------------|
| Ethereum | 1 | 30101 | 0x1a44076050125825900e736c501f859c50fE728c |
| BSC | 56 | 30102 | 0x1a44076050125825900e736c501f859c50fE728c |
| Arbitrum | 42161 | 30110 | 0x1a44076050125825900e736c501f859c50fE728c |
| Base | 8453 | 30184 | 0x1a44076050125825900e736c501f859c50fE728c |
| Avalanche | 43114 | 30106 | 0x1a44076050125825900e736c501f859c50fE728c |

## 🧪 **Testing Strategy**

### **Unit Tests**
- Individual contract functionality
- Edge cases and error conditions
- Gas optimization verification

### **Integration Tests**
- Cross-chain message flows
- End-to-end deposit/withdrawal
- Slippage and rebalancing logic

### **Security Tests**
- Static analysis with Slither
- Formal verification of critical paths
- Stress testing with large amounts

## 🔄 **Differences from Previous Implementation**

| Aspect | Previous | Clean Implementation |
|--------|----------|---------------------|
| **Architecture** | Custom hybrid | ✅ Official LayerZero OVault |
| **Contracts** | Mixed standards | ✅ 5 standard OVault contracts |
| **Deployment** | Manual scripts | ✅ Hardhat tasks with config |
| **Testing** | Limited | ✅ Comprehensive test suite |
| **Documentation** | Scattered | ✅ Centralized and clear |
| **Security** | Basic | ✅ Production-ready hardening |

## 📝 **License**

MIT License - see LICENSE file for details.

---

**Built with ❤️ using LayerZero OVault Standard**
