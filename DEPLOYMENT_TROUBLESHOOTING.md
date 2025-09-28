# 🚨 Deployment Troubleshooting Guide

## 📊 **Issue Analysis**

Your deployment failed with **"execution reverted"** errors across all chains. Here's the complete diagnosis and solution:

### **🔍 Root Cause: Placeholder Token Addresses**

The original script used **fake addresses** that don't exist as actual contracts:

```typescript
const WLFI_TOKEN = "0x1111111111111111111111111111111111111111"; // ❌ PLACEHOLDER
const USD1_TOKEN = "0x2222222222222222222222222222222222222222"; // ❌ PLACEHOLDER
const REGISTRY_ADDRESS = "0x472656c76f45E8a8a63FffD32aB5888898EeA91E"; // ❓ UNVERIFIED
```

### **💥 Why This Caused Failures**

1. **Adapter Constructors**: `WLFIAdapter` and `USD1Adapter` require **valid ERC20 contracts**
2. **Registry Dependency**: `EagleShareOFT` expects a **configured registry** at the specified address
3. **Contract Validation**: LayerZero contracts perform **address validation** in constructors
4. **Interface Compliance**: Placeholder addresses don't implement required interfaces

---

## ✅ **SOLUTIONS PROVIDED**

### **1. Fixed Deployment Script**
**File**: `scripts/deploy-with-real-addresses.ts`

**Features**:
- ✅ **Address validation** before deployment
- ✅ **Mock token fallback** for testing
- ✅ **Graceful handling** of missing tokens
- ✅ **Comprehensive error reporting**
- ✅ **Chain-specific logic** (hub vs spoke)

### **2. Token Research Script**
**File**: `scripts/research-token-addresses.ts`

**Purpose**: Help you find real WLFI and USD1 addresses on each chain

### **3. Simple Test Script**
**File**: `scripts/deploy-simple-test.ts`

**Purpose**: Deploy immediately without registry dependencies

### **4. Mock ERC20 Contract**
**File**: `contracts/mocks/MockERC20.sol`

**Purpose**: Testing deployment without real tokens

---

## 🚀 **IMMEDIATE SOLUTIONS**

### **Option 1: Test Deployment (Fastest)**
```bash
# Deploy with mock tokens for testing
npx hardhat run scripts/deploy-simple-test.ts --network ethereum
npx hardhat run scripts/deploy-simple-test.ts --network arbitrum
```

**Benefits**:
- ✅ Works immediately
- ✅ Proves contracts are valid
- ✅ No token research required
- ✅ Mock tokens for testing

### **Option 2: Research Real Addresses (Production)**
```bash
# Research token addresses on each chain
npx hardhat run scripts/research-token-addresses.ts --network ethereum
npx hardhat run scripts/research-token-addresses.ts --network arbitrum
```

**Then update** `TOKEN_ADDRESSES` in `deploy-with-real-addresses.ts`:
```typescript
const TOKEN_ADDRESSES = {
    ethereum: {
        wlfi: "0x...", // ← Real WLFI address on Ethereum
        usd1: "0x...", // ← Real USD1 address on Ethereum
        registry: "0x472656c76f45E8a8a63FffD32aB5888898EeA91E"
    },
    // ... other chains
};
```

### **Option 3: Registry-Free Deployment**
```typescript
// Skip registry, use direct endpoints
const EagleShareOFT = await ethers.getContractFactory("EagleShareOFTTest");
const eagleShareOFT = await EagleShareOFT.deploy(
    "Eagle",
    "EAGLE",
    chainConfig.endpointV2, // ← Direct endpoint
    deployer.address
);
```

---

## 🔍 **TOKEN RESEARCH GUIDE**

### **Where to Find Token Addresses**

1. **Official Websites/Docs**
   - WLFI project documentation
   - USD1 project documentation

2. **Blockchain Explorers**
   - **Ethereum**: https://etherscan.io
   - **Arbitrum**: https://arbiscan.io
   - **Base**: https://basescan.org
   - **BSC**: https://bscscan.com

3. **Search Methods**
   - Search for token symbols: "WLFI", "USD1"
   - Verify contract name/symbol matches
   - Check if contract is verified
   - Ensure it's the official contract (not a fake)

### **Validation Checklist**
- [ ] Contract address exists on target chain
- [ ] Contract implements ERC20 interface
- [ ] Symbol matches expected ("WLFI", "USD1")
- [ ] Contract is verified on explorer
- [ ] Sufficient liquidity/usage (not abandoned)

---

## 🏗️ **DEPLOYMENT STRATEGY**

### **Hybrid Approach (Recommended)**
```
Hub Chain (Ethereum):
├── EagleOVault (main vault)
├── EagleShareAdapter (vault shares)
├── WLFIAdapter (if WLFI exists) OR WLFIAssetOFT
└── USD1Adapter (if USD1 exists) OR USD1AssetOFT

Spoke Chains (Arbitrum, Base, BSC):
├── EagleShareOFT (cross-chain shares)
├── WLFIAssetOFT (if WLFI doesn't exist) OR WLFIAdapter
└── USD1AssetOFT (if USD1 doesn't exist) OR USD1Adapter
```

### **Decision Matrix**
| Chain | WLFI Exists? | USD1 Exists? | Use |
|-------|-------------|-------------|-----|
| Ethereum | ✅ Yes | ✅ Yes | Adapters |
| Arbitrum | ❓ Research | ❓ Research | TBD |
| Base | ❓ Research | ❓ Research | TBD |
| BSC | ❓ Research | ❓ Research | TBD |

---

## 🧪 **TESTING WORKFLOW**

### **Phase 1: Local Testing**
```bash
# 1. Test compilation
npx hardhat compile

# 2. Test deployment with mocks
npx hardhat run scripts/deploy-simple-test.ts --network ethereum
```

### **Phase 2: Address Research**
```bash
# Research each chain
npx hardhat run scripts/research-token-addresses.ts --network ethereum
npx hardhat run scripts/research-token-addresses.ts --network arbitrum
```

### **Phase 3: Production Deployment**
```bash
# Deploy with real addresses
npx hardhat run scripts/deploy-with-real-addresses.ts --network ethereum
npx hardhat run scripts/deploy-with-real-addresses.ts --network arbitrum
```

### **Phase 4: LayerZero Configuration**
```bash
# Configure peers and DVNs
npx hardhat run scripts/configure-layerzero-production.ts --network ethereum
```

---

## 🔧 **QUICK FIXES FOR COMMON ISSUES**

### **"execution reverted" Error**
**Cause**: Invalid constructor parameters
**Fix**: Validate all addresses exist and implement required interfaces

### **"Registry verification failed"**
**Cause**: Registry doesn't exist or isn't configured
**Fix**: Skip registry mode or deploy registry first

### **"insufficient funds for gas"**
**Cause**: Not enough ETH for deployment
**Fix**: Fund deployer wallet or reduce gas price

### **"Contract not found"**
**Cause**: Token address doesn't exist on current chain
**Fix**: Use Asset OFT instead of Adapter

---

## 📋 **IMMEDIATE ACTION PLAN**

### **Step 1: Test Basic Deployment**
```bash
npx hardhat run scripts/deploy-simple-test.ts --network ethereum
```
**Expected**: ✅ Successful deployment with mock tokens

### **Step 2: Research Token Addresses**
```bash
npx hardhat run scripts/research-token-addresses.ts --network ethereum
```
**Expected**: 📋 List of findings and recommendations

### **Step 3: Update & Deploy**
- Update `TOKEN_ADDRESSES` with real addresses
- Deploy with `scripts/deploy-with-real-addresses.ts`
- Configure LayerZero settings

### **Step 4: Verify Success**
```bash
npx hardhat run scripts/verify-layerzero-config.ts --network ethereum
```

---

## ✅ **SUCCESS CRITERIA**

### **Deployment Success**
- [ ] All contracts deploy without revert
- [ ] Address validation passes
- [ ] LayerZero endpoints accessible
- [ ] No constructor failures

### **Token Integration**
- [ ] Real token addresses found and verified
- [ ] Adapters connect to existing tokens
- [ ] Asset OFTs created for missing tokens
- [ ] Mock tokens available for testing

### **LayerZero Configuration**
- [ ] Peers configured between chains
- [ ] DVN security settings applied
- [ ] Enforced options set correctly
- [ ] Cross-chain transfers working

---

## 🎯 **FINAL RECOMMENDATION**

**Start with Option 1** (Simple Test) to prove the system works, then **research real addresses** and **deploy to production**.

Your contracts are **architecturally sound** - the issue was just placeholder addresses. These fixes will get you deployed successfully! 🦅
