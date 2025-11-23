# Solana Registry Deployment Guide

## Quick Deployment Checklist

This guide will walk you through deploying the Eagle Registry Solana program from scratch.

## Prerequisites

### System Requirements
- Linux, macOS, or WSL2
- 8GB+ RAM
- 20GB+ free disk space
- Stable internet connection

### Required Tools
- Rust 1.75+
- Solana CLI 1.18+
- Anchor 0.30+
- Node.js 18+
- Yarn or npm

## Step 1: Install System Dependencies

### Ubuntu/Debian/WSL
```bash
sudo apt-get update
sudo apt-get install -y build-essential pkg-config libssl-dev libudev-dev
```

### macOS
```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install openssl pkg-config
```

## Step 2: Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
rustc --version
```

## Step 3: Install Solana CLI

```bash
sh -c "$(curl -sSfL https://release.solana.com/v1.18.22/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
solana --version
```

## Step 4: Install Anchor

```bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install 0.30.1
avm use 0.30.1
anchor --version
```

## Step 5: Configure Solana CLI

### For Devnet

```bash
# Set cluster to devnet
solana config set --url https://api.devnet.solana.com

# Generate a new keypair (or use existing)
solana-keygen new --outfile ~/.config/solana/id.json

# Check your address
solana address

# Airdrop devnet SOL
solana airdrop 2
solana balance
```

### For Mainnet

```bash
# Set cluster to mainnet
solana config set --url https://api.mainnet-beta.solana.com

# IMPORTANT: Use your secure production keypair
# Transfer 2-5 SOL to your wallet for deployment costs
solana balance
```

## Step 6: Build the Program

```bash
cd /path/to/eagle-ovault-clean

# Build the program
anchor build

# This will generate:
# - target/deploy/eagle_registry_solana.so (program binary)
# - target/idl/eagle_registry_solana.json (IDL)
# - A program ID in target/deploy/eagle_registry_solana-keypair.json
```

## Step 7: Get Your Program ID

```bash
# Get the program ID
solana address -k target/deploy/eagle_registry_solana-keypair.json

# Copy this address
```

## Step 8: Update Program ID

Update the program ID in TWO places:

### 1. Anchor.toml
```toml
[programs.devnet]
eagle_registry_solana = "YOUR_PROGRAM_ID_HERE"

[programs.mainnet]
eagle_registry_solana = "YOUR_PROGRAM_ID_HERE"
```

### 2. programs/eagle-registry-solana/src/lib.rs
```rust
declare_id!("YOUR_PROGRAM_ID_HERE");
```

## Step 9: Rebuild with Correct Program ID

```bash
anchor build
```

## Step 10: Deploy to Devnet

```bash
# Deploy the program
anchor deploy --provider.cluster devnet

# Expected output:
# Program Id: YOUR_PROGRAM_ID
# Deployed to: https://explorer.solana.com/address/YOUR_PROGRAM_ID?cluster=devnet
```

## Step 11: Initialize the Registry

```bash
cd solana-sdk

# Install dependencies
yarn install

# Set environment
export SOLANA_CLUSTER=devnet
export SOLANA_DEVNET_RPC=https://api.devnet.solana.com

# Run deployment script
ts-node ../scripts/solana/deploy-devnet.ts
```

Expected output:
```
🚀 Deploying Eagle Registry to Solana Devnet

Deployer: YOUR_WALLET_ADDRESS
Balance: 2.0 SOL

Program ID: YOUR_PROGRAM_ID

📝 Initializing registry...

✅ Registry initialized!
Transaction: https://explorer.solana.com/tx/TX_HASH?cluster=devnet
Registry PDA: REGISTRY_PDA_ADDRESS

📊 Registry Config:
  Authority: YOUR_WALLET_ADDRESS
  Solana EID: 40168
  WSOL: So11111111111111111111111111111111111111112
  LZ Endpoint: LAYERZERO_ENDPOINT_ADDRESS
  Active: true

✨ Deployment complete!
```

## Step 12: Configure Peer Chains

```bash
# Register all 7 EVM chains as peers
ts-node ../scripts/solana/configure-peers.ts
```

Expected output:
```
🔗 Configuring EVM peer chains in Solana registry

Authority: YOUR_WALLET_ADDRESS
Cluster: Devnet
Balance: 1.5 SOL

Registry PDA: REGISTRY_PDA_ADDRESS
Registry Authority: YOUR_WALLET_ADDRESS

EVM Registry Address: 0x47c81c9a70CA7518d3b911bC8C8b11000e92F59e

📝 Registering Ethereum (EID 30101)...
✅ Ethereum registered!
   Tx: https://explorer.solana.com/tx/...?cluster=devnet

📝 Registering Arbitrum (EID 30110)...
✅ Arbitrum registered!
   Tx: https://explorer.solana.com/tx/...?cluster=devnet

... (continues for all 7 chains)

🎉 Peer chain configuration complete!

Registered peers:
  ✅ Ethereum (EID 30101) - Active: true
  ✅ Arbitrum One (EID 30110) - Active: true
  ✅ Base (EID 30184) - Active: true
  ✅ BNB Chain (EID 30102) - Active: true
  ✅ Sonic (EID 30332) - Active: true
  ✅ Avalanche (EID 30106) - Active: true
  ✅ HyperEVM (EID 30367) - Active: true
```

## Step 13: Verify on Solana Explorer

Visit Solana Explorer to verify your deployment:

**Devnet**: https://explorer.solana.com/address/YOUR_PROGRAM_ID?cluster=devnet

Check:
- ✅ Program is deployed
- ✅ Registry PDA exists
- ✅ All 7 peer chains are registered

## Step 14: Deploy to Mainnet (When Ready)

### ⚠️ Important Mainnet Checklist

Before deploying to mainnet, ensure:
- [ ] Program has been thoroughly tested on devnet
- [ ] Code has been audited (recommended for production)
- [ ] You have 2-5 SOL in your mainnet wallet
- [ ] You're using a secure production keypair
- [ ] You understand the costs (~$150-300 total)

### Mainnet Deployment

```bash
# Switch to mainnet
solana config set --url https://api.mainnet-beta.solana.com

# Verify balance
solana balance
# Should show at least 2 SOL

# Deploy
anchor deploy --provider.cluster mainnet

# Initialize
export SOLANA_RPC=https://api.mainnet-beta.solana.com
ts-node scripts/solana/deploy-mainnet.ts

# Configure peers
ts-node scripts/solana/configure-peers.ts
```

## Step 15: Update EVM Registries

After successfully deploying to Solana, update all 7 EVM registries to add Solana:

```bash
# Set your private key
export PRIVATE_KEY=your_deployer_private_key

# Ethereum
forge script script/AddSolanaToRegistry.s.sol \
  --rpc-url $ETH_RPC_URL \
  --broadcast

# Arbitrum
forge script script/AddSolanaToRegistry.s.sol \
  --rpc-url $ARB_RPC_URL \
  --broadcast

# Base
forge script script/AddSolanaToRegistry.s.sol \
  --rpc-url $BASE_RPC_URL \
  --broadcast

# BNB Chain
forge script script/AddSolanaToRegistry.s.sol \
  --rpc-url $BSC_RPC_URL \
  --broadcast

# Sonic
forge script script/AddSolanaToRegistry.s.sol \
  --rpc-url $SONIC_RPC_URL \
  --broadcast

# Avalanche
forge script script/AddSolanaToRegistry.s.sol \
  --rpc-url $AVAX_RPC_URL \
  --broadcast

# HyperEVM
forge script script/AddSolanaToRegistry.s.sol \
  --rpc-url $HYPEREVM_RPC_URL \
  --broadcast
```

## Troubleshooting

### "solana-keygen: command not found"
```bash
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
# Add to ~/.bashrc or ~/.zshrc for persistence
```

### "insufficient funds for rent"
```bash
# Devnet: Get more test SOL
solana airdrop 2

# Mainnet: Transfer more SOL to your wallet
```

### "Program already deployed"
If you need to redeploy:
```bash
# This will upgrade the existing program
anchor upgrade target/deploy/eagle_registry_solana.so \
  --program-id $(solana address -k target/deploy/eagle_registry_solana-keypair.json) \
  --provider.cluster devnet
```

### "RegistryInactive" error
Check if the registry is active:
```bash
solana account YOUR_REGISTRY_PDA --output json | jq
```

### Build errors
```bash
# Clean and rebuild
cargo clean
anchor clean
anchor build
```

## Cost Summary

### Devnet
- **Total**: $0 (free test SOL from faucet)

### Mainnet
- **Program Deployment**: ~2-5 SOL ($100-250)
- **Registry Initialization**: ~0.1-0.5 SOL ($5-25)
- **Peer Registration** (7 chains): ~0.07-0.35 SOL ($3.50-17.50)
- **EVM Registry Updates**: Gas costs on each EVM chain (~$50-100 total)
- **Total Estimated Cost**: ~$150-400

## Security Best Practices

1. **Use Separate Keypairs**
   - Development: Use a throwaway keypair for testing
   - Production: Use a hardware wallet or secure key management

2. **Verify Transactions**
   - Always check transaction details before signing
   - Verify program IDs match expected values

3. **Audit Before Mainnet**
   - Have the program audited by a security firm
   - Test thoroughly on devnet first

4. **Backup Your Keys**
   - Keep encrypted backups of your keypairs
   - Store in multiple secure locations

5. **Monitor After Deployment**
   - Watch for unexpected transactions
   - Monitor registry state changes

## Next Steps

After successful deployment:
1. ✅ Test cross-chain messaging between EVM and Solana
2. ✅ Implement LayerZero send/receive logic
3. ✅ Monitor registry health
4. ✅ Document any issues or improvements

## Support Resources

- **LayerZero Docs**: https://docs.layerzero.network/v2
- **Solana Docs**: https://docs.solana.com/
- **Anchor Docs**: https://www.anchor-lang.com/
- **Discord**: Join LayerZero and Solana Discord servers for support

## Additional Notes

- The Solana program uses Anchor framework for easier development
- Program accounts are rent-exempt (permanent)
- Registry is upgradeable (authority can update)
- Peer chains can be added/removed by authority
- All cross-chain messages are validated against registered peers

---

**Ready to deploy?** Follow the steps above carefully and you'll have the Eagle Registry running on Solana in no time! 🚀

