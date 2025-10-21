# Eagle Vault Wrapper Architecture

## 🎯 **Your Question**

> "We were planning on using EagleVaultWrapper.sol on the hub chain which would create the EagleShareOFT.sol. Could we still use the EagleShareOFTAdapter.sol to mint to other chains and thus still have the same EagleShareOFT.sol?"

## ✅ **Short Answer**

**YES, and it's even SIMPLER!**

If you deploy `EagleShareOFT` on the hub chain using `EagleVaultWrapper`, you **DON'T need `EagleShareOFTAdapter`** because OFT contracts have **native LayerZero integration built-in**.

---

## 📊 **Architecture Comparison**

### **Option 1: Standard OVault (Current)**

```
┌─────────────────────────────────────────────────────────┐
│                HUB CHAIN (Ethereum)                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  EagleOVault.sol (Vault)                               │
│  └─> Mints vEAGLE shares (ERC20, no LayerZero)         │
│                                                         │
│  EagleShareOFTAdapter.sol (NEEDED!)                    │
│  └─> Wraps vEAGLE for cross-chain                      │
│       ├─> Locks vEAGLE when sending                    │
│       └─> Unlocks vEAGLE when receiving                │
│                                                         │
└─────────────────────────────────────────────────────────┘
                        │
                 LayerZero Bridge
                        │
┌─────────────────────────────────────────────────────────┐
│           SPOKE CHAINS (Arbitrum, Optimism)             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  EagleShareOFT.sol                                     │
│  └─> vEAGLE representation                             │
│       ├─> Minted when bridged from hub                 │
│       └─> Burned when bridged to hub                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Why adapter is needed:**
- Vault shares are plain ERC20 (no LayerZero)
- Need adapter to add LayerZero capabilities
- Different contract types (ERC20 vs OFT)

---

### **Option 2: With Wrapper (YOUR PROPOSAL) ✅ BETTER!**

```
┌─────────────────────────────────────────────────────────┐
│                HUB CHAIN (Ethereum)                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  EagleOVault.sol (Vault)                               │
│  └─> Mints vEAGLE shares (ERC20)                       │
│       │                                                 │
│       ▼                                                 │
│  EagleVaultWrapper.sol (1:1 Bridge)                    │
│  └─> Locks vault shares, mints OFT tokens              │
│       │                                                 │
│       ▼                                                 │
│  EagleShareOFT.sol (SAME CONTRACT AS SPOKE!)           │
│  └─> OFT with NATIVE LayerZero support                 │
│       ├─> send() directly to other chains              │
│       └─> receive() directly from other chains         │
│                                                         │
│  ❌ EagleShareOFTAdapter.sol (NOT NEEDED!)             │
│                                                         │
└─────────────────────────────────────────────────────────┘
                        │
                 LayerZero Bridge
                        │
┌─────────────────────────────────────────────────────────┐
│           SPOKE CHAINS (Arbitrum, Optimism)             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  EagleShareOFT.sol (SAME CONTRACT!)                    │
│  └─> Identical contract on ALL chains                  │
│       ├─> Same functions                               │
│       ├─> Same name/symbol                             │
│       ├─> Native LayerZero support                     │
│       └─> Fee-on-swap (if configured)                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Benefits:**
- ✅ Same `EagleShareOFT` contract on ALL chains (including hub!)
- ✅ No adapter needed (OFT has LayerZero built-in)
- ✅ Simpler architecture
- ✅ Lower gas costs (one less contract)
- ✅ Easier to understand
- ✅ Native LayerZero features (send/receive)

---

## 🔑 **Key Insight: OFT vs OFTAdapter**

### **When to use OFTAdapter:**

```solidity
// You have an EXISTING ERC20 token without LayerZero
contract MyToken is ERC20 {
    // No LayerZero integration
}

// You need an adapter to add LayerZero capabilities
contract MyTokenAdapter is OFTAdapter {
    constructor(address _token) OFTAdapter(_token) {}
}
```

**Use case:** Wrapping existing tokens (USDC, WETH, etc.)

---

### **When to use OFT (YOUR CASE!):**

```solidity
// You're deploying a NEW token with LayerZero from the start
contract EagleShareOFT is OFT {
    // LayerZero integration is BUILT-IN!
    // Has send() and receive() functions natively
}
```

**Use case:** New tokens designed for cross-chain from day 1

---

## 🏗️ **Your Architecture Flow**

### **Step 1: User Deposits to Vault (Hub)**

```solidity
// 1. User deposits WLFI to vault
EagleOVault.deposit(1000 WLFI)
  └─> User receives 1000 vEAGLE (vault shares)
```

### **Step 2: User Wraps to OFT (Hub)**

```solidity
// 2. User wraps vault shares to OFT tokens
EagleVaultWrapper.wrap(1000 vEAGLE)
  ├─> Locks 1000 vEAGLE in wrapper
  ├─> Charges 1% fee (10 vEAGLE) if not whitelisted
  └─> Mints 990 EagleShareOFT (on hub!)
```

### **Step 3: User Bridges to Spoke Chain**

```solidity
// 3. User sends OFT to Arbitrum
EagleShareOFT.send({
  dstEid: ARBITRUM_EID,
  to: userAddress,
  amountLD: 990,
  options: ...
})
  ├─> Burns 990 EagleShareOFT on hub
  ├─> LayerZero message sent
  └─> Mints 990 EagleShareOFT on Arbitrum
```

**No adapter needed!** The OFT contract handles bridging natively.

### **Step 4: User Returns from Spoke Chain**

```solidity
// 4. User sends OFT back to hub
EagleShareOFT.send({
  dstEid: ETHEREUM_EID,
  to: userAddress,
  amountLD: 990,
  options: ...
})
  ├─> Burns 990 EagleShareOFT on Arbitrum
  ├─> LayerZero message sent
  └─> Mints 990 EagleShareOFT on hub
```

### **Step 5: User Unwraps to Vault Shares (Hub)**

```solidity
// 5. User unwraps OFT back to vault shares
EagleVaultWrapper.unwrap(990 EagleShareOFT)
  ├─> Burns 990 EagleShareOFT
  ├─> Charges 2% fee (19.8 vEAGLE) if not whitelisted
  └─> Releases 970.2 vEAGLE to user
```

### **Step 6: User Withdraws from Vault (Hub)**

```solidity
// 6. User withdraws assets from vault
EagleOVault.redeem(970.2 vEAGLE)
  └─> User receives ~970 WLFI (based on share price)
```

---

## ✅ **Benefits of Wrapper Architecture**

| Feature | Standard OVault | With Wrapper | Winner |
|---------|----------------|--------------|--------|
| **Same contract on all chains** | ❌ No | ✅ Yes | Wrapper |
| **OFTAdapter needed** | ✅ Yes | ❌ No | Wrapper |
| **Gas costs** | Higher | Lower | Wrapper |
| **Complexity** | Higher | Lower | Wrapper |
| **Vault share exposure** | Direct | Isolated | Wrapper |
| **Fee collection** | Vault only | Vault + Wrapper | Wrapper |
| **Whitelist presale** | ❌ No | ✅ Yes | Wrapper |
| **1:1 peg guarantee** | Implicit | Explicit | Wrapper |

---

## 🔄 **Complete Contract Deployment**

### **Hub Chain (Ethereum):**

```bash
# 1. Deploy Vault (if not already deployed)
forge create EagleOVault

# 2. Deploy EagleShareOFT on hub
forge create EagleShareOFT \
  --constructor-args \
    "Eagle Vault Shares" \
    "vEAGLE" \
    $LZ_ENDPOINT \
    $OWNER

# 3. Deploy Wrapper
forge create EagleVaultWrapper \
  --constructor-args \
    $VAULT_ADDRESS \
    $OFT_ADDRESS \
    $FEE_RECIPIENT \
    $OWNER

# 4. Grant mint/burn permissions to wrapper
cast send $OFT_ADDRESS "setMinter(address,bool)" $WRAPPER_ADDRESS true
```

### **Spoke Chains (Arbitrum, Optimism, Base):**

```bash
# Deploy EagleShareOFT (SAME CONTRACT!)
forge create EagleShareOFT \
  --constructor-args \
    "Eagle Vault Shares" \
    "vEAGLE" \
    $LZ_ENDPOINT \
    $OWNER
```

### **Wire LayerZero Peers:**

```bash
# Connect all chains
pnpm hardhat lz:oapp:wire --oapp-config layerzero.shareoft.config.ts
```

**Result:** Same `EagleShareOFT` contract on ALL chains! ✅

---

## 🎯 **Why This Is Better**

### **1. Consistent User Experience**

```
User's perspective:
1. Hold "vEAGLE" vault shares on hub
2. Wrap to "vEAGLE" OFT on hub (same symbol!)
3. Bridge "vEAGLE" to Arbitrum (same symbol!)
4. Trade "vEAGLE" on Arbitrum DEX (same symbol!)
5. Bridge back to hub (same symbol!)
6. Unwrap to vault shares (same symbol!)

Everything is "vEAGLE" - super clean! ✨
```

### **2. Same Contract = Same Features**

All chains get:
- ✅ Fee-on-swap (configurable per chain)
- ✅ V3 Uniswap compatibility
- ✅ Smart DEX detection
- ✅ Treasury + Vault fee distribution
- ✅ Emergency controls
- ✅ Fee statistics

### **3. Simplified Architecture**

```
Before (with adapter):
EagleOVault → EagleShareOFTAdapter → LayerZero → EagleShareOFT

After (with wrapper):
EagleOVault → EagleVaultWrapper → EagleShareOFT → LayerZero → EagleShareOFT
                                  (same contract!)
```

Less contracts = less complexity = fewer bugs!

### **4. Fee Flexibility**

```solidity
// Wrapper fees (hub only)
- Wrap: 1% (deposit fee)
- Unwrap: 2% (withdraw fee)
- Whitelist: 0% (presale participants)

// OFT fees (all chains, including hub)
- Buy: 1% (DEX swaps)
- Sell: 2% (DEX swaps)
- Transfer: 0% (wallet to wallet)
```

Two independent fee mechanisms for maximum flexibility!

---

## ⚠️ **Important: Mint/Burn Permissions**

For this to work, `EagleShareOFT` must have **mint/burn functions**:

```solidity
// Add to EagleShareOFT.sol
mapping(address => bool) public isMinter;

modifier onlyMinter() {
    require(isMinter[msg.sender] || msg.sender == owner(), "Not minter");
    _;
}

function setMinter(address minter, bool status) external onlyOwner {
    isMinter[minter] = status;
}

function mint(address to, uint256 amount) external onlyMinter {
    _mint(to, amount);
}

function burn(address from, uint256 amount) external onlyMinter {
    _burn(from, amount);
}
```

**Grant wrapper permission:**
```solidity
// After deployment
eagleShareOFT.setMinter(wrapperAddress, true);
```

---

## 🚀 **Deployment Strategy**

### **Phase 1: Hub Chain (Ethereum)**

1. ✅ Deploy `EagleOVault` (if not already)
2. ✅ Deploy `EagleShareOFT` on hub
3. ✅ Deploy `EagleVaultWrapper`
4. ✅ Grant wrapper mint/burn permissions
5. ✅ Configure wrapper fees (1% wrap, 2% unwrap)
6. ✅ Whitelist presale participants

### **Phase 2: Spoke Chains**

1. ✅ Deploy `EagleShareOFT` on Arbitrum
2. ✅ Deploy `EagleShareOFT` on Optimism
3. ✅ Deploy `EagleShareOFT` on Base
4. ✅ Configure fee-on-swap per chain

### **Phase 3: LayerZero Wiring**

1. ✅ Wire hub ↔ Arbitrum
2. ✅ Wire hub ↔ Optimism
3. ✅ Wire hub ↔ Base
4. ✅ Test cross-chain transfers

---

## 📚 **Code Examples**

### **User Journey in Code**

```typescript
// =================================
// 1. DEPOSIT TO VAULT (Hub)
// =================================
await wlfi.approve(vault.address, parseEther("1000"));
await vault.deposit(parseEther("1000"), userAddress);
// User now has 1000 vEAGLE (vault shares)

// =================================
// 2. WRAP TO OFT (Hub)
// =================================
await vaultShares.approve(wrapper.address, parseEther("1000"));
await wrapper.wrap(parseEther("1000"));
// User now has 990 vEAGLE-OFT (after 1% fee)

// =================================
// 3. BRIDGE TO ARBITRUM
// =================================
const fee = await eagleShareOFT.quoteSend({
  dstEid: ARBITRUM_EID,
  to: ethers.utils.zeroPad(userAddress, 32),
  amountLD: parseEther("990"),
  options: options,
  composeMsg: "0x",
  oftCmd: "0x"
});

await eagleShareOFT.send(
  {
    dstEid: ARBITRUM_EID,
    to: ethers.utils.zeroPad(userAddress, 32),
    amountLD: parseEther("990"),
    minAmountLD: parseEther("980"), // 1% slippage
    extraOptions: options,
    composeMsg: "0x",
    oftCmd: "0x"
  },
  { nativeFee: fee.nativeFee, lzTokenFee: 0 },
  { value: fee.nativeFee }
);
// User now has 990 vEAGLE-OFT on Arbitrum!

// =================================
// 4. TRADE ON ARBITRUM (Optional)
// =================================
await eagleShareOFT.approve(uniswapRouter, parseEther("100"));
await uniswapRouter.swapExactTokensForTokens(
  parseEther("100"),
  0,
  [eagleShareOFT.address, usdc.address],
  userAddress,
  deadline
);
// 2% sell fee applies!

// =================================
// 5. BRIDGE BACK TO HUB
// =================================
// (Similar to step 3, but reverse direction)

// =================================
// 6. UNWRAP TO VAULT SHARES (Hub)
// =================================
await eagleShareOFT.approve(wrapper.address, parseEther("890"));
await wrapper.unwrap(parseEther("890"));
// User now has ~871 vEAGLE vault shares (after 2% fee)

// =================================
// 7. WITHDRAW FROM VAULT (Hub)
// =================================
await vault.redeem(parseEther("871"), userAddress, userAddress);
// User receives ~871 WLFI (based on share price)
```

---

## 🔐 **Security Considerations**

### **1. Mint/Burn Permissions**
- ✅ Only wrapper can mint/burn on hub
- ✅ Only LayerZero can mint/burn on spoke chains
- ✅ Owner can revoke wrapper permissions if compromised

### **2. Wrapper 1:1 Peg**
- ✅ `totalLocked == totalMinted` invariant
- ✅ `verify()` function checks balance matches
- ✅ Fees don't break the peg (accounted separately)

### **3. Fee Protection**
- ✅ Max 10% fee cap (cannot be exceeded)
- ✅ Presale whitelist (no double-tax on early supporters)
- ✅ Fee recipient configurable (upgradeable treasury)

### **4. LayerZero Security**
- ✅ Standard OFT security (battle-tested)
- ✅ Slippage protection (minAmountLD)
- ✅ Peer verification (only trusted chains)

---

## 💡 **Pro Tips**

### **1. Presale Whitelist**

```solidity
// Whitelist presale participants to avoid double fees
wrapper.batchWhitelist([
  0x1111...,
  0x2222...,
  0x3333...
]);

// They can wrap/unwrap for free!
```

### **2. Fee Recipient Injection Loop**

```solidity
// Set fee recipient = vault beneficiary
wrapper.setFeeRecipient(vaultBeneficiary);

// Also whitelist vault beneficiary
wrapper.setWhitelist(vaultBeneficiary, true);

// Result: Fees → vaultBeneficiary → deposit to vault → wrap → no fee!
// Creates a virtuous cycle of reinvestment without double-taxation ✅
```

### **3. Per-Chain Fee Configuration**

```typescript
// Hub: Lower fees (established liquidity)
await eagleShareOFT_hub.setSwapFeeConfig(50, 100, ...);  // 0.5% buy, 1% sell

// Arbitrum: Higher fees (new liquidity)
await eagleShareOFT_arb.setSwapFeeConfig(150, 250, ...); // 1.5% buy, 2.5% sell

// Flexibility! 🎯
```

---

## 🎉 **TL;DR**

### **Your Question:**
> Can we use EagleVaultWrapper + EagleShareOFT on hub, and still have the same EagleShareOFT on spoke chains?

### **Answer:**
✅ **YES! And it's BETTER than using an adapter!**

**Why:**
1. ✅ Same `EagleShareOFT` contract on ALL chains (including hub)
2. ✅ No `EagleShareOFTAdapter` needed (OFT has LayerZero built-in)
3. ✅ Simpler architecture (fewer contracts)
4. ✅ Lower gas costs
5. ✅ Same features everywhere (fee-on-swap, V3 compatibility)
6. ✅ Better user experience (all vEAGLE, everywhere)

**Architecture:**
```
Hub: EagleOVault → EagleVaultWrapper → EagleShareOFT → LayerZero
Spoke: EagleShareOFT (same contract!)
```

**Next Steps:**
1. Add mint/burn functions to `EagleShareOFT`
2. Deploy `EagleShareOFT` on hub
3. Deploy `EagleVaultWrapper` on hub
4. Grant wrapper mint/burn permissions
5. Deploy `EagleShareOFT` on spoke chains (same contract!)
6. Wire LayerZero peers

---

**Last Updated:** October 21, 2025  
**Architecture:** Wrapper + OFT (Simpler & Better!)  
**Status:** ✅ Recommended approach!

