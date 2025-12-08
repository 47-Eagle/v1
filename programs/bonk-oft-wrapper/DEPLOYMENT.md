# BONK LayerZero Bridge - Deployment Guide

This guide explains how to deploy and set up the BONK wrapper contract for LayerZero bridging.

## Architecture Overview

```
User BONK → BONK Wrapper → Wrapped BONK-OFT → LayerZero Bridge → Other Chains
```

1. **BONK Wrapper**: Locks BONK, mints wrapped BONK-OFT tokens
2. **LayerZero OFT**: Bridges wrapped tokens across chains
3. **Destination Wrapper**: Burns wrapped tokens, returns BONK

## Prerequisites

- Solana CLI installed
- Anchor framework installed
- BONK tokens in wallet (for testing)
- Sufficient SOL for deployment (~2-3 SOL)

## Step 1: Build Contracts

```bash
cd solana-layerzero

# Build both contracts
npm run build

# Or build BONK wrapper specifically
npm run build:bonk
```

## Step 2: Deploy BONK Wrapper

### Devnet Deployment
```bash
npm run deploy:bonk:devnet
```

### Mainnet Deployment
```bash
npm run deploy:bonk:mainnet
```

**Note**: Update the program ID in `Anchor.toml` and scripts after deployment.

## Step 3: Initialize BONK Wrapper

### Devnet
```bash
npm run init:bonk:devnet
```

### Mainnet
```bash
npm run init:bonk:mainnet
```

This creates:
- Wrapped BONK-OFT token mint
- BONK vault (holds deposited BONK)
- Wrapped token vault
- Configuration PDA

## Step 4: Deploy LayerZero OFT Contract

```bash
# Deploy OFT contract
npm run deploy:mainnet

# Initialize with wrapped BONK mint
npm run integrate:bonk:mainnet
```

## Step 5: Set Up Cross-Chain Peers

Set peers on destination chains (Ethereum, Base, etc.):

```bash
# Set Ethereum peer
npm run set-peer:mainnet

# Configure for specific chains as needed
```

## Testing the Bridge

### 1. Deposit BONK
```typescript
// User deposits 100 BONK
const depositTx = await bonkWrapper.methods
  .deposit(new BN(100 * 1e5)) // BONK has 5 decimals
  .accounts({ ... })
  .rpc();
```

### 2. Bridge Wrapped BONK-OFT
```typescript
// Bridge to Ethereum
const bridgeTx = await oft.methods
  .send(sendParam)
  .accounts({ ... })
  .rpc();
```

### 3. Withdraw BONK on Destination
```typescript
// Burn wrapped tokens, receive BONK
const withdrawTx = await destinationWrapper.methods
  .withdraw(amount)
  .rpc();
```

## File Structure

```
programs/
├── bonk-oft-wrapper/           # BONK wrapper contract
│   ├── src/lib.rs             # Main contract logic
│   ├── Cargo.toml             # Dependencies
│   └── README.md              # Contract documentation
└── eagle-oft-layerzero/       # LayerZero OFT contract
    └── src/lib.rs

solana-layerzero/
├── scripts/
│   ├── initialize-bonk-devnet.ts
│   ├── initialize-bonk-mainnet.ts
│   └── integrate-bonk-oft.ts    # Integration script
├── Anchor.toml                 # Program configurations
└── package.json               # Build scripts
```

## Addresses (After Deployment)

### BONK Wrapper
- **Program ID**: [Update after deployment]
- **BONK Mint**: `9yiFPjapx5sr5UZELtmfVZK6dnMgQVfzWGL8XB6dbonk`
- **Wrapped Mint**: [Generated during initialization]
- **Config PDA**: [Derived from program ID]

### LayerZero OFT
- **Program ID**: `EjpziSWGRcEiDHLXft5etbUtcJiZxEttkwz1tqiuzzWU`
- **OFT Config**: [Derived from program ID]

## Security Features

- ✅ 1:1 BONK to wrapped token backing
- ✅ Only wrapper can mint/burn wrapped tokens
- ✅ Emergency pause functionality
- ✅ Program-owned vaults secure token storage
- ✅ Admin controls for maintenance

## Cost Breakdown

- **BONK Wrapper Deployment**: ~1.5 SOL
- **OFT-LayerZero Integration**: ~0.5 SOL
- **Cross-chain Setup**: ~0.5 SOL per chain
- **Total Initial Setup**: ~2.5-3 SOL

## Monitoring

After deployment, monitor:
- Wrapper contract events (Deposit/Withdraw)
- OFT contract events (Send/Receive)
- Vault balances
- Cross-chain transaction success

## Troubleshooting

### Common Issues

1. **Insufficient SOL**: Ensure 2-3 SOL in wallet
2. **Program ID Mismatch**: Update all scripts after deployment
3. **Peer Not Set**: Configure destination chain peers
4. **Token Decimals**: BONK uses 5 decimals, confirm in scripts

### Recovery

- **Lost Private Key**: Program remains functional
- **Deployment Failed**: Retry with more SOL
- **Peer Misconfiguration**: Update peer addresses

## Support

For issues:
1. Check program logs on Solana Explorer
2. Verify wallet balance and permissions
3. Test on devnet first
4. Check LayerZero endpoint status
