# Eagle OVault - Sepolia Testnet Deployment

## Deployment Summary

**Date:** October 21, 2025  
**Network:** Sepolia Testnet (Chain ID: 11155111)  
**Deployer:** 0x7310Dd6EF89b7f829839F140C6840bc929ba2031

---

## 📋 Deployed Contracts

### Core Infrastructure
| Contract | Address | Purpose |
|----------|---------|---------|
| **EagleRegistry** | `0x86d12D69373bF7865ABEcDc34d7e676dAc678235` | Chain registry & LayerZero endpoint management |
| **EagleOVault** | `0x8901c6Dc36D9d023B33883cA028A45Db82047537` | Main ERC-4626 vault contract |

### LayerZero OFTs
| Contract | Address | Purpose |
|----------|---------|---------|
| **WLFIAssetOFT** | `0xba9B60A00fD10323Abbdc1044627B54D3ebF470e` | Cross-chain WLFI token |
| **USD1AssetOFT** | `0x93d48D3625fF8E522f63E873352256607b37f2EF` | Cross-chain USD1 token |
| **EagleShareOFT** | `0xbeA4D2841e1892a8186853A818F5db43D2C5071E` | Cross-chain vault share token |

### Cross-Chain Components
| Contract | Address | Purpose |
|----------|---------|---------|
| **EagleVaultWrapper** | `0x84a744da7a4646942b5C9724897ca05bCbBbB10b` | Wraps vault shares into OFT shares (1% wrap, 2% unwrap fees) |
| **EagleOVaultComposer** | `0x87B831E8e1b09B35c888595cBae81CeA0d6bB260` | LayerZero cross-chain orchestrator |

---

## 🔧 Configuration

### LayerZero
- **Endpoint:** `0x6EDCE65403992e310A62460808c4b910D972f10f`
- **Chain EID:** 40161

### Roles & Permissions
All roles currently set to deployer address:
- Owner: 0x7310Dd6EF89b7f829839F140C6840bc929ba2031
- Manager: 0x7310Dd6EF89b7f829839F140C6840bc929ba2031
- Keeper: 0x7310Dd6EF89b7f829839F140C6840bc929ba2031
- Emergency Admin: 0x7310Dd6EF89b7f829839F140C6840bc929ba2031
- Performance Fee Recipient: 0x7310Dd6EF89b7f829839F140C6840bc929ba2031
- Wrapper Fee Recipient: 0x7310Dd6EF89b7f829839F140C6840bc929ba2031

### Test Tokens
- **WLFI Minted:** 1,000,000 tokens
- **USD1 Minted:** 1,000,000 tokens

---

## 🏗️ Architecture

### Wrapper Architecture (Hub Chain)
```
User Deposits WLFI/USD1
    ↓
EagleOVault (vault shares)
    ↓
EagleVaultWrapper (wrap shares)
    ↓
EagleShareOFT (bridgeable shares)
    ↓
LayerZero → Other Chains
```

### Cross-Chain Flow
1. **Deposit on spoke chain:** Asset OFT → Hub Composer → Vault → Wrapper → Share OFT → User
2. **Withdraw on spoke chain:** Share OFT → Hub Composer → Wrapper → Vault → Asset OFT → User

---

## ✅ Deployment Checklist

- [x] EagleRegistry deployed
- [x] Registry configured with Sepolia chain
- [x] LayerZero endpoint registered
- [x] WLFI and USD1 OFTs deployed
- [x] Test tokens minted
- [x] EagleOVault deployed with correct parameters
- [x] Vault roles configured (keeper, emergency admin, fee recipient)
- [x] EagleShareOFT deployed
- [x] EagleVaultWrapper deployed with fee structure
- [x] Wrapper minter permissions set
- [x] Wrapper whitelisting configured
- [x] EagleOVaultComposer deployed
- [x] Token approvals set up

---

## 📝 Notes

### Important Details
1. **Registry as Source of Truth:** All contracts get LayerZero endpoint from EagleRegistry
2. **Dummy Pool Address:** Uniswap V3 pool uses dummy address (0x3) for testnet
3. **Placeholder Price Feeds:** Using dummy addresses for price feeds on testnet
4. **Wrapper Fees:**
   - Wrap (deposit): 1% (100 bps)
   - Unwrap (withdraw): 2% (200 bps)
5. **Vault Fees:**
   - Deposit: 1%
   - Withdraw: 2%
   - Performance: 4.7% (with 1% to Charm Finance)

### Next Steps
1. Create Uniswap V3 pool for WLFI/USD1
2. Add initial liquidity to the pool
3. Test deposit/withdraw flows
4. Test cross-chain operations
5. Configure LayerZero peers for other chains
6. Deploy to additional spoke chains (Arbitrum, Base, etc.)

---

## 🔗 Verification

To verify contracts on Etherscan:
```bash
forge verify-contract <ADDRESS> <CONTRACT> --chain sepolia --watch
```

Example:
```bash
forge verify-contract 0x8901c6Dc36D9d023B33883cA028A45Db82047537 \
  contracts/EagleOVault.sol:EagleOVault --chain sepolia --watch
```

---

## 🧪 Testing

### Test Vault Deposit
1. Approve WLFI/USD1 to vault
2. Call `depositDual()` with equal amounts
3. Receive vEAGLE shares

### Test Wrapper
1. Approve vEAGLE to wrapper
2. Call `wrap()` to get EagleShareOFT
3. EagleShareOFT can now be bridged cross-chain

---

## 📞 Support

- **Documentation:** See `/contracts/layerzero/` for architecture docs
- **Repository:** eagle-ovault-clean
- **Network:** Sepolia Testnet
- **Deployer:** 0x7310Dd6EF89b7f829839F140C6840bc929ba2031

