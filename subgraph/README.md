# Eagle OVault Subgraph

This subgraph indexes all Eagle OVault contract events for historical data analysis and APY calculations.

## Features

- **Vault Operations**: Tracks deposits, withdrawals, and share prices
- **Strategy Events**: Monitors strategy deposits, withdrawals, and rebalances
- **Fee Collection**: Records fee harvest events from Charm Finance vaults
- **Snapshots**: Creates time-series data for TVL and APY calculations
- **Global Stats**: Aggregates protocol-wide metrics

## Prerequisites

- Node.js 18+
- The Graph CLI (`npm install -g @graphprotocol/graph-cli`)
- Contract ABIs (extracted from your contracts)

## Setup

### 1. Install Dependencies

```bash
cd subgraph
npm install
```

### 2. Extract Contract ABIs

You need to extract the ABIs from your compiled contracts. If you're using Hardhat/Foundry:

```bash
# For Hardhat (from project root)
cd ..
npx hardhat compile

# Copy ABIs to subgraph
cp artifacts/contracts/EagleOVault.sol/EagleOVault.json subgraph/abis/EagleOVault.json
cp artifacts/contracts/strategies/CharmStrategy.sol/CharmStrategy.json subgraph/abis/CharmStrategy.json

# For Foundry
forge build
jq '.abi' out/EagleOVault.sol/EagleOVault.json > subgraph/abis/EagleOVault.json
jq '.abi' out/CharmStrategy.sol/CharmStrategy.json > subgraph/abis/CharmStrategy.json
```

You'll also need the Charm Vault ABI. Create a minimal version:

```json
// subgraph/abis/CharmVault.json
[
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "sender",
        "type": "address"
      },
      {
        "indexed": false,
        "name": "shares",
        "type": "uint256"
      },
      {
        "indexed": false,
        "name": "amount0",
        "type": "uint256"
      },
      {
        "indexed": false,
        "name": "amount1",
        "type": "uint256"
      }
    ],
    "name": "Deposit",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "sender",
        "type": "address"
      },
      {
        "indexed": false,
        "name": "shares",
        "type": "uint256"
      },
      {
        "indexed": false,
        "name": "amount0",
        "type": "uint256"
      },
      {
        "indexed": false,
        "name": "amount1",
        "type": "uint256"
      }
    ],
    "name": "Withdraw",
    "type": "event"
  }
]
```

### 3. Update Start Blocks

In `subgraph.yaml`, update the `startBlock` values to your contract deployment blocks:

```yaml
# Find the blocks on Etherscan
# Main Vault: 0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953
# USD1 Strategy: 0x47B2659747d6A7E00c8251c3C3f7e92625a8cf6f
# WETH Strategy: 0x5c525Af4153B1c43f9C06c31D32a84637c617FfE

# Update all three dataSources with the correct startBlock
```

### 4. Generate Types

```bash
npm run codegen
```

This generates TypeScript types from your schema and ABIs.

### 5. Build

```bash
npm run build
```

## Deployment

### Deploy to The Graph Studio (Recommended)

1. **Create a subgraph on The Graph Studio**
   - Go to https://thegraph.com/studio/
   - Click "Create a Subgraph"
   - Name it "eagle-ovault"

2. **Authenticate**
   ```bash
   graph auth --studio <YOUR_DEPLOY_KEY>
   ```

3. **Deploy**
   ```bash
   npm run deploy
   ```

4. **Publish to The Graph Network**
   - After testing in Studio, click "Publish" in the Studio UI
   - This makes your subgraph available on the decentralized network
   - You'll get a production query URL like:
     ```
     https://gateway.thegraph.com/api/[api-key]/subgraphs/id/[subgraph-id]
     ```

### Deploy Locally (Development)

If you're running a local Graph Node:

```bash
# Start local Graph Node (separate terminal)
docker-compose up

# Create the subgraph
npm run create-local

# Deploy
npm run deploy-local
```

## Querying

Once deployed, you can query your subgraph:

```graphql
# Get vault info with latest snapshots
{
  vault(id: "0x47b3ef629d9cb8dfcf8a6c61058338f4e99d7953") {
    totalAssets
    totalSupply
    sharePrice
    snapshots(first: 10, orderBy: timestamp, orderDirection: desc) {
      timestamp
      totalAssets
      sharePrice
    }
  }
}

# Get fee collection events
{
  collectFeeEvents(first: 100, orderBy: timestamp, orderDirection: desc) {
    id
    timestamp
    amount0
    amount1
    strategy
    charmVault
  }
}

# Get daily snapshots for APY calculation
{
  dailySnapshots(first: 30, orderBy: date, orderDirection: desc) {
    date
    totalValueLocked
    dailyFees
    sharePrice
    apy
  }
}

# Get deposit history
{
  deposits(first: 10, orderBy: timestamp, orderDirection: desc) {
    timestamp
    sender
    assets
    shares
    transactionHash
  }
}
```

## Update Frontend

After deploying, update your frontend to use the new subgraph:

```typescript
// frontend/src/hooks/useAnalyticsData.ts
const SUBGRAPH_URL = 'https://gateway.thegraph.com/api/[your-api-key]/subgraphs/id/[your-subgraph-id]'

// Replace the fetch calls in VaultView.tsx, useAnalyticsData.ts, etc.
```

## Development

### Testing Queries Locally

You can test queries using the GraphiQL interface:

- **Studio**: https://thegraph.com/studio/subgraph/eagle-ovault/
- **Local**: http://localhost:8000/subgraphs/name/eagle-ovault

### Updating the Subgraph

1. Make changes to `schema.graphql` or `src/mapping.ts`
2. Run `npm run codegen`
3. Run `npm run build`
4. Deploy with `npm run deploy`

### Debugging

Check subgraph logs in The Graph Studio or locally:

```bash
# Local logs
docker logs graph-node

# Studio logs available in the Studio UI
```

## Schema Overview

### Main Entities

- **Vault**: Main vault state (totalAssets, totalSupply, sharePrice)
- **VaultSnapshot**: Time-series snapshots of vault state
- **CollectFeeEvent**: Fee harvest events from strategies
- **Deposit**: User deposit events
- **Withdrawal**: User withdrawal events
- **Rebalance**: Strategy rebalance events
- **DailySnapshot**: Daily aggregated metrics

### Relationships

```
Vault 1-* VaultSnapshot
Vault 1-* CollectFeeEvent
Vault 1-* Deposit
Vault 1-* Withdrawal
Vault 1-* Rebalance
GlobalStats 1-* DailySnapshot
```

## Calculating APY

With the subgraph data, you can calculate accurate APY:

```typescript
// Example: Calculate 7-day APY from fee events
const feeEvents = await fetchFeeEvents(last7Days)
const totalFees = feeEvents.reduce((sum, e) => sum + e.amount0 + e.amount1, 0)
const averageTVL = await fetchAverageTVL(last7Days)

const weeklyReturn = totalFees / averageTVL
const annualizedReturn = weeklyReturn * 52
const apy = (Math.pow(1 + weeklyReturn, 52) - 1) * 100
```

## Troubleshooting

### Common Issues

1. **"Failed to compile data source"**
   - Run `npm run codegen` after any schema changes
   - Ensure ABIs are in the correct format

2. **"Deployment failed"**
   - Check that start blocks are correct
   - Verify contract addresses match mainnet

3. **"No data appearing"**
   - Wait for indexing to catch up (can take 5-30 minutes)
   - Check that events are actually being emitted on-chain

### Getting Help

- [The Graph Discord](https://discord.gg/graphprotocol)
- [The Graph Docs](https://thegraph.com/docs/)
- Check subgraph logs for detailed error messages

## License

MIT


