# Eagle OVault Sepolia Deployment Guide

Complete guide for deploying the Eagle OVault system to Sepolia testnet.

---

## 🎯 **Deployment Overview**

We'll deploy across **two chains**:
1. **Sepolia (Hub)** - Full system (vault, wrapper, composer, OFTs)
2. **Arbitrum Sepolia (Spoke)** - OFTs only

---

## 📋 **Prerequisites**

### **1. Install Dependencies**

```bash
# Foundry (if not installed)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Node.js packages
npm install --save-dev hardhat @layerzerolabs/toolbox-hardhat
```

### **2. Set Up Environment Variables**

```bash
# Copy example file
cp .env.example .env

# Edit .env with your values
nano .env
```

Required variables:
```bash
PRIVATE_KEY=0x...                    # Your deployer private key
SEPOLIA_RPC_URL=https://...          # Sepolia RPC (Alchemy/Infura)
ARBITRUM_SEPOLIA_RPC_URL=https://... # Arbitrum Sepolia RPC
ETHERSCAN_API_KEY=...                # For contract verification
ARBISCAN_API_KEY=...                 # For Arbitrum verification
```

### **3. Fund Your Deployer Address**

Get testnet ETH:
- **Sepolia**: https://sepoliafaucet.com/
- **Arbitrum Sepolia**: https://faucet.triangleplatform.com/arbitrum/sepolia

You'll need ~0.5 ETH on each chain for deployment + gas.

---

## 🚀 **Step-by-Step Deployment**

### **Phase 1: Deploy to Sepolia (Hub Chain)**

```bash
# Run complete deployment script
forge script script/DeploySepoliaComplete.s.sol:DeploySepoliaComplete \
  --rpc-url sepolia \
  --broadcast \
  --verify \
  -vvvv
```

**This deploys:**
- ✅ WLFIAssetOFT (asset token)
- ✅ USD1AssetOFT (asset token)
- ✅ EagleOVault (vault)
- ✅ EagleShareOFT (hub OFT)
- ✅ EagleVaultWrapper (wrapper)
- ✅ EagleOVaultComposer (composer)

**Saves to:** `deployments/sepolia-complete.json`

---

### **Phase 2: Create Uniswap V3 Pool**

The vault needs a WLFI/USD1 Uniswap pool for swaps.

#### **Option A: Using Uniswap Interface**

1. Go to https://app.uniswap.org/
2. Connect wallet (Sepolia network)
3. Click "Pool" → "New Position"
4. Select WLFI and USD1 tokens (paste addresses from deployment)
5. Choose fee tier: **0.3%** (recommended)
6. Set initial price ratio: **1 WLFI = 80,000 USD1**
7. Add liquidity: ~1000 WLFI + 80M USD1
8. Save the pool address

#### **Option B: Using Script** (Advanced)

```solidity
// Create script/CreatePool.s.sol
IUniswapV3Factory(factory).createPool(wlfi, usd1, 3000); // 0.3% fee
```

---

### **Phase 3: Make Initial Deposit**

Fund the vault with initial liquidity:

```bash
# Use cast to interact with deployed contracts
cast send $VAULT_ADDRESS \
  "deposit(uint256,address)" \
  "1000000000000000000000" \  # 1000 WLFI
  $YOUR_ADDRESS \
  --rpc-url sepolia \
  --private-key $PRIVATE_KEY
```

---

### **Phase 4: Deploy to Arbitrum Sepolia (Spoke Chain)**

```bash
# Deploy spoke contracts
forge script script/DeployArbitrumSepolia.s.sol:DeployArbitrumSepolia \
  --rpc-url arbitrum_sepolia \
  --broadcast \
  --verify \
  -vvvv
```

**This deploys:**
- ✅ WLFIAssetOFT (spoke)
- ✅ USD1AssetOFT (spoke)
- ✅ EagleShareOFT (spoke, same contract as hub!)

**Saves to:** `deployments/arbitrum-sepolia.json`

---

### **Phase 5: Wire LayerZero Peers**

Connect the OFT contracts across chains using LayerZero DevTools.

#### **5.1: Create LayerZero Configs**

**layerzero.wlfi.config.ts:**
```typescript
import { EndpointId } from '@layerzerolabs/lz-definitions'

const sepoliaContract = {
    eid: EndpointId.SEPOLIA_V2_TESTNET,
    contractName: 'WLFIAssetOFT',
}

const arbitrumSepoliaContract = {
    eid: EndpointId.ARBSEP_V2_TESTNET,
    contractName: 'WLFIAssetOFT',
}

export default {
    contracts: [
        {
            contract: sepoliaContract,
        },
        {
            contract: arbitrumSepoliaContract,
        },
    ],
    connections: [
        {
            from: sepoliaContract,
            to: arbitrumSepoliaContract,
        },
        {
            from: arbitrumSepoliaContract,
            to: sepoliaContract,
        },
    ],
}
```

Create similar files for:
- `layerzero.usd1.config.ts`
- `layerzero.share.config.ts`

#### **5.2: Wire Peers**

```bash
# Wire WLFI peers
npx hardhat lz:oapp:wire --oapp-config layerzero.wlfi.config.ts

# Wire USD1 peers
npx hardhat lz:oapp:wire --oapp-config layerzero.usd1.config.ts

# Wire ShareOFT peers
npx hardhat lz:oapp:wire --oapp-config layerzero.share.config.ts
```

---

### **Phase 6: Configure Fee-on-Swap (Arbitrum Sepolia)**

Set up V3 pool detection for fee-on-swap:

```bash
# Assuming you have a vEAGLE/USDC pool on Arbitrum Sepolia
cast send $SHARE_OFT_ADDRESS \
  "setV3Pool(address,bool)" \
  $UNISWAP_V3_POOL_ADDRESS \
  true \
  --rpc-url arbitrum_sepolia \
  --private-key $PRIVATE_KEY
```

---

## ✅ **Testing the Deployment**

### **Test 1: Hub-Only Deposit**

```bash
# On Sepolia

# 1. Approve WLFI
cast send $WLFI_OFT \
  "approve(address,uint256)" \
  $VAULT_ADDRESS \
  "1000000000000000000000" \
  --rpc-url sepolia

# 2. Deposit to vault
cast send $VAULT_ADDRESS \
  "deposit(uint256,address)" \
  "1000000000000000000000" \
  $YOUR_ADDRESS \
  --rpc-url sepolia

# 3. Check vEAGLE balance
cast call $VAULT_ADDRESS \
  "balanceOf(address)(uint256)" \
  $YOUR_ADDRESS \
  --rpc-url sepolia
```

### **Test 2: Wrap Vault Shares**

```bash
# 1. Approve wrapper
cast send $VAULT_ADDRESS \
  "approve(address,uint256)" \
  $WRAPPER_ADDRESS \
  "1000000000000000000000" \
  --rpc-url sepolia

# 2. Wrap shares
cast send $WRAPPER_ADDRESS \
  "wrap(uint256)" \
  "1000000000000000000000" \
  --rpc-url sepolia

# 3. Check OFT balance
cast call $SHARE_OFT_ADDRESS \
  "balanceOf(address)(uint256)" \
  $YOUR_ADDRESS \
  --rpc-url sepolia
```

### **Test 3: Cross-Chain Deposit**

```bash
# From Arbitrum Sepolia → Sepolia → Arbitrum Sepolia

# 1. Get quote for LayerZero fee
cast call $WLFI_OFT_ADDRESS \
  "quoteSend((uint32,bytes32,uint256,uint256,bytes,bytes,bytes),bool)" \
  "(40161,'0x$YOUR_ADDRESS_HEX',1000000000000000000000,1000000000000000000000,'0x','0x','0x')" \
  false \
  --rpc-url arbitrum_sepolia

# 2. Send cross-chain
cast send $WLFI_OFT_ADDRESS \
  "send((uint32,bytes32,uint256,uint256,bytes,bytes,bytes),(uint256,uint256),address)" \
  "(40161,'0x$COMPOSER_ADDRESS_HEX',1000000000000000000000,980000000000000000000,'0x','0x','0x')" \
  "(100000000000000000,0)" \
  $YOUR_ADDRESS \
  --value 0.01ether \
  --rpc-url arbitrum_sepolia

# 3. Wait ~2 minutes for LayerZero delivery

# 4. Check vEAGLE balance on Arbitrum Sepolia
cast call $SHARE_OFT_ADDRESS \
  "balanceOf(address)(uint256)" \
  $YOUR_ADDRESS \
  --rpc-url arbitrum_sepolia
```

---

## 📊 **Deployment Checklist**

### **Sepolia (Hub):**
- [ ] Deploy WLFIAssetOFT
- [ ] Deploy USD1AssetOFT
- [ ] Deploy EagleOVault
- [ ] Deploy EagleShareOFT
- [ ] Deploy EagleVaultWrapper
- [ ] Deploy EagleOVaultComposer
- [ ] Mint test tokens (1M WLFI, 1M USD1)
- [ ] Create Uniswap V3 pool (WLFI/USD1)
- [ ] Add liquidity to pool
- [ ] Make initial deposit to vault
- [ ] Grant wrapper mint/burn on ShareOFT
- [ ] Whitelist composer in wrapper
- [ ] Verify all contracts on Etherscan

### **Arbitrum Sepolia (Spoke):**
- [ ] Deploy WLFIAssetOFT
- [ ] Deploy USD1AssetOFT
- [ ] Deploy EagleShareOFT
- [ ] Configure fee-on-swap (1% buy, 2% sell)
- [ ] Verify all contracts on Arbiscan

### **LayerZero:**
- [ ] Wire WLFI peers (Sepolia ↔ Arbitrum Sepolia)
- [ ] Wire USD1 peers (Sepolia ↔ Arbitrum Sepolia)
- [ ] Wire ShareOFT peers (Sepolia ↔ Arbitrum Sepolia)

### **Testing:**
- [ ] Test hub-only deposit
- [ ] Test wrap/unwrap
- [ ] Test cross-chain deposit (Arbitrum → Hub)
- [ ] Test cross-chain redemption (Hub → Arbitrum)
- [ ] Test fee-on-swap on Arbitrum
- [ ] Monitor LayerZero messages

---

## 🐛 **Troubleshooting**

### **"Insufficient funds" during deployment**
```bash
# Check balance
cast balance $YOUR_ADDRESS --rpc-url sepolia

# Get more testnet ETH from faucet
```

### **"LayerZero: invalid endpoint"**
- Verify endpoint addresses in deployment scripts
- Sepolia: `0x6EDCE65403992e310A62460808c4b910D972f10f`
- Arbitrum Sepolia: `0x6EDCE65403992e310A62460808c4b910D972f10f`

### **"Pool does not exist"**
- Create Uniswap V3 pool first (Phase 2)
- Update vault with pool address

### **"ERC20: transfer amount exceeds balance"**
- Check vault has sufficient liquidity
- Sync balances: `vault.syncBalances()`
- Check pool ratios

### **Cross-chain transfer not arriving**
- Check LayerZero Scan: https://testnet.layerzeroscan.com/
- Verify peers are wired correctly
- Ensure sufficient native token for gas on destination

---

## 📚 **Useful Commands**

### **Check Deployment**
```bash
# View deployment files
cat deployments/sepolia-complete.json
cat deployments/arbitrum-sepolia.json

# Check contract on Etherscan
https://sepolia.etherscan.io/address/$CONTRACT_ADDRESS
```

### **Interact with Contracts**
```bash
# Read functions
cast call $CONTRACT "functionName()(returnType)" --rpc-url sepolia

# Write functions
cast send $CONTRACT "functionName(args)" --rpc-url sepolia --private-key $KEY
```

### **Monitor LayerZero**
```bash
# Track cross-chain message
https://testnet.layerzeroscan.com/tx/$TX_HASH
```

---

## 🎉 **Success Criteria**

Your deployment is successful when:

✅ All contracts deployed and verified  
✅ Initial deposit works on hub  
✅ Wrap/unwrap works on hub  
✅ Cross-chain deposit works (Arbitrum → Hub → Arbitrum)  
✅ Cross-chain redemption works (Hub → Arbitrum)  
✅ Fee-on-swap applies on Arbitrum DEX  
✅ LayerZero messages deliver successfully  

---

## 📞 **Support**

**Issues?** Check:
- [LayerZero Docs](https://docs.layerzero.network/)
- [Foundry Book](https://book.getfoundry.sh/)
- [Uniswap V3 Docs](https://docs.uniswap.org/contracts/v3/overview)

**Deployed Addresses:**
Save all addresses to `deployments/` directory for reference!

---

**Last Updated:** October 21, 2025  
**Network:** Sepolia + Arbitrum Sepolia Testnet  
**Status:** Ready to deploy! 🚀

