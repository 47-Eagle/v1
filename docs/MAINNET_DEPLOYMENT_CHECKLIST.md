# 🚀 Mainnet Deployment Checklist

## ⚠️ CRITICAL WARNING

**Deploying to mainnet without testing = HIGH RISK**

- Real funds at stake
- No undo button
- Security vulnerabilities unknown
- User tokens could be lost

**Estimated Cost**: 5-10 SOL (~$1,000-$2,000 USD at current prices)

---

## ✅ Pre-Deployment Requirements

### 1. Testing Status
- [ ] ❌ Successfully initialized on devnet
- [ ] ❌ Tested SOL → ETH bridge on devnet
- [ ] ❌ Tested ETH → SOL bridge on devnet
- [ ] ❌ Verified decimal conversions (9 ↔ 18 decimals)
- [ ] ❌ Tested pause mechanism
- [ ] ❌ Tested access control
- [ ] ❌ Verified LayerZero message delivery
- [ ] ❌ Checked gas estimates
- [ ] ❌ Ran security checks

**Status**: 🔴 **NONE OF THESE ARE COMPLETE**

### 2. Solana Requirements
- [x] ✅ Wallet with sufficient SOL (8.14 SOL)
- [ ] ❌ Mainnet RPC endpoint configured
- [ ] ❌ Program audited
- [ ] ❌ Emergency procedures documented

### 3. Ethereum Requirements
- [ ] ❓ Ethereum OFT deployed on mainnet (need to verify)
- [ ] ❓ Ethereum OFT address known
- [ ] ❓ Ethereum wallet with ETH for gas
- [ ] ❓ DVN/Executor configured on mainnet

### 4. LayerZero V2 Configuration
- [ ] ❌ Mainnet endpoint IDs confirmed
- [ ] ❌ DVN addresses for mainnet
- [ ] ❌ Executor addresses for mainnet
- [ ] ❌ Fee estimation verified
- [ ] ❌ Message limits configured

### 5. Security
- [ ] ❌ Code audit completed
- [ ] ❌ Emergency pause tested
- [ ] ❌ Ownership transfer plan
- [ ] ❌ Multisig setup
- [ ] ❌ Monitoring dashboard ready
- [ ] ❌ Incident response plan

---

## 🚨 Deployment Steps (If You Proceed)

### Step 1: Prepare Environment

```bash
# Configure Solana CLI for mainnet
solana config set --url mainnet-beta

# Verify wallet
solana address
# Expected: 7Qi3WW7q4kmqXcMBca76b3WjNMdRmjjjrpG5FTc8htxY

# Check balance
solana balance
# Need: At least 5 SOL (you have 8.14 ✅)
```

### Step 2: Build and Deploy

```bash
cd /home/akitav2/eagle-ovault-clean/solana-layerzero

# Build program
anchor build

# Deploy to mainnet
./scripts/build-and-deploy.sh mainnet-beta
```

**⏱️ Time**: 5-10 minutes  
**💰 Cost**: ~5-8 SOL (not recoverable if something fails)

### Step 3: Initialize OFT

```bash
# Update environment for mainnet
export SOLANA_CLUSTER=mainnet-beta
export SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Initialize
pnpm init:mainnet
```

**⏱️ Time**: 1-2 minutes  
**💰 Cost**: ~0.01-0.02 SOL

### Step 4: Configure Peers

**Required Information**:
- Ethereum mainnet OFT address
- LayerZero mainnet endpoint: `0x1a44076050125825900e736c501f859c50fE728c`
- Ethereum EID: `30101`
- Solana EID: `30168`

```bash
# Set Solana → Ethereum peer
pnpm set-peer:mainnet --eth-oft <ETHEREUM_OFT_ADDRESS>

# Set Ethereum → Solana peer (need to run on Ethereum)
# (requires separate script on Ethereum side)
```

**⏱️ Time**: 2-5 minutes  
**💰 Cost**: ~0.01 SOL + ETH gas

### Step 5: Configure DVN/Executor

```bash
# Configure LayerZero security
pnpm configure-dvn:mainnet
pnpm setup-executor:mainnet
```

**⏱️ Time**: 5-10 minutes  
**💰 Cost**: ~0.05-0.1 SOL + ETH gas

### Step 6: Test with Small Amount

```bash
# Bridge 0.01 EAGLE tokens (test)
# Monitor LayerZero scan: https://layerzeroscan.com/

# If successful, proceed
# If failed, DO NOT CONTINUE
```

**⏱️ Time**: 2-5 minutes  
**💰 Cost**: LayerZero message fee (~$5-20)

---

## 📊 Total Deployment Cost

| Item | Cost | Notes |
|------|------|-------|
| Program Deployment | 5-8 SOL | One-time, not recoverable |
| Initialization | 0.01-0.02 SOL | Rent for accounts |
| Peer Configuration | 0.01 SOL + ETH gas | Cross-chain setup |
| DVN/Executor Setup | 0.05-0.1 SOL + ETH gas | Security config |
| Test Transaction | $5-20 USD | LayerZero message fee |
| **Total** | **~5.1-8.2 SOL + ETH gas + $20** | **~$1,100-$1,800 USD** |

---

## 🛑 STOP CONDITIONS

**Abort deployment if**:
1. Any devnet test fails
2. Gas price > 50 gwei on Ethereum
3. Ethereum OFT address not confirmed
4. LayerZero mainnet endpoints not verified
5. Any security concerns arise
6. Network congestion detected

---

## ⚡ Alternative: Test on Devnet First (FREE)

### Why Devnet First?
- ✅ **FREE** - no real money at risk
- ✅ **Safe** - test all functionality
- ✅ **Fast** - iterate quickly
- ✅ **Reversible** - start over if needed

### What to Test?
1. Deploy program ✅ (already done)
2. Initialize OFT ❌ (fix TypeScript issues)
3. Set peers ❌ (need Ethereum sepolia OFT)
4. Bridge SOL → ETH ❌ (test functionality)
5. Bridge ETH → SOL ❌ (test reverse)
6. Test edge cases ❌ (0 amount, max amount, etc.)

**Time**: 1-2 days  
**Cost**: FREE ✅

---

## 🎯 Recommended Path

### Option A: Test First (RECOMMENDED ⭐)
```bash
# 1. Fix devnet initialization
cd /home/akitav2/eagle-ovault-clean/solana-layerzero
pnpm init:devnet

# 2. Deploy Ethereum Sepolia OFT
# (need to set this up)

# 3. Configure peers
pnpm set-peer:devnet

# 4. Test bridge
pnpm test:integration

# 5. If all passes → deploy mainnet
```

**Risk**: 🟢 Low  
**Cost**: 🟢 Free  
**Time**: 🟡 1-2 days

### Option B: Deploy Mainnet Now (NOT RECOMMENDED ⚠️)
```bash
# Deploy immediately
cd /home/akitav2/eagle-ovault-clean/solana-layerzero
./scripts/build-and-deploy.sh mainnet-beta
pnpm init:mainnet
```

**Risk**: 🔴 High  
**Cost**: 🔴 $1,100-$1,800  
**Time**: 🟢 30 minutes

---

## 🤔 Your Decision

**Choose one**:

1. **Test on Devnet First** (Recommended)
   - Say: "let's test on devnet first"
   - I'll help you fix the initialization issues
   - We'll run all tests
   - Then deploy to mainnet with confidence

2. **Deploy to Mainnet Now** (Your risk)
   - Say: "deploy to mainnet now"
   - I'll run the deployment commands
   - You accept all risks listed above
   - No refunds if something breaks

---

## 📞 What I Need from You

If deploying to mainnet:
- [ ] Confirm Ethereum mainnet OFT address
- [ ] Confirm you accept the risks
- [ ] Confirm you have $1,500+ USD ready for costs
- [ ] Confirm you want to proceed without testing

If testing on devnet first:
- [ ] Just say "test on devnet first"
- [ ] I'll help you through everything
- [ ] It's free and safe

---

**What's your decision?** 🤔

