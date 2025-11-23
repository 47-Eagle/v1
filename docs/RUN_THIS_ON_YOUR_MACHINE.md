# 🚀 Run This On Your Local Machine

## Current Situation

This server environment **cannot** deploy to Solana because:
- ❌ No sudo access (can't install system dependencies)
- ❌ Solana CLI not installed
- ❌ Anchor framework not installed

## What You Need to Do

Run the automated test & deployment script **from your local machine** or a server with proper access.

## Quick Start (3 Commands)

### 1. Install Prerequisites (One-time setup)

**On Ubuntu/Debian/WSL:**
```bash
# Install system dependencies
sudo apt-get update
sudo apt-get install -y build-essential pkg-config libssl-dev libudev-dev

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.18.22/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install 0.30.1
avm use 0.30.1

# Verify installations
rustc --version
solana --version
anchor --version
```

**On macOS:**
```bash
# Install Homebrew if needed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install openssl pkg-config

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.18.22/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install 0.30.1
avm use 0.30.1

# Verify installations
rustc --version
solana --version
anchor --version
```

### 2. Clone Repo and Navigate

```bash
cd /path/to/eagle-ovault-clean
```

### 3. Run Test & Deploy Script

```bash
./TEST_AND_DEPLOY.sh
```

That's it! The script will:
1. ✅ Check your environment
2. ✅ Build the program
3. ✅ Run comprehensive tests
4. ✅ Deploy to devnet
5. ✅ Initialize the registry
6. ✅ Configure all 7 peer chains

## What the Script Does

```
🧪 Eagle Registry Solana - Test & Deploy
==========================================

✅ Anchor version: anchor-cli 0.30.1
✅ Solana version: solana-cli 1.18.22

📡 Setting cluster to devnet...
👛 Checking wallet...
  Address: YOUR_WALLET_ADDRESS
  Balance: 2.00 SOL

🔨 Building program...
✅ Build complete!

📝 Program ID: YOUR_PROGRAM_ID
📝 Updating program IDs in code...
✅ Program IDs updated

🔨 Rebuilding with correct program ID...
✅ Rebuild complete!

🧪 Running tests...

  eagle-registry-solana
    initialize
      ✔ should initialize the registry (234ms)
      ✔ should fail to initialize twice (156ms)
    updateConfig
      ✔ should update the registry endpoint (189ms)
      ✔ should update the registry active status (201ms)
      ✔ should fail when called by non-authority (98ms)
    registerPeerChain
      ✔ should register Ethereum peer chain (267ms)
      ✔ should fail to register peer with name too long (112ms)
      ✔ should fail when called by non-authority (89ms)
    lzReceive
      ✔ should receive message from registered peer (178ms)
      ✔ should fail to receive empty message (102ms)
      ✔ should fail to receive message from unknown peer (95ms)
      ✔ should fail when registry is inactive (201ms)
    sendQuery
      ✔ should send query to registered peer (156ms)
      ✔ should fail when registry is inactive (189ms)

  14 passing (3s)

✅ All tests passed!

🚀 Ready to deploy to Devnet

Do you want to deploy? (y/n) y

🚀 Deploying to devnet...
✅ Program deployed!

🔧 Initializing registry...
✅ Registry initialized!

🔗 Configuring peer chains...
✅ Peer chains configured!

==========================================
✨ Deployment Complete!
==========================================

Program ID:       YOUR_PROGRAM_ID
Cluster:          Devnet
Explorer:         https://explorer.solana.com/address/YOUR_PROGRAM_ID?cluster=devnet

Next steps:
  1. Verify program on Solana Explorer
  2. Test cross-chain messaging
  3. Deploy to mainnet when ready
```

## Installation Time

- **First time** (with installations): ~20-30 minutes
- **Subsequent runs** (already installed): ~2-3 minutes

## Troubleshooting

### "Command not found" errors
Make sure to add Solana to your PATH:
```bash
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Add to ~/.bashrc or ~/.zshrc for persistence:
echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### "Low balance" warnings
The script will automatically request a devnet airdrop. If it fails:
```bash
solana airdrop 2
```

### Build errors
```bash
cargo clean
anchor clean
anchor build
```

## After Successful Deployment

### Verify on Solana Explorer
Visit: https://explorer.solana.com/address/YOUR_PROGRAM_ID?cluster=devnet

### Update EVM Registries
Once satisfied with devnet testing, update all 7 EVM registries to add Solana:

```bash
export PRIVATE_KEY=your_deployer_private_key

# Run on each chain:
forge script script/AddSolanaToRegistry.s.sol --rpc-url $ETH_RPC_URL --broadcast
forge script script/AddSolanaToRegistry.s.sol --rpc-url $ARB_RPC_URL --broadcast
forge script script/AddSolanaToRegistry.s.sol --rpc-url $BASE_RPC_URL --broadcast
forge script script/AddSolanaToRegistry.s.sol --rpc-url $BSC_RPC_URL --broadcast
forge script script/AddSolanaToRegistry.s.sol --rpc-url $SONIC_RPC_URL --broadcast
forge script script/AddSolanaToRegistry.s.sol --rpc-url $AVAX_RPC_URL --broadcast
forge script script/AddSolanaToRegistry.s.sol --rpc-url $HYPEREVM_RPC_URL --broadcast
```

### Deploy to Mainnet
When ready for production:

```bash
# Switch to mainnet
solana config set --url https://api.mainnet-beta.solana.com

# Ensure you have 2-5 SOL
solana balance

# Deploy
anchor deploy --provider.cluster mainnet

# Initialize
cd solana-sdk
SOLANA_RPC=https://api.mainnet-beta.solana.com ts-node ../scripts/solana/deploy-mainnet.ts
SOLANA_RPC=https://api.mainnet-beta.solana.com ts-node ../scripts/solana/configure-peers.ts
```

## Need Help?

- 📖 **Full Guide**: See `SOLANA_DEPLOYMENT_GUIDE.md`
- 📚 **Technical Docs**: See `SOLANA_INTEGRATION.md`
- 🔍 **Research**: See `SOLANA_LAYERZERO_RESEARCH.md`
- 💬 **Support**: LayerZero Discord (https://discord.gg/layerzero)

---

**Ready?** Just run `./TEST_AND_DEPLOY.sh` and you're good to go! 🚀

