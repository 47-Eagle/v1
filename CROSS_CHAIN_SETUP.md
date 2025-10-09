# 🌐 Cross-Chain EAGLE Shares - Complete Setup

## 🎯 **What You're Building**

```
Users on ANY chain can hold EAGLE shares
Assets STAY SAFE in Arbitrum vault
Shares can move between chains freely
```

---

## 🏗️ **Architecture**

```
┌─────────────────────────────────────────────────────┐
│  ARBITRUM (Hub - Where assets live)                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  EagleOVaultV3Chainlink                             │
│  Address: 0xbeDE2E7d1B27F8a8fdd85Bb5DA1fe85e0A8   │
│  ├─ Holds: WLFI + USD1 (REAL assets)              │
│  ├─ Total Value: $121                              │
│  ├─ Mints: 12,132 EAGLE shares                     │
│  └─ This NEVER moves to other chains!              │
│                                                     │
│  EagleShareOFTAdapter (Lockbox)                    │
│  ├─ Locks EAGLE when sending to Sonic             │
│  ├─ Unlocks EAGLE when returning                   │
│  └─ Preserves totalSupply                          │
│                                                     │
└────────────┬────────────────────────────────────────┘
             │
             │ LayerZero Network
             ↕️
┌────────────┴────────────────────────────────────────┐
│  SONIC (Spoke - Shares only, NO assets)            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  EagleShareOFT (Synthetic Shares)                  │
│  ├─ Mints: When EAGLE arrives from Arbitrum       │
│  ├─ Burns: When EAGLE sent back                    │
│  ├─ Supply: Matches locked amount on Arbitrum     │
│  └─ NO actual WLFI/USD1 here!                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 📝 **Deployment Steps**

### **Step 1: Deploy on Arbitrum (Hub)**

```bash
npx hardhat run scripts/deploy-cross-chain-shares.ts --network arbitrum
```

**Deploys**: EagleShareOFTAdapter  
**Result**: Adapter address (save this!)

### **Step 2: Deploy on Sonic (Spoke)**

```bash
npx hardhat run scripts/deploy-cross-chain-shares.ts --network sonic
```

**Deploys**: EagleShareOFT  
**Result**: ShareOFT address (save this!)

### **Step 3: Connect Them (Set Peers)**

```javascript
// On Arbitrum:
adapter.setPeer(
  30272, // Sonic EID
  sonicShareOFTAddress
);

// On Sonic:
shareOFT.setPeer(
  30110, // Arbitrum EID
  arbitrumAdapterAddress
);
```

---

## 💰 **Example User Flow**

### **User on Sonic Wants EAGLE:**

```
1. User on Sonic deposits WLFI
   ↓
2. WLFI travels: Sonic → Arbitrum (via WLFI OFT)
   ↓
3. Composer on Arbitrum deposits to vault
   ↓
4. Vault mints EAGLE shares (oracle-priced!)
   ↓
5. Adapter locks EAGLE on Arbitrum
   ↓
6. ShareOFT mints synthetic EAGLE on Sonic
   ↓
7. User receives EAGLE on Sonic! ✅

Assets location: Still in Arbitrum vault ✅
User's EAGLE: On Sonic ✅
```

---

## 🔑 **Key Differences**

| Aspect | Single Chain (Current) | Multi-Chain (With ShareOFT) |
|--------|----------------------|----------------------------|
| **Vault location** | Arbitrum | Arbitrum (same) |
| **Assets location** | Arbitrum | Arbitrum (same) |
| **EAGLE on Arbitrum** | Real (from vault) | Real (from vault) |
| **EAGLE on Sonic** | N/A | Synthetic (via ShareOFT) |
| **User experience** | Deposit on Arbitrum only | Deposit from ANY chain |
| **Complexity** | Simple | Moderate |

---

## ✅ **Benefits of Cross-Chain**

```
Without ShareOFT:
  • Users MUST be on Arbitrum
  • Can't access from Sonic
  • Limited user base

With ShareOFT:
  • Users on Sonic can hold EAGLE ✅
  • Users on BSC can hold EAGLE ✅
  • Users on any chain! ✅
  • 10x larger potential user base ✅
```

---

**Want me to deploy the cross-chain system now?**

I can:
1. Deploy EagleShareOFTAdapter on Arbitrum
2. Guide you to deploy EagleShareOFT on Sonic
3. Show you how to connect them
4. Test cross-chain EAGLE transfers!

Ready to go omnichain? 🚀
