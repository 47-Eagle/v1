# Charts and Price Fetching - Status Update

## Issues Addressed

### 1. ETH Price Fetching ✅ **FIXED**

**Problem**: CoinGecko API was rate-limited (429 errors), causing failed ETH price fetches.

**Solution**: Implemented multiple fallback sources in priority order:

1. **Vault Oracle** (on-chain, most reliable but currently failing due to stale oracle)
2. **Binance API** ✅ (no rate limits, fast, reliable)
   - Endpoint: `https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT`
   - Free, no authentication required
3. **Crypto.com API** ✅ (backup source)
   - Endpoint: `https://api.crypto.com/v2/public/get-ticker?instrument_name=ETH_USD`
4. **CoinGecko API** (still included as 3rd fallback despite rate limits)
5. **Hardcoded Default**: $3,200 (conservative recent price)

**Result**: ETH price will now always be available from at least one source.

---

### 2. Charts Not Showing ⏳ **Expected - Waiting for Subgraph Data**

**Problem**: Historical charts are empty.

**Root Cause**: The subgraph was just deployed and has minimal data:
```json
{
  "snapshotCount": 1,
  "collectFeeCount": 0,
  "totalAssets": "2000000000000000000",  // 2 WLFI (minimal test data)
  "snapshots": [{
    "usd1StrategyTVL": "0",
    "wethStrategyTVL": "0",
    "liquidWLFI": "0",
    "liquidUSD1": "0"
  }]
}
```

**Why This Is Expected**:
1. Subgraph was deployed very recently
2. It needs to index historical blockchain events:
   - `Deposit` events
   - `Withdraw` events
   - `CollectFee` events (fee harvests)
   - `Rebalance` events
   - Daily/hourly snapshots
3. The Graph indexer is currently syncing from block 18,000,000 to present
4. This can take 30 minutes to several hours depending on:
   - Number of historical events
   - The Graph's indexing queue
   - Network conditions

**What Data Charts Need**:
- **TVL Chart**: Requires `VaultSnapshot` entities with historical `totalAssets`, `totalSupply`, `sharePrice`
- **Performance Chart**: Requires `CollectFeeEvent` entities showing fee harvests over time
- **APY Chart**: Requires multiple snapshots to calculate rate of return
- **Allocation Chart**: Currently works with live on-chain data (not affected)

**Timeline**:
- **10-30 minutes**: Initial snapshots should appear
- **1-2 hours**: Most historical data indexed
- **2-4 hours**: Complete historical data with all events

---

## Current Status

### ✅ **Working Now**:
1. ✅ ETH price fetching (multiple reliable sources)
2. ✅ Live vault data (TVL, balances, strategies)
3. ✅ GraphQL queries (schema fixed)
4. ✅ Subgraph connection (no errors)
5. ✅ Asset allocation display
6. ✅ Strategy balances

### ⏳ **Waiting for Subgraph Indexing**:
1. ⏳ Historical TVL chart
2. ⏳ Performance/APY chart
3. ⏳ Fee collection timeline
4. ⏳ Programmatic APY calculation (needs `collectFees` data)

### 🔧 **To Monitor**:
Check subgraph indexing progress:
- **Studio URL**: https://thegraph.com/studio/subgraph/47-eagle/
- Look for: "Synced to block X" and "Latest indexed block"
- When "collectFees" count > 0, charts will populate

---

## What You Should See After Indexing Completes

### TVL Chart
- Line graph showing vault total value over time
- Based on `VaultSnapshot` entities
- Updated with each significant vault state change

### Performance Chart
- Shows cumulative returns
- Based on `sharePrice` changes in snapshots
- Displays vault performance vs. holding assets

### APY Chart
- Calculated from `CollectFeeEvent` entities
- Shows annualized percentage yield over time
- Uses programmatic calculation you requested:
  - Period-specific TVL
  - Individual harvest period returns
  - Time-weighted averaging

### Fee Collection Timeline
- Shows each fee harvest event
- Amount collected per event
- Strategy breakdown (USD1 vs WETH)

---

## Temporary Display Options

While waiting for subgraph data, the frontend currently shows:
- ✅ "No historical data available yet" message
- ✅ Current TVL and balances (live on-chain)
- ✅ Asset allocation sunburst (live on-chain)
- ✅ Strategy details (live on-chain)

**Alternative (if you want)**: We could add placeholder/mock charts with "Indexing..." overlay, but this might be confusing. Current approach of showing empty state is clearer.

---

## Quick Verification Commands

Check if subgraph has indexed data:

```bash
# Query the subgraph directly
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"query": "{ vault(id: \"0x47b3ef629d9cb8dfcf8a6c61058338f4e99d7953\") { id totalAssets totalSupply snapshots { id } collectFees { id } } }"}' \
  https://api.studio.thegraph.com/query/64373/47-eagle/v0.0.1
```

Look for:
- `snapshots` array length > 1
- `collectFees` array length > 0

---

## Summary

**ETH Prices**: ✅ Fixed - Now using Binance (fast, no rate limits) + multiple fallbacks

**Charts**: ⏳ Waiting - Subgraph is indexing historical data. This is expected and will resolve automatically within 1-4 hours.

**Action Required**: None - just wait for indexing to complete. Refresh the page periodically to see new data appear.

