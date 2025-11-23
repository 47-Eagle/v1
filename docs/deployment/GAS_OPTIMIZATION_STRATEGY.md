# 🔥 Gas Optimization Strategy for Mainnet Deployment

## 💰 Target: Minimize Deployment Costs

**Current Estimate:** ~$1,350 @ 30 gwei  
**Optimized Target:** ~$300-600 @ 5-10 gwei

---

## 📊 Gas Price Timing Strategy

### Best Times to Deploy (Lowest Gas):

1. **Weekends** - Saturday/Sunday (especially early morning UTC)
2. **Early Morning UTC** - 2 AM - 8 AM UTC
3. **Avoid:**
   - US business hours (2 PM - 10 PM UTC)
   - Major token launches/airdrops
   - NFT mint days

### Check Current Gas Prices:

```bash
# Check current gas price
source .env
cast gas-price --rpc-url $ETHEREUM_RPC_URL

# Convert to gwei (divide by 1000000000)
# Target: < 10 gwei for optimal savings
```

**Gas Price Tiers:**
- 🟢 **Excellent:** < 5 gwei (~$450 total)
- 🟢 **Good:** 5-10 gwei (~$450-900 total)
- 🟡 **Fair:** 10-20 gwei (~$900-1,800 total)
- 🔴 **High:** 20-30 gwei (~$1,800-2,700 total)
- ⛔ **Wait:** > 30 gwei (too expensive!)

---

## 🔧 Technical Optimizations

### Already Applied ✅

- ✅ Optimizer runs=1 (minimizes deployment cost)
- ✅ viaIR=true (better optimization)
- ✅ Removed debug code
- ✅ Using CREATE2 (no additional cost)

### Deployment Strategy

**Option A: Single Transaction (All at Once)**
- Deploy all 4 contracts in one script
- **Pros:** Simple, atomic
- **Cons:** Higher upfront gas cost

**Option B: Batched Deployment (Spread Over Time)**
- Deploy contracts separately during low gas periods
- **Pros:** Can wait for optimal gas each time
- **Cons:** More complex, multiple transactions

---

## 💡 Recommended Approach

### Phase 1: Wait for Optimal Gas

```bash
# Monitor gas prices
watch -n 60 'cast gas-price --rpc-url $ETHEREUM_RPC_URL | \
  awk "{printf \"Current Gas: %.2f gwei\\n\", \$1/1000000000}"'
```

**Deploy when gas is < 10 gwei**

### Phase 2: Deploy with Gas Limit

```bash
# Deploy with manual gas price control
forge script script/DeployProductionVanity.s.sol:DeployProductionVanity \
  --rpc-url $ETHEREUM_RPC_URL \
  --broadcast \
  --verify \
  --slow \
  --gas-price 5000000000 \  # 5 gwei (adjust based on current prices)
  -vvvv
```

---

## 📋 Pre-Deployment Checklist

### 1. Fund Deployer Wallet

**Minimum Required:**
```
Gas Cost Estimate: 15,000,000 gas
At 5 gwei: 0.075 ETH (~$225)
At 10 gwei: 0.15 ETH (~$450)
At 20 gwei: 0.30 ETH (~$900)

Recommended Buffer: 2 ETH (to be safe)
```

**Send ETH to:** `0x7310Dd6EF89b7f829839F140C6840bc929ba2031`

### 2. Check Balance

```bash
source .env
cast balance 0x7310Dd6EF89b7f829839F140C6840bc929ba2031 \
  --rpc-url $ETHEREUM_RPC_URL
```

### 3. Check Gas Prices

```bash
# Current price
cast gas-price --rpc-url $ETHEREUM_RPC_URL

# Historical data (use ultrasound.money or etherscan)
```

### 4. Set Gas Price

Edit `DEPLOY_NOW.sh` or use manual command with `--gas-price` flag.

---

## 🚀 Deployment Commands

### Command 1: Check Everything First

```bash
# 1. Check deployer balance
cast balance 0x7310Dd6EF89b7f829839F140C6840bc929ba2031 \
  --rpc-url $ETHEREUM_RPC_URL

# 2. Check current gas
cast gas-price --rpc-url $ETHEREUM_RPC_URL

# 3. Estimate cost
# Gas needed: ~15,000,000
# At 5 gwei: 0.075 ETH
# At 10 gwei: 0.15 ETH
```

### Command 2: Deploy with Optimal Gas

**Option A: Let Script Auto-Detect**
```bash
source .env
./DEPLOY_NOW.sh
```

**Option B: Manual Gas Price Control (Recommended for savings)**
```bash
source .env

# Calculate gas price in wei (gwei * 1000000000)
# Example: 5 gwei = 5000000000 wei

forge script script/DeployProductionVanity.s.sol:DeployProductionVanity \
  --rpc-url $ETHEREUM_RPC_URL \
  --broadcast \
  --verify \
  --slow \
  --gas-price 5000000000 \
  --with-gas-price \
  -vvvv
```

---

## 💰 Cost Breakdown

### Estimated Gas Usage

| Contract | Gas | @ 5 gwei | @ 10 gwei | @ 30 gwei |
|----------|-----|----------|-----------|-----------|
| EagleOVault | 6,000,000 | $180 | $360 | $1,080 |
| CharmStrategy | 3,500,000 | $105 | $210 | $630 |
| EagleShareOFT | 2,500,000 | $75 | $150 | $450 |
| Wrapper | 2,000,000 | $60 | $120 | $360 |
| Config | 1,000,000 | $30 | $60 | $180 |
| **TOTAL** | **15,000,000** | **$450** | **$900** | **$2,700** |

*Prices assume ETH = $3,000*

---

## ⏰ Timing Recommendations

### Best Days/Times (UTC):

**Weekday Strategy:**
- Monday: 2 AM - 6 AM UTC ✅
- Tuesday: 2 AM - 6 AM UTC ✅
- Wednesday: 2 AM - 6 AM UTC ✅
- Thursday: 2 AM - 6 AM UTC ✅
- Friday: Avoid (weekend traffic starts)

**Weekend Strategy:**
- Saturday: ALL DAY (best) ✅✅✅
- Sunday: ALL DAY (best) ✅✅✅

**AVOID:**
- Friday 6 PM - Monday 6 AM UTC (weekend volatility)
- Wednesday 12 PM - 8 PM UTC (DeFi activity peaks)
- Any day 6 PM - midnight UTC (US evening hours)

---

## 🎯 Final Recommendation

### Optimal Deployment Strategy:

1. **Wait for Saturday or Sunday**
2. **Monitor gas prices** - Deploy when < 10 gwei
3. **Have 2 ETH ready** in deployer wallet
4. **Use manual gas price** for maximum control
5. **Verify immediately** on Etherscan (included in script)

### Expected Savings:

- **Patient (< 5 gwei):** Save ~$900 (33% of peak cost)
- **Reasonable (< 10 gwei):** Save ~$450 (17% of peak cost)
- **Impatient (> 20 gwei):** Overpay ~$600+ (50% more)

---

## 📱 Gas Price Monitoring Tools

- **Etherscan Gas Tracker:** https://etherscan.io/gastracker
- **Ultrasound Money:** https://ultrasound.money/
- **Gas Now:** https://www.gasnow.org/
- **Command Line:**
  ```bash
  watch -n 30 'cast gas-price --rpc-url $ETHEREUM_RPC_URL'
  ```

---

## ✅ Ready to Deploy?

When gas prices are optimal:

```bash
# 1. Fund wallet (2 ETH)
# 2. Wait for low gas (< 10 gwei)
# 3. Run deployment:

source .env
forge script script/DeployProductionVanity.s.sol:DeployProductionVanity \
  --rpc-url $ETHEREUM_RPC_URL \
  --broadcast \
  --verify \
  --slow \
  --gas-price 5000000000 \
  -vvvv
```

**Patience = Savings! 💰**

