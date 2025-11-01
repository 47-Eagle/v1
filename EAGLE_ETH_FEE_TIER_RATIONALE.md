# 🎯 EAGLE/ETH 2% Fee Tier - Strategic Rationale

## Decision Summary

**Pool Configuration:**
- **Platform**: Uniswap V4
- **Pair**: EAGLE/ETH (Native ETH, not WETH)
- **Fee Tier**: 2% (20000 in basis points)
- **Tick Spacing**: 200

---

## 💰 Why 2% Fee Tier?

### 1. **New Token Premium**
- EAGLE is a new token launching liquidity pool
- 2% tier attracts serious LPs with higher rewards
- Compensates for:
  - Initial volatility
  - Price discovery period
  - Lower liquidity depth initially

### 2. **LP Incentives**
- **Higher fees** = **More attractive for LPs**
- Target: $50k+ initial liquidity
- LPs earn more per trade → stay longer
- Reduces mercenary capital risk

### 3. **Market Comparison**

| Token Type | Typical Fee Tier | Example |
|------------|------------------|---------|
| Stablecoins | 0.01% - 0.05% | USDC/USDT |
| Blue Chips | 0.05% - 0.3% | ETH/WBTC |
| **New Tokens** | **1% - 2%** | **EAGLE/ETH** |
| Exotic Pairs | 1% - 3% | Low-cap alts |

### 4. **Uniswap V4 Benefits**
- Can adjust fees dynamically via hooks later
- Start high, reduce as liquidity grows
- Hook can distribute portion of fees to EAGLE stakers
- Example: 1% to LPs, 0.5% to stakers, 0.5% to protocol

---

## 📊 Economic Impact Analysis

### For Liquidity Providers (LPs):
```
Scenario: $100k TVL, $50k daily volume
Daily fees: $50,000 × 2% = $1,000
Annual fees: $1,000 × 365 = $365,000
APR for LPs: ($365,000 / $100,000) = 365% 🎯

Even at 50% to hook (stakers/protocol):
LP APR: ~180% 🚀
```

### For Traders:
```
Buy $1,000 EAGLE with ETH:
- Fee: $1,000 × 2% = $20
- Acceptable for:
  ✅ Conviction buys
  ✅ Long-term holders
  ✅ Ecosystem participants
  
Compare to centralized exchanges:
- Binance/Coinbase: 0.1% - 0.5% + spread
- Uniswap V3 typical: 0.3% - 1%
- EAGLE 2%: Premium but fair for new token
```

---

## 🎨 Marketing Angle

### Positioning:
**"EAGLE/ETH: Premium Liquidity Pool for Serious DeFi Participants"**

### Messaging:
1. **For LPs**: "Earn premium yields on EAGLE/ETH - 2% fee tier"
2. **For Traders**: "Support the ecosystem, share in success"
3. **For Community**: "50% of fees distributed to EAGLE stakers"

### Key Points:
- Not a meme coin - serious yield protocol
- Premium fee = premium rewards
- Aligns LP and holder incentives
- Sustainable long-term model

---

## 🔄 Future Adjustments

### Via V4 Hooks (Dynamic Fees):
```solidity
// Start: 2% fee
if (TVL > $1M && dailyVolume > $100k) {
  // Reduce to 1.5% when established
  adjustFee(15000);
}

if (TVL > $5M && dailyVolume > $500k) {
  // Further reduce to 1% when mature
  adjustFee(10000);
}
```

### Milestone-Based Reduction:
| TVL | Daily Volume | Fee Tier | Status |
|-----|--------------|----------|--------|
| $0-$500k | <$50k | 2% | Launch |
| $500k-$2M | $50k-$200k | 1.5% | Growing |
| $2M+ | $200k+ | 1% | Established |

---

## ⚠️ Risk Mitigation

### Potential Concerns:
1. **"2% is too high, traders won't use it"**
   - Response: New tokens need premium to attract LPs
   - V4 hooks allow dynamic reduction
   - Focus on long-term holders, not day traders

2. **"LPs will leave when fees reduce"**
   - Response: By then, volume compensates
   - $1M TVL @ 1% with $500k volume = same $ as $100k @ 2% with $50k volume
   - Additional rewards via hook (EAGLE distribution)

3. **"Competitors have lower fees"**
   - Response: EAGLE offers yield from vault strategies
   - Cross-chain liquidity via LayerZero
   - Unique hook features (fee sharing, rewards)

---

## 🚀 Launch Strategy

### Phase 1: Launch (Months 1-3)
- **Fee**: 2% (20000)
- **Target TVL**: $100k-$500k
- **Focus**: Attract committed LPs
- **Hook**: Distribute 50% fees to EAGLE stakers

### Phase 2: Growth (Months 3-6)
- **Fee**: Evaluate reduction to 1.5% if TVL > $500k
- **Target TVL**: $500k-$2M
- **Focus**: Increase volume
- **Hook**: Consider dynamic fees

### Phase 3: Maturity (Month 6+)
- **Fee**: 1%-1.5% based on metrics
- **Target TVL**: $2M+
- **Focus**: Sustainable ecosystem
- **Hook**: Advanced features (limit orders, etc.)

---

## 📈 Success Metrics

### Monitor Weekly:
- TVL growth
- Daily/weekly volume
- Number of unique traders
- Number of LP positions
- Fee revenue generated
- EAGLE price stability

### Target Metrics (Month 1):
- TVL: $100k+
- Daily Volume: $20k+
- Unique Traders: 50+
- Active LP Positions: 20+

### Target Metrics (Month 3):
- TVL: $500k+
- Daily Volume: $100k+
- Unique Traders: 200+
- Active LP Positions: 50+

---

## 💡 Competitive Advantages

Despite higher 2% fee, EAGLE/ETH offers:

1. **Yield from Vault**: Unlike pure LP positions
2. **Cross-chain**: LayerZero integration
3. **Fee Sharing**: Hook distributes to stakers
4. **Innovation**: First [your feature] on V4
5. **Native ETH**: Gas savings vs WETH pools
6. **V4 Features**: Hooks, dynamic fees, efficiency

---

## 🎯 Key Takeaways

✅ **2% is justified** for new token launch
✅ **Attracts serious LPs** with premium rewards
✅ **Can adjust dynamically** via V4 hooks
✅ **Aligns incentives** between LPs and holders
✅ **Premium positioning** = serious protocol, not meme
✅ **Sustainable** model with clear path to maturity

---

## 📚 References

- [Uniswap V3 Fee Tiers](https://docs.uniswap.org/concepts/protocol/fees)
- [V4 Dynamic Fees](https://docs.uniswap.org/contracts/v4/guides/hooks/dynamic-fees)
- [New Token Launch Best Practices](https://gov.uniswap.org/)

---

**Decision**: **Proceed with 2% fee tier** ✅

**Rationale**: Optimal for new token launch, attracting committed LPs, with clear path to adjustment via V4 hooks.

**Next Steps**: 
1. Implement 2% in pool deployment contract
2. Design hook to share 50% of fees with stakers
3. Monitor metrics and adjust at milestones

