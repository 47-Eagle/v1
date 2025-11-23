# 🚀 Eagle OFT LayerZero - Mainnet Deployment Record

**Deployment Date**: November 22, 2025  
**Network**: Solana Mainnet  
**Status**: ✅ LIVE

---

## 📝 Deployment Details

### Solana Program

| Property | Value |
|----------|-------|
| **Program ID** | `EjpziSWGRcEiDHLXft5etbUtcJiZxEttkwz1tqiuzzWU` |
| **Authority** | `7Qi3WW7q4kmqXcMBca76b3WjNMdRmjjjrpG5FTc8htxY` |
| **Program Size** | 292,488 bytes (286 KB) |
| **Program Rent** | 2.03692056 SOL |
| **Deploy Slot** | 381807683 |
| **Deploy Signature** | `3HtEUyujR7CxC9ZruBQGGy9Vowez26Jfj8rTxiNK7KPkHcoPUfYshypniyZw8qJuM21TBTUggYmpGWEgvEEGJeiJ` |

### Deployment Cost

| Item | Amount |
|------|--------|
| Starting Balance | 2.121666429 SOL |
| Ending Balance | 0.082134433 SOL |
| **Total Cost** | **~2.04 SOL** |

*Note: Most of this cost (2.037 SOL) is rent stored in the program account, not lost.*

---

## 🔗 Links

### Solana Explorer
- **Program**: https://explorer.solana.com/address/EjpziSWGRcEiDHLXft5etbUtcJiZxEttkwz1tqiuzzWU
- **Deploy Transaction**: https://explorer.solana.com/tx/3HtEUyujR7CxC9ZruBQGGy9Vowez26Jfj8rTxiNK7KPkHcoPUfYshypniyZw8qJuM21TBTUggYmpGWEgvEEGJeiJ
- **Authority Wallet**: https://explorer.solana.com/address/7Qi3WW7q4kmqXcMBca76b3WjNMdRmjjjrpG5FTc8htxY

---

## ⚠️ CRITICAL: Next Steps Required

### 🚨 IMMEDIATE ACTION NEEDED

Your wallet balance is now **0.082 SOL** (~$16 USD)

**You need more SOL to**:
- Initialize the OFT (~0.01 SOL)
- Configure peers (~0.01 SOL)
- Set up DVN/Executor (~0.05 SOL)
- Test transactions (~0.01 SOL each)

**Minimum recommended**: Add at least **0.5 SOL** to your wallet.

```bash
# Send SOL to:
7Qi3WW7q4kmqXcMBca76b3WjNMdRmjjjrpG5FTc8htxY
```

---

## 📋 Configuration Checklist

### ✅ Completed
- [x] Program deployed to mainnet
- [x] Program verified on-chain

### ❌ Pending (REQUIRED)
- [ ] Add more SOL to wallet (need 0.5 SOL minimum)
- [ ] Initialize OFT program
- [ ] Create EAGLE mint
- [ ] Configure LayerZero peers
- [ ] Set up DVN (Decentralized Verifier Network)
- [ ] Set up Executor
- [ ] Test small bridge transaction
- [ ] Verify decimal conversion (9 ↔ 18)
- [ ] Set up monitoring
- [ ] Transfer ownership to multisig (recommended)

---

## 🔧 Initialization Commands

### Step 1: Add SOL to Wallet
```bash
# Send at least 0.5 SOL to:
7Qi3WW7q4kmqXcMBca76b3WjNMdRmjjjrpG5FTc8htxY

# Verify:
solana balance
```

### Step 2: Update Configuration Files

**Update `solana-layerzero/Anchor.toml`**:
```toml
[programs.mainnet]
eagle_oft_layerzero = "EjpziSWGRcEiDHLXft5etbUtcJiZxEttkwz1tqiuzzWU"
```

**Update `programs/eagle-oft-layerzero/src/lib.rs`**:
```rust
declare_id!("EjpziSWGRcEiDHLXft5etbUtcJiZxEttkwz1tqiuzzWU");
```

### Step 3: Rebuild (Important!)
```bash
cd /home/akitav2/eagle-ovault-clean/solana-layerzero
anchor build
```

### Step 4: Initialize OFT
```bash
# Set environment
export SOLANA_CLUSTER=mainnet-beta
export SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Initialize (creates mint + config)
pnpm init:mainnet
```

### Step 5: Configure Ethereum Peer

**Requirements**:
- Ethereum mainnet OFT contract address
- LayerZero V2 endpoint: `0x1a44076050125825900e736c501f859c50fE728c`
- Ethereum EID: `30101`
- Solana EID: `30168`

```bash
# Set peer on Solana side
pnpm set-peer:mainnet --eth-oft <ETHEREUM_OFT_ADDRESS>

# Set peer on Ethereum side (separate script)
# Run from Ethereum project directory
```

### Step 6: Configure Security (DVN/Executor)

```bash
# Configure LayerZero security components
pnpm configure-dvn:mainnet
pnpm setup-executor:mainnet
```

### Step 7: Test Bridge

```bash
# Test with SMALL amount first!
# Bridge 0.01 EAGLE tokens

# Monitor at:
# https://layerzeroscan.com/
```

---

## 🔒 Security Recommendations

### Immediate
- [ ] Test with small amounts first (0.01-0.1 EAGLE)
- [ ] Monitor first 10 transactions closely
- [ ] Set up alerts for unusual activity

### Short-term (1 week)
- [ ] Audit all configurations
- [ ] Document emergency procedures
- [ ] Set up 24/7 monitoring
- [ ] Prepare pause mechanism

### Long-term (1 month)
- [ ] Transfer ownership to multisig
- [ ] Get external security audit
- [ ] Implement rate limits
- [ ] Set up insurance coverage

---

## 🆘 Emergency Procedures

### If Something Goes Wrong

1. **Pause the Program**
   ```bash
   # Use admin wallet to pause
   anchor run pause-program
   ```

2. **Contact LayerZero**
   - Discord: https://discord.gg/layerzero
   - Docs: https://docs.layerzero.network/

3. **Check Status**
   - LayerZero Scan: https://layerzeroscan.com/
   - Solana Explorer: https://explorer.solana.com/

### Upgrade Program (If Needed)
```bash
# Build new version
anchor build

# Deploy upgrade
solana program deploy <NEW_SO_FILE> \
  --program-id EjpziSWGRcEiDHLXft5etbUtcJiZxEttkwz1tqiuzzWU \
  --upgrade-authority /home/akitav2/.config/solana/id.json
```

---

## 📊 Program Capabilities

### Implemented Features
- ✅ Omnichain Fungible Token (OFT)
- ✅ Cross-chain messaging via LayerZero V2
- ✅ Peer configuration
- ✅ Admin controls
- ✅ Pause mechanism
- ✅ Upgradeable program

### Token Details
- **Decimals**: 9 (Solana standard)
- **Conversion**: 1 EAGLE (SOL) = 1,000,000,000 base units
- **Ethereum**: 18 decimals (conversion handled automatically)

---

## 📞 Support

### LayerZero
- Docs: https://docs.layerzero.network/v2
- Discord: https://discord.gg/layerzero
- GitHub: https://github.com/LayerZero-Labs

### Solana
- Docs: https://docs.solana.com/
- Discord: https://discord.gg/solana
- Explorer: https://explorer.solana.com/

---

## ⚡ Current Status

**Program**: ✅ Deployed  
**Initialized**: ❌ Not yet  
**Peers Configured**: ❌ Not yet  
**Ready for Use**: ❌ Not yet

**Wallet Balance**: 🔴 **0.082 SOL** (LOW - add more SOL!)

---

## 🎯 What's Next?

1. **Immediate** (today):
   - ✅ Send 0.5+ SOL to wallet
   - ✅ Initialize OFT
   - ✅ Configure Ethereum peer

2. **Short-term** (this week):
   - ✅ Test with small amounts
   - ✅ Monitor transactions
   - ✅ Document any issues

3. **Long-term** (this month):
   - ✅ Transfer to multisig
   - ✅ Get audit
   - ✅ Open to users

---

**Deployment completed by**: Cursor AI  
**Program Authority**: 7Qi3WW7q4kmqXcMBca76b3WjNMdRmjjjrpG5FTc8htxY  
**Mainnet Program ID**: EjpziSWGRcEiDHLXft5etbUtcJiZxEttkwz1tqiuzzWU

🚀 **Welcome to Mainnet!**

