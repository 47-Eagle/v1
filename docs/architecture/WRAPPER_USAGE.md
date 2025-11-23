# 🔄 Wrapper Usage Guide

## ✅ Status: LIVE & Working!

The wrapper is now fully configured and ready to convert between vEAGLE (vault shares) and EAGLE (OFT tokens).

---

## 📍 Contract Addresses

| Token | Address | Description |
|-------|---------|-------------|
| **vEAGLE** | `0x32a2544De7a644833fE7659dF95e5bC16E698d99` | Vault shares (EagleOVault) |
| **EAGLE** | `0x477d42841dC5A7cCBc2f72f4448f5eF6B61eA91E` | OFT token (cross-chain) |
| **Wrapper** | `0xF9CEf2f5E9bb504437b770ED75cA4D46c407ba03` | Conversion bridge |

---

## 🎯 What Was The Issue?

**Error:** `"Only vault bridge"`

**Cause:** The OFT contract restricts minting/burning to only the designated "vault bridge" address. The wrapper wasn't set as the vault bridge.

**Fix:** Called `oft.setVaultBridge(wrapper)` to authorize the wrapper.

**Transaction:** [`0x51d61571c3723c2c88fbb4481747d52174e67ca9737190cb48de9ad2b498bd7e`](https://etherscan.io/tx/0x51d61571c3723c2c88fbb4481747d52174e67ca9737190cb48de9ad2b498bd7e)

---

## 🔄 How to Wrap vEAGLE → EAGLE

### Step 1: Approve the Wrapper

```typescript
const vault = await ethers.getContractAt("EagleOVault", "0x32a2544De7a644833fE7659dF95e5bC16E698d99");
const wrapperAddress = "0xF9CEf2f5E9bb504437b770ED75cA4D46c407ba03";
const amount = ethers.parseEther("1000"); // Amount to wrap

// Approve wrapper to spend your vEAGLE
const approveTx = await vault.approve(wrapperAddress, amount);
await approveTx.wait();
```

### Step 2: Wrap Your Tokens

```typescript
const wrapper = await ethers.getContractAt("EagleVaultWrapper", wrapperAddress);

// Wrap vEAGLE → EAGLE (1% fee applies unless whitelisted)
const wrapTx = await wrapper.wrap(amount);
await wrapTx.wait();

console.log("✅ Wrapped! You now have EAGLE tokens");
```

---

## 🔙 How to Unwrap EAGLE → vEAGLE

```typescript
const wrapper = await ethers.getContractAt("EagleVaultWrapper", "0xF9CEf2f5E9bb504437b770ED75cA4D46c407ba03");
const amount = ethers.parseEther("1000"); // Amount to unwrap

// Unwrap EAGLE → vEAGLE (2% fee applies unless whitelisted)
const unwrapTx = await wrapper.unwrap(amount);
await unwrapTx.wait();

console.log("✅ Unwrapped! You now have vEAGLE shares");
```

---

## 💰 Fees

| Action | Fee | Recipient | Notes |
|--------|-----|-----------|-------|
| **Wrap** (vEAGLE → EAGLE) | 1% | Fee recipient | Waived for whitelisted addresses |
| **Unwrap** (EAGLE → vEAGLE) | 2% | Fee recipient | Waived for whitelisted addresses |

**Fee Recipient:** `0x7310Dd6EF89b7f829839F140C6840bc929ba2031`

---

## 🎁 Whitelist (No Fees)

The following addresses are whitelisted and pay **zero fees**:

1. **Contract Owner** - `0x7310Dd6EF89b7f829839F140C6840bc929ba2031`
2. **Fee Recipient** - `0x7310Dd6EF89b7f829839F140C6840bc929ba2031`

### Add More Whitelisted Addresses

```typescript
const wrapper = await ethers.getContractAt("EagleVaultWrapper", "0xF9CEf2f5E9bb504437b770ED75cA4D46c407ba03");

// Single address
await wrapper.setWhitelist(userAddress, true);

// Multiple addresses
await wrapper.batchWhitelist([address1, address2, address3]);
```

---

## 🔍 Monitoring Scripts

### Check Wrapper Status

```bash
npx hardhat run scripts/verify-wrapper-ready.ts --network ethereum
```

**Output:**
- Vault bridge configuration ✅
- Fee settings 💰
- Your balances 👤
- Bridge statistics 📊

---

## ⚙️ Configuration (Owner Only)

### Update Fees

```typescript
const wrapper = await ethers.getContractAt("EagleVaultWrapper", "0xF9CEf2f5E9bb504437b770ED75cA4D46c407ba03");

// Set fees (in basis points, max 1000 = 10%)
await wrapper.setFees(
  100,  // 1% deposit fee
  200   // 2% withdraw fee
);
```

### Update Fee Recipient

```typescript
await wrapper.setFeeRecipient(newRecipientAddress);
```

---

## 🎯 Use Cases

### 1. Cross-Chain Transfer
```
1. Deposit to vault → Get vEAGLE
2. Wrap vEAGLE → EAGLE
3. Bridge EAGLE to other chain (LayerZero)
4. Trade or use EAGLE on destination chain
```

### 2. Liquidity Provision
```
1. Wrap vEAGLE → EAGLE
2. Add EAGLE to DEX pools
3. Earn trading fees + yield from vault
```

### 3. Trading
```
1. Wrap vEAGLE → EAGLE
2. List EAGLE on exchanges
3. Unwrap back to vEAGLE to redeem from vault
```

---

## 📊 Current Stats

**As of October 20, 2025:**

- Total Locked (vEAGLE): `0`
- Total Minted (EAGLE): `0`
- Balance: ✅ Perfectly balanced (1:1)

---

## 🔗 Etherscan Links

- [Vault (vEAGLE)](https://etherscan.io/address/0x32a2544De7a644833fE7659dF95e5bC16E698d99)
- [OFT (EAGLE)](https://etherscan.io/address/0x477d42841dC5A7cCBc2f72f4448f5eF6B61eA91E)
- [Wrapper](https://etherscan.io/address/0xF9CEf2f5E9bb504437b770ED75cA4D46c407ba03)
- [Setup Transaction](https://etherscan.io/tx/0x51d61571c3723c2c88fbb4481747d52174e67ca9737190cb48de9ad2b498bd7e)

---

## ✅ Everything Working!

The wrapper is now fully operational:

- ✅ Vault bridge set on OFT contract
- ✅ Wrapper can mint EAGLE tokens
- ✅ Wrapper can burn EAGLE tokens
- ✅ Wrapper is fee-exempt on OFT
- ✅ Fees configured (1% wrap, 2% unwrap)
- ✅ Bridge is balanced (1:1 peg)

**Ready to wrap!** 🎉

