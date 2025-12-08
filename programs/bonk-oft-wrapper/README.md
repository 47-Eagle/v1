# BONK OFT Wrapper

A Solana program that wraps BONK tokens for LayerZero OFT (Omnichain Fungible Token) bridging.

## Overview

This wrapper allows users to deposit BONK tokens and receive wrapped BONK-OFT tokens that can be bridged across chains using LayerZero protocol.

### How It Works

1. **Deposit BONK**: Users deposit BONK tokens and receive equivalent wrapped BONK-OFT tokens
2. **Bridge**: Wrapped tokens are bridged via LayerZero OFT to other chains
3. **Withdraw**: Users can withdraw by burning wrapped tokens and receiving BONK back

### Addresses

- **BONK Token**: `9yiFPjapx5sr5UZELtmfVZK6dnMgQVfzWGL8XB6dbonk`
- **Wrapper Program**: Deployed program ID (updated after deployment)

## Build & Deploy

### Build
```bash
cd solana-layerzero
npm run build:bonk
```

### Deploy to Devnet
```bash
npm run deploy:bonk:devnet
```

### Deploy to Mainnet
```bash
npm run deploy:bonk:mainnet
```

### Initialize
```bash
# Devnet
npm run init:bonk:devnet

# Mainnet
npm run init:bonk:mainnet
```

## Usage

### Deposit BONK
Deposit BONK tokens to receive wrapped BONK-OFT tokens:

```typescript
const depositTx = await program.methods
  .deposit(amount)
  .accounts({
    config: configPda,
    bonkMint: BONK_MINT,
    wrappedMint: wrappedMint,
    bonkVault: bonkVaultPda,
    wrappedVault: wrappedVaultPda,
    bonkFrom: userBonkAccount,
    wrappedTo: userWrappedAccount,
    user: userWallet,
  })
  .rpc();
```

### Withdraw BONK
Burn wrapped tokens to receive BONK back:

```typescript
const withdrawTx = await program.methods
  .withdraw(amount)
  .accounts({
    config: configPda,
    bonkMint: BONK_MINT,
    wrappedMint: wrappedMint,
    bonkVault: bonkVaultPda,
    bonkTo: userBonkAccount,
    wrappedFrom: userWrappedAccount,
    user: userWallet,
  })
  .rpc();
```

## Integration with LayerZero

After initializing the wrapper:

1. Initialize your LayerZero OFT contract with the wrapped BONK mint
2. Set peers on other chains
3. Users can now bridge BONK across chains:
   - Deposit BONK → Get wrapped BONK-OFT
   - Bridge wrapped tokens via LayerZero
   - Withdraw on destination chain → Get BONK back

## Security

- Only the wrapper contract can mint/burn wrapped tokens
- BONK tokens are held securely in program-owned vaults
- 1:1 backing between BONK and wrapped tokens
- Emergency pause functionality

## Testing

```bash
cd solana-layerzero
anchor test
```
