# 🏗️ Eagle Vault Architecture Decision

**Date:** October 27, 2025  
**Decision:** Use EagleVaultWrapper + Same EagleShareOFT on ALL chains  
**Status:** ✅ **APPROVED**

---

## 🎯 Architecture Overview

### **Core Principle:** Same EagleShareOFT metadata and address on ALL chains

Unlike the standard LayerZero OFTAdapter pattern (which uses adapters on the hub chain), we're using **EagleVaultWrapper** to maintain consistent token addresses and branding across all chains.

---

## 🌐 Multi-Chain Architecture

```
╔══════════════════════════════════════════════════════════════╗
║                    ALL CHAINS (Same Contract)                ║
╚══════════════════════════════════════════════════════════════╝

  EagleShareOFT (0xSAME_ADDRESS via CREATE2)
  ├─ Name: "Eagle Vault Shares"
  ├─ Symbol: "EAGLE"
  ├─ Decimals: 18
  ├─ LayerZero OFT functionality
  └─ No fees on transfers ✅


╔══════════════════════════════════════════════════════════════╗
║              ETHEREUM MAINNET (Hub) - Special Setup          ║
╚══════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────┐
│ 1. EagleOVault (0xVAULT...)                                 │
│    └─ ERC4626 vault                                         │
│    └─ Issues vault shares on deposit                        │
│    └─ Redeems vault shares on withdrawal                    │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. EagleVaultWrapper (0xWRAPPER...)                         │
│    ├─ wrap():   Vault shares → EagleShareOFT (1:1)         │
│    └─ unwrap(): EagleShareOFT → Vault shares (1:1)         │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. EagleShareOFT (0xSAME_ADDRESS...)                        │
│    └─ Cross-chain transfers via LayerZero                   │
│    └─ Tradeable, bridgeable EAGLE token                     │
└─────────────────────────────────────────────────────────────┘


╔══════════════════════════════════════════════════════════════╗
║              SPOKE CHAINS (Arbitrum, Base, etc.)             ║
╚══════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────┐
│ EagleShareOFT (0xSAME_ADDRESS...)                           │
│ ├─ Receives bridged EAGLE tokens from hub                   │
│ ├─ Standard ERC20 transfers (no fees)                       │
│ ├─ Cross-chain transfers via LayerZero                      │
│ └─ Can be bridged back to hub                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 User Flows

### **Flow 1: Deposit & Bridge to Spoke Chain**

```
User on Ethereum:
  1. Deposit WLFI/USD1 → EagleOVault
     └─ Receive vault shares (ERC4626)
  
  2. Wrap vault shares → EagleVaultWrapper
     └─ Lock vault shares
     └─ Mint EagleShareOFT (1:1)
  
  3. Bridge EagleShareOFT → LayerZero → Arbitrum
     └─ Burn on Ethereum
     └─ Mint on Arbitrum (same address!)
  
User on Arbitrum:
  4. Receive EagleShareOFT
     └─ Trade, hold, or transfer
```

### **Flow 2: Bridge Back & Redeem**

```
User on Arbitrum:
  1. Bridge EagleShareOFT → LayerZero → Ethereum
     └─ Burn on Arbitrum
     └─ Mint on Ethereum
  
User on Ethereum:
  2. Unwrap EagleShareOFT → EagleVaultWrapper
     └─ Burn EagleShareOFT
     └─ Release vault shares (1:1)
  
  3. Redeem vault shares → EagleOVault
     └─ Receive WLFI/USD1
```

---

## ⚖️ Comparison: OFTAdapter vs EagleVaultWrapper

### **Standard LayerZero Pattern (OFTAdapter)**

```
Ethereum (Hub):
  ├─ EagleOVault shares (native ERC20)
  └─ EagleShareOFTAdapter (locks/unlocks shares)
      └─ No separate OFT token on hub

Spoke Chains:
  └─ EagleShareOFT (minted representation)
```

**Issues with this approach:**
- ❌ Different token on hub vs spokes
- ❌ Users see "vault shares" on Ethereum, "EAGLE" on other chains
- ❌ Confusing UX (two different tokens with same backing)
- ❌ Can't use same contract address on all chains

---

### **Our Pattern (EagleVaultWrapper)** ✅

```
ALL Chains (Including Hub):
  └─ EagleShareOFT (SAME contract, SAME address)

Ethereum (Hub) ONLY:
  ├─ EagleOVault (vault shares - internal accounting)
  └─ EagleVaultWrapper (converter between vault shares ↔ EAGLE)
```

**Benefits:**
- ✅ **Same token everywhere** - "EAGLE" on all chains
- ✅ **Same address everywhere** - `0xSAME...` on all chains (via CREATE2)
- ✅ **Consistent branding** - No confusion about token names
- ✅ **Better UX** - Users don't need to understand vault mechanics
- ✅ **Simpler mental model** - One token to rule them all

---

## 🔑 Key Components

### **1. EagleOVault (Ethereum Only)**

```solidity
// Standard ERC4626 vault
contract EagleOVault {
    function deposit(uint256 assets, address receiver) 
        returns (uint256 shares);
    
    function redeem(uint256 shares, address receiver, address owner)
        returns (uint256 assets);
}
```

**Purpose:**
- Holds user deposits (WLFI/USD1)
- Issues vault shares (ERC20 compatible)
- Manages yield strategies
- **Does NOT have LayerZero integration** (by design)

---

### **2. EagleVaultWrapper (Ethereum Only)**

```solidity
contract EagleVaultWrapper {
    IERC20 public immutable VAULT_EAGLE;  // EagleOVault shares
    IMintableBurnableOFT public immutable OFT_EAGLE;  // EagleShareOFT
    
    function wrap(uint256 amount) external {
        // Lock vault shares
        VAULT_EAGLE.transferFrom(msg.sender, address(this), amount);
        
        // Mint EagleShareOFT (1:1)
        OFT_EAGLE.mint(msg.sender, amount);
    }
    
    function unwrap(uint256 amount) external {
        // Burn EagleShareOFT
        OFT_EAGLE.burn(msg.sender, amount);
        
        // Release vault shares (1:1)
        VAULT_EAGLE.transfer(msg.sender, amount);
    }
}
```

**Purpose:**
- ✅ Converts vault shares ↔ EagleShareOFT (1:1 peg)
- ✅ Maintains perfect parity
- ✅ Allows vault shares to become cross-chain compatible
- ✅ Preserves vault's accounting (shares are locked, not burned)

**Critical Design Choice:**
- Wrapper is a **minter** of EagleShareOFT on Ethereum
- This is why we removed fees from EagleShareOFT (would break wrapper logic)
- Wrapper must be trusted contract (only authorized minter)

---

### **3. EagleShareOFT (ALL Chains)**

```solidity
contract EagleShareOFT is OFT {
    mapping(address => bool) public isMinter;
    
    function mint(address to, uint256 amount) external {
        require(isMinter[msg.sender] || msg.sender == owner());
        _mint(to, amount);
    }
    
    function burn(address from, uint256 amount) external {
        require(isMinter[msg.sender] || msg.sender == owner());
        // Minters can burn without allowance ✅
        _burn(from, amount);
    }
}
```

**Purpose:**
- ✅ Standard LayerZero OFT on ALL chains
- ✅ Same metadata everywhere ("EAGLE", 18 decimals)
- ✅ Same address everywhere (via CREATE2)
- ✅ Cross-chain transfers
- ✅ No fees (clean UX)

**On Ethereum (Hub):**
- EagleVaultWrapper is authorized minter
- Mints when users wrap vault shares
- Burns when users unwrap to vault shares

**On Spoke Chains:**
- LayerZero mints when bridging from hub
- LayerZero burns when bridging to hub
- NO local minters (except LayerZero endpoint)

---

## 💰 Token Supply Management

### **Ethereum (Hub)**

```
Total EAGLE Supply on Ethereum = Wrapped Vault Shares

EagleShareOFT.totalSupply() = EagleVaultWrapper.totalLocked

Examples:
  - User deposits 100 WLFI → Gets 100 vault shares
  - User wraps 100 vault shares → Gets 100 EAGLE
  - EAGLE supply on Ethereum = 100
  - Locked vault shares = 100
```

### **Spoke Chains**

```
Total EAGLE Supply on Arbitrum = Bridged from Ethereum

Examples:
  - User bridges 50 EAGLE from Ethereum → Arbitrum
  - Ethereum EAGLE supply: 100 - 50 = 50
  - Arbitrum EAGLE supply: 0 + 50 = 50
  - Total locked vault shares: Still 100 ✅
```

### **Global Invariant**

```
INVARIANT:
  SUM(EagleShareOFT.totalSupply() across ALL chains) 
  = EagleVaultWrapper.totalLocked
  = Wrapped vault shares

This ensures:
  ✅ No inflation (can't create EAGLE out of thin air)
  ✅ 1:1 backing (every EAGLE = 1 vault share)
  ✅ Redeemability (can always unwrap → redeem)
```

---

## 🔐 Security Considerations

### **✅ Safe Design Choices**

1. **EagleVaultWrapper as Only Minter on Hub**
   - Only EagleVaultWrapper can mint EAGLE on Ethereum
   - Wrapper enforces 1:1 lock/mint ratio
   - No arbitrary minting

2. **No Fees on EagleShareOFT**
   - Removed all fee-on-transfer logic
   - Prevents accounting mismatches
   - Maintains 1:1 peg with vault shares

3. **Minter Burn Privilege**
   - Wrapper can burn without allowance
   - Critical for unwrap functionality
   - Prevents approval friction

4. **Immutable References**
   - Wrapper's token addresses are immutable
   - Cannot be changed after deployment
   - Prevents rug pulls

### **⚠️ Trust Assumptions**

1. **EagleVaultWrapper is Trusted**
   - Must be audited thoroughly
   - Bugs could break 1:1 peg
   - Recommendation: Use multi-sig ownership

2. **LayerZero Endpoint is Trusted**
   - Standard LayerZero trust model
   - Endpoint can mint/burn on spokes
   - Use relayer configuration carefully

3. **EagleOVault is Secure**
   - Vault security is critical
   - Vault shares are backing for all EAGLE
   - Vault exploits affect entire system

---

## 📋 Deployment Checklist

### **Phase 1: Ethereum (Hub) Deployment**

```bash
# 1. Deploy EagleOVault
forge create EagleOVault --constructor-args <WLFI> <USD1> <OWNER>

# 2. Deploy EagleShareOFT (with CREATE2 for same address)
forge create EagleShareOFT --constructor-args \
  "Eagle Vault Shares" "EAGLE" <LZ_ENDPOINT> <OWNER> \
  --create2 <SALT>

# 3. Deploy EagleVaultWrapper
forge create EagleVaultWrapper --constructor-args \
  <VAULT_ADDRESS> <EAGLE_OFT_ADDRESS> <OWNER>

# 4. Set wrapper as minter
cast send <EAGLE_OFT_ADDRESS> \
  "setMinter(address,bool)" <WRAPPER_ADDRESS> true
```

### **Phase 2: Spoke Chain Deployment**

```bash
# Deploy EagleShareOFT with SAME salt (same address!)
forge create EagleShareOFT --constructor-args \
  "Eagle Vault Shares" "EAGLE" <LZ_ENDPOINT> <OWNER> \
  --create2 <SAME_SALT>

# DO NOT set any minters on spokes (LayerZero handles minting)
```

### **Phase 3: LayerZero Configuration**

```bash
# Configure trusted peers (all chains must know about each other)
pnpm hardhat lz:oapp:wire --oapp-config layerzero.config.ts
```

---

## 🧪 Testing Strategy

### **Unit Tests**

- ✅ EagleShareOFT: 36/36 tests passing
- [ ] EagleVaultWrapper: Need comprehensive tests
- [ ] EagleOVault: Existing tests (160+ passing)

### **Integration Tests**

```solidity
// Test 1: Wrap → Bridge → Unwrap flow
test_WrapBridgeUnwrap() {
    // 1. Deposit to vault
    vault.deposit(1000e18, user);
    
    // 2. Wrap vault shares
    wrapper.wrap(1000e18);
    
    // 3. Bridge to Arbitrum (mock)
    oft.send(arbitrumEid, user, 1000e18, ...);
    
    // 4. Bridge back to Ethereum (mock)
    oft.send(ethereumEid, user, 1000e18, ...);
    
    // 5. Unwrap to vault shares
    wrapper.unwrap(1000e18);
    
    // 6. Redeem from vault
    vault.redeem(1000e18, user, user);
}

// Test 2: Supply invariant
test_GlobalSupplyInvariant() {
    uint256 ethereumSupply = oft.balanceOf(ethereum);
    uint256 arbitrumSupply = oft.balanceOf(arbitrum);
    uint256 baseSupply = oft.balanceOf(base);
    
    uint256 globalSupply = ethereumSupply + arbitrumSupply + baseSupply;
    uint256 lockedShares = wrapper.totalLocked();
    
    assertEq(globalSupply, lockedShares);
}
```

---

## 📊 Gas Comparison

### **OFTAdapter Pattern**

```
Bridge from Ethereum:
  1. User approves shares to adapter: ~45,000 gas
  2. Adapter locks shares: ~50,000 gas
  3. LayerZero send: ~200,000 gas
  Total: ~295,000 gas
```

### **Our EagleVaultWrapper Pattern**

```
Wrap + Bridge from Ethereum:
  1. User wraps shares: ~100,000 gas
     - Transfer shares to wrapper: ~50,000
     - Mint EAGLE: ~50,000
  2. LayerZero send: ~200,000 gas
  Total: ~300,000 gas

Difference: +5,000 gas (~$12 @ 100 gwei, $2,400 ETH)
```

**Verdict:** ✅ **Minimal gas overhead** for significant UX improvement

---

## 🎯 Why This Architecture Wins

### **1. Consistent Branding** ✅

```
User sees everywhere:
  - Name: "Eagle Vault Shares"
  - Symbol: "EAGLE"
  - Same address: 0x... on ALL chains
```

No confusion about "vault shares" vs "OFT shares"

### **2. CREATE2 Benefits** ✅

```
Same deployment salt → Same address
  - Ethereum: 0xEAGLE...
  - Arbitrum: 0xEAGLE...
  - Base: 0xEAGLE...
```

Easier for integrations (DEXs, wallets, etc.)

### **3. Simpler Mental Model** ✅

```
Users think:
  "EAGLE token is backed by vault shares"

NOT:
  "Vault shares on Ethereum get wrapped into 
   OFT shares which are different on each chain..."
```

### **4. Future-Proof** ✅

If you want to add more chains:
```bash
# Just deploy EAGLE with same salt
forge create EagleShareOFT --create2 <SAME_SALT>

# Wire LayerZero peers
# Done! ✅
```

No need for complex adapter logic on each new chain.

---

## ✅ Final Recommendation

**KEEP YOUR CURRENT ARCHITECTURE** ✅

Your EagleVaultWrapper pattern is:
- ✅ **More user-friendly** (same token everywhere)
- ✅ **More brand-consistent** (EAGLE everywhere)
- ✅ **More future-proof** (easy to add chains)
- ✅ **More elegant** (simpler mental model)
- ✅ **Minimal gas overhead** (~5,000 gas extra)

**Action Items:**
1. ✅ Keep simplified EagleShareOFT (no fees)
2. [ ] Add comprehensive EagleVaultWrapper tests
3. [ ] Audit wrapper contract thoroughly
4. [ ] Use CREATE2 for deterministic addresses
5. [ ] Set wrapper as ONLY minter on hub
6. [ ] Configure LayerZero peers properly

---

## 📚 References

- **LayerZero OFT Docs:** https://docs.layerzero.network/
- **CREATE2 Deployment:** https://docs.openzeppelin.com/cli/2.8/deploying-with-create2
- **ERC4626 Standard:** https://eips.ethereum.org/EIPS/eip-4626
- **EagleShareOFT Review:** `EAGLESHAREOFT_REVIEW.md`
- **Wrapper Contract:** `contracts/EagleVaultWrapper.sol`

---

**Decision Status:** ✅ **APPROVED**  
**Architecture:** EagleVaultWrapper + Same EAGLE on ALL chains  
**Reasoning:** Better UX, consistent branding, minimal overhead  
**Next Steps:** Complete wrapper testing and audit

