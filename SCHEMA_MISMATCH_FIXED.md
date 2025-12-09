# Schema Mismatch Fixed ✅

## Problem
The frontend GraphQL queries were using field names that didn't match the actual deployed subgraph schema, resulting in 8 GraphQL errors:

```
Type `Vault` has no field `totalShares`
Type `Vault` has no field `createdAtTimestamp`
Type `VaultSnapshot` has no field `blockNumber`
Type `VaultSnapshot` has no field `totalShares`
Type `VaultSnapshot` has no field `pricePerShare`
Type `VaultSnapshot` has no field `strategyUSD1TotalAssets`
Type `VaultSnapshot` has no field `strategyWETHTotalAssets`
Type `Vault` has no field `feeHarvests`
```

## Root Cause
The deployed subgraph at `https://api.studio.thegraph.com/query/64373/47-eagle/v0.0.1` uses a different schema than what we initially created. The actual deployed schema (from `/subgraph/schema.graphql`) uses:

### Actual Deployed Schema:
**Vault Entity:**
- ✅ `totalSupply` (not `totalShares`)
- ✅ `sharePrice` (not `pricePerShare`)
- ✅ `collectFees` (not `feeHarvests`)
- ✅ `createdAt` (not `createdAtTimestamp`)
- ✅ `updatedAt`

**VaultSnapshot Entity:**
- ✅ `totalSupply` (not `totalShares`)
- ✅ `sharePrice` (not `pricePerShare`)
- ✅ `usd1StrategyTVL` (not `strategyUSD1TotalAssets`)
- ✅ `wethStrategyTVL` (not `strategyWETHTotalAssets`)
- ✅ `liquidWLFI`
- ✅ `liquidUSD1`
- ❌ No `blockNumber` field

**CollectFeeEvent Entity:**
- ✅ `strategy` (strategy contract address)
- ✅ `charmVault` (charm vault address)
- ✅ `amount0` (token0 amount)
- ✅ `amount1` (token1 amount)
- ✅ `timestamp`
- ✅ `blockNumber`
- ✅ `transactionHash`

## Solution
Updated all GraphQL queries in `VaultView.tsx` to match the actual deployed schema:

### Updated Query in `fetchCharmStats`:

```graphql
query GetEagleVault($vaultAddress: ID!) {
  vault(id: $vaultAddress) { 
    id
    totalAssets
    totalSupply          # Changed from totalShares
    sharePrice           # Changed from pricePerShare (only at vault level)
    createdAt            # Changed from createdAtTimestamp
    updatedAt
    snapshots(orderBy: timestamp, orderDirection: desc, first: 168) {
      id
      timestamp
      totalAssets
      totalSupply        # Changed from totalShares
      sharePrice         # Changed from pricePerShare
      usd1StrategyTVL    # Changed from strategyUSD1TotalAssets
      wethStrategyTVL    # Changed from strategyWETHTotalAssets
      liquidWLFI
      liquidUSD1
    }
    collectFees(orderBy: timestamp, orderDirection: desc, first: 200) {
      id
      timestamp
      blockNumber
      strategy
      charmVault
      amount0
      amount1
      transactionHash
    }
  }
}
```

### Updated Query in `fetchCharmVaultData`:

```graphql
query GetVault($address: ID!) {
  vault(id: $address) {
    id
    totalAssets
    totalSupply          # Changed from totalShares
    sharePrice           # Changed from pricePerShare
    snapshots(orderBy: timestamp, orderDirection: asc, first: 1000) {
      timestamp
      totalAssets
      totalSupply        # Changed from totalShares
      sharePrice         # Changed from pricePerShare
    }
  }
}
```

### Updated Response Processing:

```typescript
// Changed variable names to match schema
const allCollectFees = eagleVault.collectFees || [];  // was allFeeHarvests

// Updated field references in logs
totalSupply: eagleVault.totalSupply  // was totalShares

// Updated snapshot mapping
historicalSnapshots: allSnapshots.map((s: any) => ({
  timestamp: parseInt(s.timestamp),
  totalAssets: s.totalAssets,
  totalSupply: s.totalSupply,      // was totalShares
  sharePrice: s.sharePrice         // was pricePerShare
}))
```

## Files Modified
- ✅ `/home/akitav2/projects/blockchain/eagle-ovault-clean/frontend/src/components/VaultView.tsx`
  - Updated `fetchCharmStats` query (lines ~1566-1598)
  - Updated `fetchCharmVaultData` query (lines ~53-68)
  - Updated response processing (lines ~1659-1668, ~1804-1810, ~1820-1833)

## Result
- ✅ All 8 GraphQL errors resolved
- ✅ Queries now match the actual deployed schema
- ✅ Subgraph data should now load correctly
- ✅ Frontend will receive proper data structure

## Current Status
The frontend should now successfully query the subgraph. Once the subgraph has indexed sufficient data (deposits, collectFees events, snapshots), the APY calculation can be implemented using:

1. **collectFees events**: For tracking fee harvests
   - `amount0` and `amount1` for fee amounts
   - `strategy` and `charmVault` for identifying which strategy
   - `timestamp` for period-specific calculations

2. **snapshots**: For historical TVL data
   - `totalSupply` and `sharePrice` for calculating total value
   - `usd1StrategyTVL` and `wethStrategyTVL` for strategy-specific TVL
   - `liquidWLFI` and `liquidUSD1` for vault liquid balances

## Next Steps
1. ✅ Schema mismatch fixed
2. ⏳ Wait for subgraph to index historical data
3. ⏳ Implement APY calculation using `collectFees` events
4. ⏳ Use period-specific TVL from snapshots for accurate APR/APY

## Deployed Subgraph Info
- **Endpoint**: `https://api.studio.thegraph.com/query/64373/47-eagle/v0.0.1`
- **Studio URL**: `https://thegraph.com/studio/subgraph/47-eagle/`
- **Network**: Ethereum Mainnet
- **Status**: ✅ Deployed and syncing

