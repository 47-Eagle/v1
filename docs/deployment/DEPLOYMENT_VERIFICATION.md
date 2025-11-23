# ✅ EagleOVault Deployment Verification Guide

**Network**: Ethereum Mainnet  
**Purpose**: Post-deployment verification procedures  
**Date**: October 27, 2025

---

## 📋 Quick Verification Checklist

After deploying each contract, verify:
- [ ] Contract deployed at correct address
- [ ] Contract verified on Etherscan
- [ ] Constructor parameters correct
- [ ] Initial state correct
- [ ] Access control properly configured
- [ ] Integration with other contracts works

---

## 🔍 Contract-by-Contract Verification

### 1. EagleOVault Verification

#### Deployment Info
```bash
# Check deployment
export VAULT_ADDRESS=0x[YOUR_DEPLOYED_ADDRESS]

# Verify deployed
cast code $VAULT_ADDRESS --rpc-url $ETHEREUM_RPC_URL

# Check it's not empty (should return bytecode)
```

#### Constructor Parameters
```bash
# Verify WLFI address
cast call $VAULT_ADDRESS "asset()(address)" --rpc-url $ETHEREUM_RPC_URL
# Expected: 0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6

# Verify USD1 address
cast call $VAULT_ADDRESS "USD1_TOKEN()(address)" --rpc-url $ETHEREUM_RPC_URL
# Expected: 0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d

# Verify USD1 price feed
cast call $VAULT_ADDRESS "USD1_PRICE_FEED()(address)" --rpc-url $ETHEREUM_RPC_URL
# Expected: 0xF0d9bb015Cd7BfAb877B7156146dc09Bf461370d

# Verify Uniswap pool
cast call $VAULT_ADDRESS "WLFI_USD1_POOL()(address)" --rpc-url $ETHEREUM_RPC_URL
# Expected: 0x4637ea6ecf7e16c99e67e941ab4d7d52eac7c73d

# Verify Uniswap router
cast call $VAULT_ADDRESS "UNISWAP_ROUTER()(address)" --rpc-url $ETHEREUM_RPC_URL
# Expected: 0xE592427A0AEce92De3Edee1F18E0157C05861564

# Verify owner
cast call $VAULT_ADDRESS "owner()(address)" --rpc-url $ETHEREUM_RPC_URL
# Expected: [YOUR_MULTISIG_ADDRESS]
```

#### Initial State
```bash
# Check vault name and symbol
cast call $VAULT_ADDRESS "name()(string)" --rpc-url $ETHEREUM_RPC_URL
# Expected: "Eagle Vault Shares"

cast call $VAULT_ADDRESS "symbol()(string)" --rpc-url $ETHEREUM_RPC_URL
# Expected: "vEAGLE"

# Check decimals
cast call $VAULT_ADDRESS "decimals()(uint8)" --rpc-url $ETHEREUM_RPC_URL
# Expected: 18

# Check initial total supply
cast call $VAULT_ADDRESS "totalSupply()(uint256)" --rpc-url $ETHEREUM_RPC_URL
# Expected: 0

# Check initial total assets
cast call $VAULT_ADDRESS "totalAssets()(uint256)" --rpc-url $ETHEREUM_RPC_URL
# Expected: 0

# Check paused status
cast call $VAULT_ADDRESS "paused()(bool)" --rpc-url $ETHEREUM_RPC_URL
# Expected: false

# Check shutdown status
cast call $VAULT_ADDRESS "isShutdown()(bool)" --rpc-url $ETHEREUM_RPC_URL
# Expected: false

# Check performance fee
cast call $VAULT_ADDRESS "performanceFee()(uint16)" --rpc-url $ETHEREUM_RPC_URL
# Expected: 1000 (10%)

# Check max total supply
cast call $VAULT_ADDRESS "maxTotalSupply()(uint256)" --rpc-url $ETHEREUM_RPC_URL
# Expected: 50000000000000000000000000 (50M)
```

#### Access Control
```bash
# Check management address
cast call $VAULT_ADDRESS "management()(address)" --rpc-url $ETHEREUM_RPC_URL

# Check keeper address
cast call $VAULT_ADDRESS "keeper()(address)" --rpc-url $ETHEREUM_RPC_URL

# Check emergency admin
cast call $VAULT_ADDRESS "emergencyAdmin()(address)" --rpc-url $ETHEREUM_RPC_URL

# Check performance fee recipient
cast call $VAULT_ADDRESS "performanceFeeRecipient()(address)" --rpc-url $ETHEREUM_RPC_URL
```

#### Oracle Integration
```bash
# Test USD1 price feed
cast call $VAULT_ADDRESS "getUSD1Price()(uint256)" --rpc-url $ETHEREUM_RPC_URL
# Expected: ~1000000 (with 6 decimals, = $1.00)

# Test WLFI price
cast call $VAULT_ADDRESS "getWLFIPrice()(uint256)" --rpc-url $ETHEREUM_RPC_URL
# Expected: > 0

# Test WLFI equivalent calculation
cast call $VAULT_ADDRESS "wlfiEquivalent(uint256)(uint256)" 1000000000000000000 --rpc-url $ETHEREUM_RPC_URL
# Expected: Amount of WLFI equivalent to 1 USD1
```

---

### 2. CharmStrategyUSD1 Verification

#### Deployment Info
```bash
export STRATEGY_ADDRESS=0x[YOUR_DEPLOYED_STRATEGY]

# Verify deployed
cast code $STRATEGY_ADDRESS --rpc-url $ETHEREUM_RPC_URL
```

#### Constructor Parameters
```bash
# Verify vault address
cast call $STRATEGY_ADDRESS "vault()(address)" --rpc-url $ETHEREUM_RPC_URL
# Expected: $VAULT_ADDRESS

# Verify WLFI address
cast call $STRATEGY_ADDRESS "WLFI()(address)" --rpc-url $ETHEREUM_RPC_URL
# Expected: 0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6

# Verify USD1 address  
cast call $STRATEGY_ADDRESS "USD1()(address)" --rpc-url $ETHEREUM_RPC_URL
# Expected: 0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d

# Verify Charm vault
cast call $STRATEGY_ADDRESS "charmVault()(address)" --rpc-url $ETHEREUM_RPC_URL
# Expected: 0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71

# Verify router
cast call $STRATEGY_ADDRESS "router()(address)" --rpc-url $ETHEREUM_RPC_URL
# Expected: 0xE592427A0AEce92De3Edee1F18E0157C05861564
```

#### Initial State
```bash
# Check initialized
cast call $STRATEGY_ADDRESS "isInitialized()(bool)" --rpc-url $ETHEREUM_RPC_URL
# Expected: true (after calling initializeApprovals())

# Check active
cast call $STRATEGY_ADDRESS "active()(bool)" --rpc-url $ETHEREUM_RPC_URL
# Expected: true

# Check max slippage
cast call $STRATEGY_ADDRESS "maxSlippage()(uint256)" --rpc-url $ETHEREUM_RPC_URL
# Expected: 300 (3%)

# Check share balance (should be 0 initially)
cast call $STRATEGY_ADDRESS "getShareBalance()(uint256)" --rpc-url $ETHEREUM_RPC_URL
# Expected: 0

# Check total amounts (should be 0, 0 initially)
cast call $STRATEGY_ADDRESS "getTotalAmounts()(uint256,uint256)" --rpc-url $ETHEREUM_RPC_URL
# Expected: (0, 0)
```

#### Approvals
```bash
# Check WLFI allowance to Charm vault
cast call 0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6 \
  "allowance(address,address)(uint256)" \
  $STRATEGY_ADDRESS \
  0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71 \
  --rpc-url $ETHEREUM_RPC_URL
# Expected: type(uint256).max

# Check USD1 allowance to Charm vault
cast call 0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d \
  "allowance(address,address)(uint256)" \
  $STRATEGY_ADDRESS \
  0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71 \
  --rpc-url $ETHEREUM_RPC_URL
# Expected: type(uint256).max
```

---

### 3. EagleShareOFT Verification

#### Deployment Info
```bash
export OFT_ADDRESS=0x[YOUR_DEPLOYED_OFT]

# Verify deployed
cast code $OFT_ADDRESS --rpc-url $ETHEREUM_RPC_URL
```

#### Token Info
```bash
# Check name
cast call $OFT_ADDRESS "name()(string)" --rpc-url $ETHEREUM_RPC_URL
# Expected: "Eagle Share Token"

# Check symbol
cast call $OFT_ADDRESS "symbol()(string)" --rpc-url $ETHEREUM_RPC_URL
# Expected: "EAGLE"

# Check decimals
cast call $OFT_ADDRESS "decimals()(uint8)" --rpc-url $ETHEREUM_RPC_URL
# Expected: 18

# Check total supply
cast call $OFT_ADDRESS "totalSupply()(uint256)" --rpc-url $ETHEREUM_RPC_URL
# Expected: 0 (initially)
```

#### LayerZero Config
```bash
# Check endpoint
cast call $OFT_ADDRESS "endpoint()(address)" --rpc-url $ETHEREUM_RPC_URL
# Expected: 0x1a44076050125825900e736c501f859c50fE728c (LZ V2)

# Check delegate
cast call $OFT_ADDRESS "owner()(address)" --rpc-url $ETHEREUM_RPC_URL
# Expected: [YOUR_MULTISIG_ADDRESS]
```

---

### 4. EagleVaultWrapper Verification

#### Deployment Info
```bash
export WRAPPER_ADDRESS=0x[YOUR_DEPLOYED_WRAPPER]

# Verify deployed
cast code $WRAPPER_ADDRESS --rpc-url $ETHEREUM_RPC_URL
```

#### Token References
```bash
# Check vault EAGLE address
cast call $WRAPPER_ADDRESS "VAULT_EAGLE()(address)" --rpc-url $ETHEREUM_RPC_URL
# Expected: $VAULT_ADDRESS

# Check OFT EAGLE address
cast call $WRAPPER_ADDRESS "OFT_EAGLE()(address)" --rpc-url $ETHEREUM_RPC_URL
# Expected: $OFT_ADDRESS
```

#### Fee Configuration
```bash
# Check deposit fee (wrap fee)
cast call $WRAPPER_ADDRESS "depositFee()(uint256)" --rpc-url $ETHEREUM_RPC_URL
# Expected: 100 (1%)

# Check withdraw fee (unwrap fee)
cast call $WRAPPER_ADDRESS "withdrawFee()(uint256)" --rpc-url $ETHEREUM_RPC_URL
# Expected: 200 (2%)

# Check fee recipient
cast call $WRAPPER_ADDRESS "feeRecipient()(address)" --rpc-url $ETHEREUM_RPC_URL
# Expected: [YOUR_FEE_RECIPIENT_ADDRESS]
```

#### State Variables
```bash
# Check total locked
cast call $WRAPPER_ADDRESS "totalLocked()(uint256)" --rpc-url $ETHEREUM_RPC_URL
# Expected: 0 (initially)

# Check total minted
cast call $WRAPPER_ADDRESS "totalMinted()(uint256)" --rpc-url $ETHEREUM_RPC_URL
# Expected: 0 (initially)
```

---

## 🧪 Integration Testing

### Test 1: Vault Deposit Flow

```bash
# Setup test wallet
export TEST_WALLET=0x[YOUR_TEST_ADDRESS]

# 1. Approve WLFI to vault
cast send 0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6 \
  "approve(address,uint256)" \
  $VAULT_ADDRESS \
  1000000000000000000 \
  --rpc-url $ETHEREUM_RPC_URL \
  --private-key $TEST_PRIVATE_KEY

# 2. Deposit WLFI
cast send $VAULT_ADDRESS \
  "deposit(uint256,address)" \
  1000000000000000000 \
  $TEST_WALLET \
  --rpc-url $ETHEREUM_RPC_URL \
  --private-key $TEST_PRIVATE_KEY

# 3. Check shares received
cast call $VAULT_ADDRESS "balanceOf(address)(uint256)" $TEST_WALLET \
  --rpc-url $ETHEREUM_RPC_URL
# Expected: ~1000000000000000000 (1:1 on first deposit)
```

### Test 2: Strategy Deployment

```bash
# 1. Add strategy to vault (as owner/management)
cast send $VAULT_ADDRESS \
  "addStrategy(address,uint256)" \
  $STRATEGY_ADDRESS \
  9000 \
  --rpc-url $ETHEREUM_RPC_URL \
  --private-key $OWNER_PRIVATE_KEY

# 2. Verify strategy added
cast call $VAULT_ADDRESS "activeStrategies(address)(bool)" $STRATEGY_ADDRESS \
  --rpc-url $ETHEREUM_RPC_URL
# Expected: true

# 3. Check strategy weight
cast call $VAULT_ADDRESS "strategyWeights(address)(uint256)" $STRATEGY_ADDRESS \
  --rpc-url $ETHEREUM_RPC_URL
# Expected: 9000

# 4. Force deploy to strategies
cast send $VAULT_ADDRESS "forceDeployToStrategies()" \
  --rpc-url $ETHEREUM_RPC_URL \
  --private-key $KEEPER_PRIVATE_KEY

# 5. Check strategy received funds
cast call $STRATEGY_ADDRESS "getTotalAmounts()(uint256,uint256)" \
  --rpc-url $ETHEREUM_RPC_URL
# Expected: (wlfiAmount > 0, usd1Amount >= 0)
```

### Test 3: Withdraw Flow

```bash
# 1. Check redeemable amount
cast call $VAULT_ADDRESS "maxRedeem(address)(uint256)" $TEST_WALLET \
  --rpc-url $ETHEREUM_RPC_URL

# 2. Redeem shares
cast send $VAULT_ADDRESS \
  "redeem(uint256,address,address)" \
  500000000000000000 \
  $TEST_WALLET \
  $TEST_WALLET \
  --rpc-url $ETHEREUM_RPC_URL \
  --private-key $TEST_PRIVATE_KEY

# 3. Check WLFI received
cast call 0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6 \
  "balanceOf(address)(uint256)" $TEST_WALLET \
  --rpc-url $ETHEREUM_RPC_URL
# Expected: Increased by withdrawn amount
```

### Test 4: Wrap/Unwrap Flow

```bash
# 1. Approve vEAGLE to wrapper
cast send $VAULT_ADDRESS \
  "approve(address,uint256)" \
  $WRAPPER_ADDRESS \
  1000000000000000000 \
  --rpc-url $ETHEREUM_RPC_URL \
  --private-key $TEST_PRIVATE_KEY

# 2. Wrap vEAGLE to EAGLE
cast send $WRAPPER_ADDRESS \
  "wrap(uint256)" \
  1000000000000000000 \
  --rpc-url $ETHEREUM_RPC_URL \
  --private-key $TEST_PRIVATE_KEY

# 3. Check EAGLE received (minus 1% fee)
cast call $OFT_ADDRESS "balanceOf(address)(uint256)" $TEST_WALLET \
  --rpc-url $ETHEREUM_RPC_URL
# Expected: ~990000000000000000 (99% of input)

# 4. Unwrap EAGLE to vEAGLE
cast send $WRAPPER_ADDRESS \
  "unwrap(uint256)" \
  990000000000000000 \
  --rpc-url $ETHEREUM_RPC_URL \
  --private-key $TEST_PRIVATE_KEY

# 5. Check vEAGLE received (minus 2% fee)
cast call $VAULT_ADDRESS "balanceOf(address)(uint256)" $TEST_WALLET \
  --rpc-url $ETHEREUM_RPC_URL
# Expected: ~970200000000000000 (98% of unwrap amount)
```

---

## 🚨 Error Scenarios to Test

### Test Paused State
```bash
# 1. Pause vault
cast send $VAULT_ADDRESS "setPaused(bool)" true \
  --rpc-url $ETHEREUM_RPC_URL \
  --private-key $OWNER_PRIVATE_KEY

# 2. Try to deposit (should fail)
cast send $VAULT_ADDRESS \
  "deposit(uint256,address)" \
  1000000000000000000 \
  $TEST_WALLET \
  --rpc-url $ETHEREUM_RPC_URL \
  --private-key $TEST_PRIVATE_KEY
# Expected: Revert with "Paused()"

# 3. Try to withdraw (should succeed)
cast send $VAULT_ADDRESS \
  "redeem(uint256,address,address)" \
  100000000000000000 \
  $TEST_WALLET \
  $TEST_WALLET \
  --rpc-url $ETHEREUM_RPC_URL \
  --private-key $TEST_PRIVATE_KEY
# Expected: Success

# 4. Unpause
cast send $VAULT_ADDRESS "setPaused(bool)" false \
  --rpc-url $ETHEREUM_RPC_URL \
  --private-key $OWNER_PRIVATE_KEY
```

### Test Max Deposit Limit
```bash
# Check max deposit
cast call $VAULT_ADDRESS "maxDeposit(address)(uint256)" $TEST_WALLET \
  --rpc-url $ETHEREUM_RPC_URL
# Expected: 50000000000000000000000000 - totalSupply()

# Try to deposit more than max (should fail)
```

### Test Oracle Failure
```bash
# This requires mock/test environment
# In production, monitor for stale prices
cast call $VAULT_ADDRESS "getUSD1Price()(uint256)" \
  --rpc-url $ETHEREUM_RPC_URL
```

---

## ✅ Final Verification Checklist

### Deployment Complete
- [ ] EagleOVault deployed and verified
- [ ] CharmStrategyUSD1 deployed and verified
- [ ] EagleShareOFT deployed and verified
- [ ] EagleVaultWrapper deployed and verified

### Configuration Complete
- [ ] All constructor parameters correct
- [ ] All roles assigned correctly
- [ ] All fees configured correctly
- [ ] All approvals set correctly

### Integration Complete
- [ ] Strategy added to vault
- [ ] Strategy can receive deposits
- [ ] Vault can withdraw from strategy
- [ ] Wrapper can mint/burn OFT

### Testing Complete
- [ ] Deposit flow tested
- [ ] Withdraw flow tested
- [ ] Strategy deployment tested
- [ ] Wrap/unwrap tested
- [ ] Emergency functions tested

### Monitoring Setup
- [ ] Etherscan contract tracking enabled
- [ ] Price oracle monitoring active
- [ ] TVL tracking configured
- [ ] Alert system configured

### Documentation Complete
- [ ] Deployment addresses documented
- [ ] Configuration parameters documented
- [ ] Emergency procedures documented
- [ ] User guide updated

---

## 📊 Monitoring Commands

### Real-Time Monitoring
```bash
# Watch vault TVL
watch -n 60 'cast call $VAULT_ADDRESS "totalAssets()(uint256)" --rpc-url $ETHEREUM_RPC_URL'

# Watch total supply
watch -n 60 'cast call $VAULT_ADDRESS "totalSupply()(uint256)" --rpc-url $ETHEREUM_RPC_URL'

# Watch strategy balance
watch -n 60 'cast call $STRATEGY_ADDRESS "getTotalAmounts()(uint256,uint256)" --rpc-url $ETHEREUM_RPC_URL'

# Watch USD1 price
watch -n 60 'cast call $VAULT_ADDRESS "getUSD1Price()(uint256)" --rpc-url $ETHEREUM_RPC_URL'
```

### Transaction Monitoring
```bash
# Monitor vault transactions
cast logs --address $VAULT_ADDRESS \
  --rpc-url $ETHEREUM_RPC_URL \
  --from-block latest

# Monitor large deposits (>1000 WLFI)
cast logs \
  --address $VAULT_ADDRESS \
  --from-block latest \
  --rpc-url $ETHEREUM_RPC_URL \
  $(cast sig-event "Deposit(address,address,uint256,uint256)")
```

---

**Status**: Ready for deployment verification

**Next Steps**: Follow this guide after each contract deployment

**Last Updated**: October 27, 2025

