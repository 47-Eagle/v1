# Eagle OVault Subgraph Deployment Guide

Complete step-by-step guide to deploy your Eagle OVault subgraph.

## 📋 Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] npm or pnpm package manager
- [ ] The Graph account (https://thegraph.com/studio/)
- [ ] Contract ABIs extracted
- [ ] Deployment block numbers identified

## Step 1: Install The Graph CLI

```bash
npm install -g @graphprotocol/graph-cli

# Verify installation
graph --version
```

## Step 2: Extract Contract ABIs

### Option A: Using the Helper Script (Recommended)

```bash
cd subgraph
./scripts/extract-abis.sh
```

Follow the prompts to extract ABIs from your compiled contracts.

### Option B: Manual Extraction from Etherscan

If your contracts are verified on Etherscan:

1. **EagleOVault**:
   - Go to: https://etherscan.io/address/0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953#code
   - Click "Contract" tab
   - Scroll to "Contract ABI"
   - Click "Copy ABI to clipboard"
   - Save to `subgraph/abis/EagleOVault.json`

2. **CharmStrategy** (USD1):
   - Go to: https://etherscan.io/address/0x47B2659747d6A7E00c8251c3C3f7e92625a8cf6f#code
   - Follow same steps
   - Save to `subgraph/abis/CharmStrategy.json`

3. **CharmVault**:
   - Already provided in `subgraph/abis/CharmVault.json`

### Option C: From Compiled Contracts

If you have the contract source:

```bash
cd .. # Go to project root

# Using Hardhat
npx hardhat compile
jq '.abi' artifacts/contracts/EagleOVault.sol/EagleOVault.json > subgraph/abis/EagleOVault.json
jq '.abi' artifacts/contracts/strategies/CharmStrategy.sol/CharmStrategy.json > subgraph/abis/CharmStrategy.json

# Using Foundry
forge build
jq '.abi' out/EagleOVault.sol/EagleOVault.json > subgraph/abis/EagleOVault.json
jq '.abi' out/CharmStrategy.sol/CharmStrategy.json > subgraph/abis/CharmStrategy.json
```

## Step 3: Find Deployment Block Numbers

Go to Etherscan and find the deployment transaction for each contract:

1. **EagleOVault** (0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953):
   - https://etherscan.io/address/0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953
   - Look for "Contract Creation" transaction
   - Note the block number

2. **USD1 Strategy** (0x47B2659747d6A7E00c8251c3C3f7e92625a8cf6f):
   - Same process

3. **WETH Strategy** (0x5c525Af4153B1c43f9C06c31D32a84637c617FfE):
   - Same process

Update `subgraph/subgraph.yaml` with these block numbers (search for `startBlock`).

## Step 4: Install Dependencies

```bash
cd subgraph
npm install
```

## Step 5: Generate TypeScript Types

```bash
npm run codegen
```

This will:
- Generate TypeScript types from `schema.graphql`
- Generate types from ABIs
- Create files in `generated/` directory

**Expected output:**
```
✔ Generate types for data source templates
✔ Generate types for data sources
✔ Generate types from contract ABIs
✔ Load GraphQL schema from schema.graphql
✔ Write types to generated/schema.ts
```

## Step 6: Build the Subgraph

```bash
npm run build
```

This compiles your TypeScript mappings to WebAssembly.

**Expected output:**
```
✔ Compile subgraph
✔ Write compiled subgraph to build/
```

## Step 7: Deploy to The Graph Studio

### 7.1: Create Your Subgraph

1. Go to https://thegraph.com/studio/
2. Click "Create a Subgraph"
3. Name it: `eagle-ovault`
4. Select network: `Ethereum Mainnet`

### 7.2: Get Your Deploy Key

1. In Studio, click on your subgraph
2. Copy the "Deploy Key" shown at the top
3. It looks like: `a1b2c3d4e5f6...`

### 7.3: Authenticate

```bash
graph auth --studio <YOUR_DEPLOY_KEY>
```

Replace `<YOUR_DEPLOY_KEY>` with your actual key.

### 7.4: Deploy

```bash
npm run deploy
```

Or manually:

```bash
graph deploy --studio eagle-ovault
```

**Expected output:**
```
✔ Version Label (e.g. v0.0.1) · v0.0.1
✔ Build subgraph
✔ Upload subgraph to IPFS

Build completed: QmXYZ...

Deployed to https://thegraph.com/studio/subgraph/eagle-ovault/

Subgraph endpoints:
Queries (HTTP):     https://api.studio.thegraph.com/query/<id>/eagle-ovault/v0.0.1
```

## Step 8: Wait for Indexing

The subgraph needs to sync with the blockchain:

1. Go to your subgraph in Studio
2. Check the "Indexing Status" section
3. Wait for "Synced" status (can take 5-30 minutes)

**Indexing Progress:**
- Current Block: Shows current progress
- Target Block: Latest blockchain block
- % Synced: Completion percentage

## Step 9: Test Queries

Once synced, test your subgraph in the Studio Playground:

### Test Query 1: Get Vault Info

```graphql
{
  vault(id: "0x47b3ef629d9cb8dfcf8a6c61058338f4e99d7953") {
    totalAssets
    totalSupply
    sharePrice
    createdAt
    updatedAt
  }
}
```

### Test Query 2: Recent Deposits

```graphql
{
  deposits(first: 5, orderBy: timestamp, orderDirection: desc) {
    timestamp
    sender
    assets
    shares
    transactionHash
  }
}
```

### Test Query 3: Fee Events

```graphql
{
  collectFeeEvents(first: 10, orderBy: timestamp, orderDirection: desc) {
    timestamp
    amount0
    amount1
    strategy
    charmVault
  }
}
```

### Test Query 4: Daily Snapshots for APY

```graphql
{
  dailySnapshots(first: 30, orderBy: date, orderDirection: desc) {
    date
    totalValueLocked
    dailyFees
    sharePrice
  }
}
```

## Step 10: Publish to Decentralized Network

Once tested in Studio:

1. Click "Publish" button in Studio UI
2. Select version: `v0.0.1`
3. Add curation signal (optional, helps with discovery)
4. Confirm transaction in your wallet

Your subgraph will be deployed to the decentralized network!

**Production Query URL:**
```
https://gateway.thegraph.com/api/[api-key]/subgraphs/id/[subgraph-id]
```

Save this URL - you'll need it for the frontend!

## Step 11: Update Frontend

Update your frontend to use the new subgraph:

### File: `frontend/src/components/VaultView.tsx`

Find the `fetchCharmStats` function and replace the GraphQL endpoint:

```typescript
// OLD (was using Charm Finance subgraph)
const response = await fetch('https://gateway.thegraph.com/api/[old-key]/subgraphs/id/[old-id]', {

// NEW (your Eagle OVault subgraph)
const response = await fetch('https://gateway.thegraph.com/api/[YOUR-API-KEY]/subgraphs/id/[YOUR-SUBGRAPH-ID]', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer [YOUR-API-KEY]'
  },
  body: JSON.stringify({ query })
});
```

### Update the GraphQL Queries

Replace the query in `fetchCharmStats` with:

```typescript
const query = `
  query GetVaultData($vaultId: ID!) {
    vault(id: $vaultId) {
      totalAssets
      totalSupply
      sharePrice
      snapshots(first: 100, orderBy: timestamp, orderDirection: desc) {
        timestamp
        totalAssets
        sharePrice
        usd1StrategyTVL
        wethStrategyTVL
      }
      collectFees(first: 100, orderBy: timestamp, orderDirection: desc) {
        timestamp
        amount0
        amount1
        strategy
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

## Troubleshooting

### Build Fails

**Error:** `Cannot find module '@graphprotocol/graph-ts'`

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Codegen Fails

**Error:** `Schema file not found`

**Solution:**
Make sure you're in the `subgraph/` directory:
```bash
cd subgraph
npm run codegen
```

### Deploy Fails: "Authentication failed"

**Solution:**
```bash
# Re-authenticate with your deploy key
graph auth --studio <YOUR_DEPLOY_KEY>
```

### No Data After Deployment

**Possible causes:**
1. **Still indexing**: Wait 10-30 minutes, check status in Studio
2. **Wrong start block**: The block is too recent, no events to index yet
3. **Contract address mismatch**: Verify addresses in `subgraph.yaml`

**Check logs in Studio:**
- Go to your subgraph
- Click "Logs" tab
- Look for errors

### Indexing Failed

**Error:** `no matching events`

**Solution:**
- Verify start blocks are correct
- Ensure contracts have emitted events after start block
- Check that contract addresses are lowercase in `subgraph.yaml`

### Query Returns Null

**Possible causes:**
1. **Entity ID mismatch**: Vault ID must be lowercase address
2. **Not fully synced**: Wait for indexing to complete
3. **No data yet**: Contracts haven't emitted any events

**Try:**
```graphql
{
  # Query all vaults to see what IDs exist
  vaults {
    id
    totalAssets
  }
}
```

## Next Steps

1. **Monitor indexing**: Check Studio dashboard regularly
2. **Test all queries**: Verify data accuracy
3. **Update frontend**: Integrate new subgraph endpoints
4. **Calculate APY**: Use historical fee data for accurate APY
5. **Set up alerts**: Monitor for indexing errors

## Getting Help

- **The Graph Discord**: https://discord.gg/graphprotocol
- **Documentation**: https://thegraph.com/docs/
- **Studio Support**: support@thegraph.com

## Useful Commands

```bash
# View subgraph info
graph info eagle-ovault

# Check auth status
cat ~/.graph/auth.json

# Deploy specific version
graph deploy --studio eagle-ovault --version-label v0.0.2

# Deploy to local node (development)
graph deploy --node http://localhost:8020/ eagle-ovault
```

## Success Checklist

- [ ] ABIs extracted and placed in `subgraph/abis/`
- [ ] Start blocks updated in `subgraph.yaml`
- [ ] `npm run codegen` successful
- [ ] `npm run build` successful
- [ ] Deployed to Studio
- [ ] Indexing completed (100% synced)
- [ ] Test queries return data
- [ ] Published to decentralized network
- [ ] Frontend updated with new endpoint
- [ ] APY calculation working with historical data

Congratulations! Your Eagle OVault subgraph is now live! 🎉


