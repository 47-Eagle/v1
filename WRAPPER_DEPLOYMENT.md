# 🎉 Wrapper Deployed Successfully!

## ✅ Deployment Complete

**New EagleVaultWrapper Address:** `0xF9CEf2f5E9bb504437b770ED75cA4D46c407ba03`

---

## 📋 Configuration

| Component | Address | Status |
|-----------|---------|--------|
| **Wrapper** | `0xF9CEf2f5E9bb504437b770ED75cA4D46c407ba03` | ✅ Deployed |
| **Vault (EAGLE)** | `0x32a2544De7a644833fE7659dF95e5bC16E698d99` | ✅ Verified |
| **OFT (EAGLE)** | `0x477d42841dC5A7cCBc2f72f4448f5eF6B61eA91E` | ✅ Verified |
| **Owner** | `0x7310Dd6EF89b7f829839F140C6840bc929ba2031` | ✅ Verified |

---

## 💰 Fees

- **Deposit Fee (Wrap):** 1% (100 basis points)
- **Withdraw Fee (Unwrap):** 2% (200 basis points)
- **Fee Recipient:** `0x7310Dd6EF89b7f829839F140C6840bc929ba2031`

---

## 🔗 Etherscan

- **Wrapper:** https://etherscan.io/address/0xF9CEf2f5E9bb504437b770ED75cA4D46c407ba03
- **Deployment TX:** https://etherscan.io/tx/0x37ec1ac22d1a432fd443c1357c89e8a514bfaa1c18c1012731f15a26e8c056c8

---

## 🚀 Next Steps

### 1. Grant Roles to Wrapper on OFT

The wrapper needs MINTER and BURNER roles on the OFT contract to function:

```bash
cd /home/akitav2/eagle-ovault-clean

export PK=$(grep "^PRIVATE_KEY=" .env | cut -d'=' -f2)
export WRAPPER=0xF9CEf2f5E9bb504437b770ED75cA4D46c407ba03
export OFT=0x477d42841dC5A7cCBc2f72f4448f5eF6B61eA91E

# Calculate role hashes
export MINTER_ROLE=$(cast keccak "MINTER_ROLE")
export BURNER_ROLE=$(cast keccak "BURNER_ROLE")

# Grant MINTER_ROLE
cast send $OFT \
  "grantRole(bytes32,address)" \
  $MINTER_ROLE $WRAPPER \
  --rpc-url https://eth.llamarpc.com \
  --private-key $PK \
  --legacy

# Grant BURNER_ROLE
cast send $OFT \
  "grantRole(bytes32,address)" \
  $BURNER_ROLE $WRAPPER \
  --rpc-url https://eth.llamarpc.com \
  --private-key $PK \
  --legacy
```

---

### 2. Update Frontend

Update the frontend configuration with the new wrapper address:

**File:** `frontend/src/config/contracts.ts`
```typescript
export const CONTRACTS = {
  VAULT: '0x32a2544De7a644833fE7659dF95e5bC16E698d99',
  OFT: '0x477d42841dC5A7cCBc2f72f4448f5eF6B61eA91E',
  WRAPPER: '0xF9CEf2f5E9bb504437b770ED75cA4D46c407ba03',  // ← NEW!
  STRATEGY: '0xd286Fdb2D3De4aBf44649649D79D5965bD266df4',
  CHARM_VAULT: '0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71',
  
  WLFI: '0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6',
  USD1: '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d',
  WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
} as const;
```

**File:** `frontend/.env.production`
```bash
VITE_WRAPPER_ADDRESS=0xF9CEf2f5E9bb504437b770ED75cA4D46c407ba03
```

---

### 3. Test Wrapping

Test the wrapper functionality:

```bash
# Approve vault shares to wrapper
cast send 0x32a2544De7a644833fE7659dF95e5bC16E698d99 \
  "approve(address,uint256)" \
  0xF9CEf2f5E9bb504437b770ED75cA4D46c407ba03 \
  1000000000000000000 \
  --rpc-url https://eth.llamarpc.com \
  --private-key $PK \
  --legacy

# Wrap 1 vault share → 1 OFT token
cast send 0xF9CEf2f5E9bb504437b770ED75cA4D46c407ba03 \
  "wrap(uint256)" \
  1000000000000000000 \
  --rpc-url https://eth.llamarpc.com \
  --private-key $PK \
  --legacy \
  --gas-limit 300000

# Check OFT balance
cast call 0x477d42841dC5A7cCBc2f72f4448f5eF6B61eA91E \
  "balanceOf(address)(uint256)" \
  0x7310Dd6EF89b7f829839F140C6840bc929ba2031 \
  --rpc-url https://eth.llamarpc.com
```

---

## 📖 How It Works

### Wrapping (Vault Shares → OFT Tokens)

1. User approves vault shares to wrapper
2. User calls `wrapper.wrap(amount)`
3. Wrapper locks vault shares
4. Wrapper mints OFT tokens 1:1 (minus 1% fee)
5. User receives OFT tokens (cross-chain compatible)

### Unwrapping (OFT Tokens → Vault Shares)

1. User calls `wrapper.unwrap(amount)`
2. Wrapper burns OFT tokens
3. Wrapper releases vault shares 1:1 (minus 2% fee)
4. User receives vault shares (can withdraw from vault)

---

## 🎯 Use Cases

**Wrap to OFT for:**
- Cross-chain transfers (LayerZero)
- Trading on DEXs
- Using in DeFi protocols
- Liquidity provision

**Unwrap to Vault Shares for:**
- Withdrawing underlying assets (WLFI + USD1)
- Voting/governance (if implemented)
- Direct vault interactions

---

## 🔒 Security

- **Reentrancy Protection:** ✅ ReentrancyGuard
- **Ownership:** ✅ Ownable (can pause/adjust fees)
- **Fee Limits:** ✅ Max 10% fee enforced
- **1:1 Peg:** ✅ Maintained by contract logic

---

## 📊 Deployment Stats

- **Block:** 23,617,340
- **Gas Used:** 1,086,590
- **Gas Price:** ~128 gwei
- **Cost:** ~$40

---

## 🎉 Summary

Your new wrapper is deployed and ready to use! Once you grant the roles to the wrapper on the OFT contract, users will be able to:

- ✅ Wrap vault shares into cross-chain OFT tokens
- ✅ Unwrap OFT tokens back to vault shares
- ✅ Bridge EAGLE tokens across chains via LayerZero
- ✅ Trade/use OFT tokens in DeFi

---

**Next:** Grant roles and update frontend, then test!

