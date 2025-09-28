# 🦅 Eagle Vault Production Checklist
*Based on LayerZero V2 Integration Checklist*

## 📋 **Pre-Deployment Requirements**

### **1. OApp Implementation** ✅

- [x] **Use Latest LayerZero Packages**: Using `@layerzerolabs/oft-evm` V2
- [x] **Avoid Hardcoded Endpoints**: Using registry-based resolution
- [x] **Registry Architecture**: `EagleShareOFT.sol` uses `IChainRegistry`
- [ ] **Set Peers on Every Pathway**: CRITICAL - Need deployment script
- [ ] **Set Libraries on Every Pathway**: Need explicit library configuration
- [ ] **Set Security/DVN Config**: Need DVN configuration scripts
- [ ] **Set Delegate**: Need to configure delegates
- [ ] **Check Initialization Logic**: Need to verify `allowInitializePath`

### **2. Custom Business Logic** ⚠️

- [x] **Message Safety**: Single-action cross-chain messages
- [ ] **Mock/Test Functions Removed**: Need final audit
- [ ] **Enforced Gas/Value**: CRITICAL - Need `setEnforcedOptions`
- [ ] **lzReceive Security**: Need to verify OAppReceiver inheritance
- [ ] **lzCompose Security**: If using composers, need security checks
- [ ] **msg.value Enforcement**: Need to encode/decode values in messages

### **3. OFT Implementation** ✅

- [x] **Use-Case Contracts**: 
  - `EagleShareOFT.sol` - New omnichain token ✅
  - `WLFIAdapter.sol` - Existing token wrapper ✅
  - `USD1Adapter.sol` - Existing token wrapper ✅
- [x] **Single Lockbox Rule**: Only one adapter per token ✅
- [x] **Shared Decimals**: Need to verify consistency across chains
- [ ] **Minter/Burner Permissions**: Need to verify for Asset OFTs
- [x] **Structured Codecs**: Using standard OFT encoding ✅

### **4. Authority & Ownership** 🔄

- [ ] **OApp Ownership**: Need to set final owners
- [ ] **OApp Delegate**: Need to transfer delegates
- [ ] **Upgradeable Admin**: If using upgradeable contracts
- [ ] **Implementation Initialization**: If using upgradeable contracts

---

## 🚨 **CRITICAL MISSING COMPONENTS**

### **1. Peer Configuration Scripts**
```bash
# URGENT: Create peer configuration for all chains
scripts/configure-layerzero-production.ts ✅ CREATED
```

### **2. DVN Security Configuration**
```bash
# URGENT: Configure DVNs for production security
scripts/configure-dvn-security.ts ✅ CREATED
```

### **3. Enforced Options**
```bash
# URGENT: Ensure sufficient gas for cross-chain execution
- Need to add setEnforcedOptions to deployment scripts
- Need to profile gas usage for each message type
```

### **4. Library Configuration**
```bash
# URGENT: Explicitly set send/receive libraries
- EndpointV2.setSendLibrary(oApp, dstEid, sendLib)
- EndpointV2.setReceiveLibrary(oApp, srcEid, recvLib, gracePeriod)
```

---

## 📊 **Chain-by-Chain Deployment Status**

### **Ethereum (Hub Chain) - EID 30101**
- [ ] EagleOVault.sol deployed
- [ ] EagleShareAdapter.sol deployed (wraps vault shares)
- [ ] WLFIAdapter.sol deployed (if WLFI exists)
- [ ] USD1Adapter.sol deployed (if USD1 exists)
- [ ] Peers configured for: Arbitrum, Base, BSC
- [ ] DVNs configured for: Arbitrum, Base, BSC
- [ ] Enforced options set
- [ ] Libraries configured

### **Arbitrum - EID 30110**
- [ ] EagleShareOFT.sol deployed
- [ ] WLFIAssetOFT.sol deployed (if WLFI missing)
- [ ] USD1AssetOFT.sol deployed (if USD1 missing)
- [ ] Peers configured for: Ethereum, Base, BSC
- [ ] DVNs configured for: Ethereum, Base, BSC
- [ ] Enforced options set
- [ ] Libraries configured

### **Base - EID 30184**
- [ ] EagleShareOFT.sol deployed
- [ ] WLFIAssetOFT.sol deployed (if WLFI missing)
- [ ] USD1AssetOFT.sol deployed (if USD1 missing)
- [ ] Peers configured for: Ethereum, Arbitrum, BSC
- [ ] DVNs configured for: Ethereum, Arbitrum, BSC
- [ ] Enforced options set
- [ ] Libraries configured

### **BSC - EID 30102**
- [ ] EagleShareOFT.sol deployed
- [ ] WLFIAssetOFT.sol deployed (if WLFI missing)  
- [ ] USD1AssetOFT.sol deployed (if USD1 missing)
- [ ] Peers configured for: Ethereum, Arbitrum, Base
- [ ] DVNs configured for: Ethereum, Arbitrum, Base
- [ ] Enforced options set
- [ ] Libraries configured

---

## ⚡ **IMMEDIATE ACTION ITEMS**

### **Phase 1: Core Configuration (URGENT)**
1. **Run**: `npx hardhat run scripts/configure-layerzero-production.ts --network ethereum`
2. **Run**: `npx hardhat run scripts/configure-dvn-security.ts --network ethereum`
3. **Repeat**: For all target chains (Arbitrum, Base, BSC)

### **Phase 2: Security Verification**
1. **Verify**: All peers are set correctly
2. **Verify**: DVN configurations match on both sides of each pathway
3. **Verify**: Enforced options provide sufficient gas
4. **Test**: Cross-chain message flow end-to-end

### **Phase 3: Final Audit**
1. **Remove**: Any test/mock functions
2. **Verify**: All ownership transfers complete
3. **Test**: Emergency scenarios and pausing
4. **Document**: Final deployed addresses and configuration

---

## 🎯 **Success Criteria**

### **✅ Ready for Production When:**
- [ ] All chains deployed with consistent configurations
- [ ] All peers configured bidirectionally
- [ ] All DVNs configured with 2+ required validators
- [ ] All enforced options tested and verified
- [ ] Cross-chain transfers tested successfully
- [ ] Emergency controls tested
- [ ] Ownership transferred to final controllers

### **⚠️ Production Risks If Incomplete:**
- **No Peers**: Messages will be rejected
- **No DVNs**: Messages may fail validation or be insecure  
- **No Enforced Options**: Messages may fail due to insufficient gas
- **No Libraries**: May fallback to potentially unsafe defaults

---

**🚨 CRITICAL: Do not deploy to production until ALL items are complete!**
