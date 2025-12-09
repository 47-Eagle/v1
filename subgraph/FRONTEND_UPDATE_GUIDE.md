# Frontend Update Guide

After deploying your subgraph, update these files to use your new Eagle OVault subgraph.

## 🔑 Your New Endpoint

After deployment, you'll get a URL like:
```
https://gateway.thegraph.com/api/[YOUR-API-KEY]/subgraphs/id/[YOUR-SUBGRAPH-ID]
```

Save this - you'll need it!

## 📝 Files to Update

### 1. `frontend/src/components/VaultView.tsx`

**Location**: Lines ~2445-2450

**Find:**
```typescript
const response = await fetch('https://gateway.thegraph.com/api/23287d0cdcd712e0d3e3fd9bb0b5f5e4/subgraphs/id/9fWsevEC9Yz4WdW9QyUvu2JXsxyXAxc1X4HaEkmyyc75', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer 23287d0cdcd712e0d3e3fd9bb0b5f5e4'
  },
```

**Replace with:**
```typescript
const response = await fetch('https://gateway.thegraph.com/api/[YOUR-API-KEY]/subgraphs/id/[YOUR-SUBGRAPH-ID]', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer [YOUR-API-KEY]'
  },
```

### 2. Update the GraphQL Query

**Same file, line ~2360**

The query structure changes slightly. **Find:**
```typescript
const query = `
  query GetVaultData($usd1VaultId: ID!, $wethVaultId: ID!) {
    vault(id: $usd1VaultId) {
      # ... old Charm Finance schema
    }
  }
`;
```

**Replace with:**
```typescript
const query = `
  query GetVaultData {
    vault(id: "0x47b3ef629d9cb8dfcf8a6c61058338f4e99d7953") {
      totalAssets
      totalSupply
      sharePrice
      snapshots(first: 168, orderBy: timestamp, orderDirection: desc) {
        timestamp
        totalAssets
        sharePrice
        usd1StrategyTVL
        wethStrategyTVL
      }
      collectFees(first: 200, orderBy: timestamp, orderDirection: desc) {
        timestamp
        amount0
        amount1
        strategy
        charmVault
      }
    }
    dailySnapshots(first: 30, orderBy: date, orderDirection: desc) {
      date
      totalValueLocked
      dailyFees
      sharePrice
    }
  }
`;
```

### 3. `frontend/src/hooks/useAnalyticsData.ts`

**Find:**
```typescript
const GRAPHQL_ENDPOINT = 'https://gateway.thegraph.com/api/23287d0cdcd712e0d3e3fd9bb0b5f5e4/subgraphs/id/9fWsevEC9Yz4WdW9QyUvu2JXsxyXAxc1X4HaEkmyyc75';
```

**Replace:**
```typescript
const GRAPHQL_ENDPOINT = 'https://gateway.thegraph.com/api/[YOUR-API-KEY]/subgraphs/id/[YOUR-SUBGRAPH-ID]';
```

### 4. `frontend/src/hooks/useCharmVaultData.ts`

Same replacement as above.

### 5. `frontend/src/components/VaultVisualization.tsx`

Same replacement as above.

## 🔄 Alternative: Environment Variable (Recommended)

Instead of hardcoding, use an environment variable:

### Create `.env.local` in frontend:

```bash
VITE_SUBGRAPH_URL=https://gateway.thegraph.com/api/[YOUR-API-KEY]/subgraphs/id/[YOUR-SUBGRAPH-ID]
VITE_SUBGRAPH_API_KEY=[YOUR-API-KEY]
```

### Update code to use env vars:

```typescript
const SUBGRAPH_URL = import.meta.env.VITE_SUBGRAPH_URL || 'fallback-url';
const API_KEY = import.meta.env.VITE_SUBGRAPH_API_KEY || '';

const response = await fetch(SUBGRAPH_URL, {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`
  },
  body: JSON.stringify({ query })
});
```

## 🧪 Testing After Update

1. **Clear browser cache** (hard refresh: Ctrl+Shift+R)
2. **Open DevTools** console
3. **Look for** these log messages:
   ```
   [fetchCharmStats] Querying Eagle Ovault subgraph...
   [fetchCharmStats] Raw API response: {"data":{"vault":{...}}}
   ✅ Should show actual data, not errors!
   ```
4. **Check APY display**: Should show calculated value, not 10.52%

## 📊 Query Examples for Your New Subgraph

### Get Vault State
```graphql
{
  vault(id: "0x47b3ef629d9cb8dfcf8a6c61058338f4e99d7953") {
    totalAssets
    sharePrice
  }
}
```

### Get Last 100 Fee Events
```graphql
{
  collectFeeEvents(first: 100, orderBy: timestamp, orderDirection: desc) {
    timestamp
    amount0
    amount1
    strategy
  }
}
```

### Get 7 Days of Snapshots  
```graphql
{
  vaultSnapshots(
    first: 168
    orderBy: timestamp
    orderDirection: desc
  ) {
    timestamp
    totalAssets
    sharePrice
  }
}
```

## ⚠️ Important Notes

1. **Lowercase addresses**: The subgraph stores addresses as lowercase. Always query with lowercase:
   ```
   ✅ "0x47b3ef629d9cb8dfcf8a6c61058338f4e99d7953"
   ❌ "0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953"
   ```

2. **Authorization header**: Include your API key in the Authorization header

3. **Error handling**: Keep fallback logic for when subgraph is unavailable

## 🎯 Expected Results

After updating the frontend:

- **APY**: Will show actual calculated value (likely 40-50% as you expected)
- **Historical chart**: Will display real TVL over time
- **Fee events**: Will show in analytics
- **Console**: No more "Type Query has no field vault" errors

## 📞 Need Help?

- Check `subgraph/DEPLOY_NOW.md` for deployment steps
- Check `subgraph/DEPLOYMENT_GUIDE.md` for troubleshooting
- The Graph Discord: https://discord.gg/graphprotocol

---

**The subgraph is ready - just deploy it and update the frontend URLs!** 🚀

