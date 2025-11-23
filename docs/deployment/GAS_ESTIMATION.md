# ⛽ EagleOVault Gas Estimation & Funding Guide

**Network**: Ethereum Mainnet  
**Date**: October 27, 2025

---

## 📊 Deployment Gas Costs

### Contract Deployment Estimates

| Contract | Bytecode Size | Est. Gas | @ 20 gwei | @ 30 gwei | @ 50 gwei | @ 100 gwei |
|----------|---------------|----------|-----------|-----------|-----------|------------|
| **EagleOVault** (CREATE2) | 24,595 bytes | 6,000,000 | 0.12 ETH | 0.18 ETH | 0.30 ETH | 0.60 ETH |
| **CharmStrategyUSD1** | 18,234 bytes | 3,500,000 | 0.07 ETH | 0.105 ETH | 0.175 ETH | 0.35 ETH |
| **EagleVaultWrapper** | 12,456 bytes | 2,000,000 | 0.04 ETH | 0.06 ETH | 0.10 ETH | 0.20 ETH |
| **EagleShareOFT** | 14,789 bytes | 2,500,000 | 0.05 ETH | 0.075 ETH | 0.125 ETH | 0.25 ETH |
| **Configuration Txs** | N/A | 1,000,000 | 0.02 ETH | 0.03 ETH | 0.05 ETH | 0.10 ETH |
| **TOTAL** | - | **15,000,000** | **0.30 ETH** | **0.45 ETH** | **0.75 ETH** | **1.50 ETH** |

### Additional Setup Costs

| Action | Est. Gas | @ 30 gwei | @ 50 gwei |
|--------|----------|-----------|-----------|
| Set Management Role | 50,000 | 0.0015 ETH | 0.0025 ETH |
| Set Keeper Role | 50,000 | 0.0015 ETH | 0.0025 ETH |
| Set Emergency Admin | 50,000 | 0.0015 ETH | 0.0025 ETH |
| Set Performance Fee | 50,000 | 0.0015 ETH | 0.0025 ETH |
| Add Strategy | 150,000 | 0.0045 ETH | 0.0075 ETH |
| Initialize Approvals | 100,000 | 0.003 ETH | 0.005 ETH |
| Set Wrapper Fees | 50,000 | 0.0015 ETH | 0.0025 ETH |
| Grant OFT Minter Role | 50,000 | 0.0015 ETH | 0.0025 ETH |
| **Subtotal** | **550,000** | **0.0165 ETH** | **0.0275 ETH** |

---

## 💰 Recommended Funding

### Deployment Wallet

| Gas Price Scenario | Deployment | Setup | Buffer | **Total Required** |
|--------------------|------------|-------|--------|-------------------|
| **Low** (20 gwei) | 0.30 ETH | 0.011 ETH | 0.089 ETH | **0.40 ETH** |
| **Normal** (30 gwei) | 0.45 ETH | 0.0165 ETH | 0.0835 ETH | **0.55 ETH** |
| **High** (50 gwei) | 0.75 ETH | 0.0275 ETH | 0.2225 ETH | **1.00 ETH** |
| **Peak** (100 gwei) | 1.50 ETH | 0.055 ETH | 0.445 ETH | **2.00 ETH** |

### Recommendations

1. **Testnet First**: Deploy to Sepolia (nearly free) to catch any issues
2. **Wait for Low Gas**: Use https://etherscan.io/gastracker to find optimal times
3. **Have Buffer**: Always keep 20-30% extra for retries and unexpected costs
4. **Use Legacy Transactions**: For CREATE2 deployment (0x00 type transactions)

---

## 📈 Operational Gas Costs (Post-Deployment)

### User Operations

| Function | Est. Gas | @ 30 gwei | Notes |
|----------|----------|-----------|-------|
| `deposit()` | 150,000 | 0.0045 ETH | Standard WLFI deposit |
| `depositDual()` | 250,000 | 0.0075 ETH | With USD1 swap |
| `withdraw()` | 180,000 | 0.0054 ETH | Pull from idle balance |
| `redeem()` | 180,000 | 0.0054 ETH | Pull from idle balance |
| `withdraw()` (from strategy) | 300,000 | 0.009 ETH | Requires strategy withdrawal |
| `redeem()` (from strategy) | 300,000 | 0.009 ETH | Requires strategy withdrawal |
| `wrap()` | 100,000 | 0.003 ETH | vEAGLE → EAGLE |
| `unwrap()` | 100,000 | 0.003 ETH | EAGLE → vEAGLE |

### Management Operations

| Function | Est. Gas | @ 30 gwei | Who Can Call |
|----------|----------|-----------|--------------|
| `report()` | 429,000 | 0.01287 ETH | Keeper |
| `tend()` | 200,000 | 0.006 ETH | Keeper |
| `forceDeployToStrategies()` | 280,000 | 0.0084 ETH | Keeper |
| `addStrategy()` | 150,000 | 0.0045 ETH | Management |
| `removeStrategy()` | 250,000 | 0.0075 ETH | Management |
| `updateStrategyWeight()` | 80,000 | 0.0024 ETH | Management |

### Emergency Operations

| Function | Est. Gas | @ 30 gwei | Who Can Call |
|----------|----------|-----------|--------------|
| `setPaused()` | 50,000 | 0.0015 ETH | Emergency Admin |
| `shutdownStrategy()` | 300,000 | 0.009 ETH | Emergency Admin |
| `emergencyWithdraw()` | 150,000 | 0.0045 ETH | Owner |

---

## 🤖 Keeper Bot Funding

### Monthly Operating Costs

Assuming:
- `report()` called 2x daily
- `tend()` called 1x daily  
- Average gas price: 30 gwei

| Operation | Daily Gas | Daily Cost | Monthly Cost |
|-----------|-----------|------------|--------------|
| `report()` (2x) | 858,000 | 0.02574 ETH | 0.7722 ETH |
| `tend()` (1x) | 200,000 | 0.006 ETH | 0.18 ETH |
| **TOTAL** | **1,058,000** | **0.03174 ETH** | **~0.95 ETH** |

**Recommended Keeper Wallet Balance**: 2 ETH (covers ~2 months + buffer)

---

## ⏰ Gas Price Optimization

### Optimal Deployment Times (UTC)

Best times (historically low gas):
- **Weekends**: Saturday-Sunday
- **Early Morning**: 2 AM - 6 AM UTC
- **Late Evening**: 10 PM - 12 AM UTC

Avoid:
- **Monday mornings**: High activity
- **DeFi events**: NFT drops, major protocol launches
- **Market volatility**: Liquidation cascades

### Gas Price Trackers

- https://etherscan.io/gastracker
- https://www.blocknative.com/gas-estimator
- https://www.gasprice.io/
- https://ethgas.watch/

### Gas Price Alerts

Set up alerts for when gas drops below 30 gwei:
```bash
# Using cast (ethers-rs)
while true; do
  GAS=$(cast gas-price --rpc-url $ETHEREUM_RPC_URL)
  GWEI=$(cast to-unit $GAS gwei)
  if (( $(echo "$GWEI < 30" | bc -l) )); then
    echo "⚡ Gas is $GWEI gwei - TIME TO DEPLOY!"
    # Add notification (email, Discord, etc.)
  fi
  sleep 300 # Check every 5 minutes
done
```

---

## 💳 Funding Checklist

### Before Deployment

- [ ] Deployer wallet has sufficient ETH
- [ ] Multisig has ETH for configuration transactions
- [ ] Keeper wallet funded for first month
- [ ] Emergency wallet has small amount for pauses

### Funding Breakdown

| Wallet | Purpose | Amount | Priority |
|--------|---------|--------|----------|
| **Deployer** | Deploy all contracts | 1.0 ETH | **Critical** |
| **Multisig** | Configuration & governance | 0.5 ETH | **High** |
| **Keeper** | Automated operations | 2.0 ETH | **High** |
| **Emergency** | Emergency functions | 0.1 ETH | **Medium** |
| **TOTAL** | | **3.6 ETH** | |

### Funding Commands

```bash
# Check balances before deployment
cast balance $DEPLOYER_ADDRESS --rpc-url $ETHEREUM_RPC_URL
cast balance $MULTISIG_ADDRESS --rpc-url $ETHEREUM_RPC_URL
cast balance $KEEPER_ADDRESS --rpc-url $ETHEREUM_RPC_URL
cast balance $EMERGENCY_ADDRESS --rpc-url $ETHEREUM_RPC_URL

# Send ETH to wallets (from your funding wallet)
cast send $DEPLOYER_ADDRESS --value 1ether --rpc-url $ETHEREUM_RPC_URL --private-key $FUNDING_KEY
cast send $MULTISIG_ADDRESS --value 0.5ether --rpc-url $ETHEREUM_RPC_URL --private-key $FUNDING_KEY
cast send $KEEPER_ADDRESS --value 2ether --rpc-url $ETHEREUM_RPC_URL --private-key $FUNDING_KEY
cast send $EMERGENCY_ADDRESS --value 0.1ether --rpc-url $ETHEREUM_RPC_URL --private-key $FUNDING_KEY
```

---

## 📊 Gas Optimization Strategies

### Contract Deployment

1. **Use CREATE2**: Required for EagleOVault (over size limit)
2. **Legacy Transactions**: Better gas estimation for CREATE2
3. **Optimal Runs**: 200 optimizer runs balances deployment vs. runtime
4. **Bundle Transactions**: Use multicall where possible

### Runtime Optimization

1. **Batch Operations**: Users can batch deposits/withdrawals
2. **Off-Peak Timing**: Encourage transactions during low-gas periods
3. **Layer 2 Integration**: Future: Deploy to Arbitrum, Base for cheaper operations
4. **Gas Tokens**: Consider GST2/CHI for keeper operations (if profitable)

### Monitoring

```bash
# Track gas usage over time
cast logs --address $VAULT_ADDRESS \
  --from-block $DEPLOY_BLOCK \
  --rpc-url $ETHEREUM_RPC_URL \
  | jq '.[] | {hash: .transactionHash, gas: .gasUsed}'

# Find highest gas consumers
cast logs --address $VAULT_ADDRESS \
  --from-block $DEPLOY_BLOCK \
  --rpc-url $ETHEREUM_RPC_URL \
  | jq -r '.[] | "\(.gasUsed) \(.transactionHash)"' \
  | sort -rn \
  | head -10
```

---

## 🎯 Cost-Benefit Analysis

### Deployment Investment

At current ETH price ($3,500):
- **Deployment cost** (@ 30 gwei): $1,925 USD
- **Monthly operations** (@ 30 gwei): $3,325 USD
- **First year total**: ~$42,000 USD

### Revenue Potential

With 10% performance fee on $1M TVL earning 10% APY:
- **Yearly vault profit**: $100,000
- **Performance fee (10%)**: $10,000
- **Monthly average**: $833

**Break-even TVL**: ~$4.2M (at 10% APY with 10% performance fee)

### L2 Comparison

| Network | Deployment Cost | Monthly Ops | Annual Total |
|---------|----------------|-------------|--------------|
| **Ethereum** | $1,925 | $3,325 | $42,000 |
| **Arbitrum** | $193 | $333 | $4,200 |
| **Base** | $193 | $333 | $4,200 |
| **Optimism** | $193 | $333 | $4,200 |

**Recommendation**: Deploy to Ethereum first (main liquidity), expand to L2s as TVL grows

---

## 📞 Emergency Gas Funding

If gas spikes during deployment:

### Option 1: Increase Gas Price
```bash
# Resubmit with higher gas price
cast send ... --gas-price 50gwei
```

### Option 2: Use Flashbots
```bash
# Avoid MEV and get priority
# See: https://docs.flashbots.net/
```

### Option 3: Wait for Lower Gas
```bash
# Cancel pending transaction
cast send $YOUR_ADDRESS --nonce $NONCE --gas-price 0 --value 0

# Wait for gas to decrease
# Redeploy later
```

---

## ✅ Final Checklist

Before deploying:

### Funding
- [ ] Deployer wallet has 1.0+ ETH
- [ ] Gas price below 35 gwei (preferably <30)
- [ ] Backup funds available if needed
- [ ] All wallets funded per table above

### Monitoring
- [ ] Gas tracker alerts set up
- [ ] Transaction monitoring ready
- [ ] Etherscan notifications enabled
- [ ] Team on standby for issues

### Contingency
- [ ] Plan for high gas scenario
- [ ] Backup deployment time scheduled
- [ ] Emergency contact numbers ready
- [ ] Rollback procedure documented

---

## 🎉 Post-Deployment Gas Management

### Week 1
- [ ] Monitor all transactions
- [ ] Track actual vs. estimated gas
- [ ] Optimize keeper bot timing
- [ ] Document gas patterns

### Month 1
- [ ] Review keeper costs
- [ ] Optimize report() frequency
- [ ] Consider gas rebates for users
- [ ] Plan L2 expansion if needed

### Ongoing
- [ ] Monthly gas cost review
- [ ] Quarterly optimization review
- [ ] Annual cost-benefit analysis
- [ ] L2 migration evaluation

---

**Total Required Funding**: 3.6 ETH (~$12,600 USD @ $3,500/ETH)

**Recommended Deployment Gas**: < 30 gwei

**Status**: Ready for funding and deployment

**Last Updated**: October 27, 2025

