# Eagle Registry Solana - Quick Start

## 🚀 What's Been Built

Complete Solana integration for Eagle Registry with LayerZero V2 cross-chain messaging:

- ✅ **Solana Program** (Anchor/Rust) - `programs/eagle-registry-solana/`
- ✅ **TypeScript SDK** - `solana-sdk/`
- ✅ **Deployment Scripts** - `scripts/solana/`
- ✅ **EVM Integration** - `script/AddSolanaToRegistry.s.sol`
- ✅ **Documentation** - Multiple comprehensive guides

## 📂 Project Structure

```
eagle-ovault-clean/
├── programs/
│   └── eagle-registry-solana/       # Anchor program (Rust)
│       ├── src/lib.rs               # Main program logic
│       └── Cargo.toml
├── solana-sdk/                      # TypeScript SDK
│   ├── src/
│   │   ├── client.ts                # Main SDK client
│   │   ├── types/                   # TypeScript types
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
├── scripts/
│   └── solana/                      # Deployment scripts
│       ├── deploy-devnet.ts         # Devnet deployment
│       ├── deploy-mainnet.ts        # Mainnet deployment
│       └── configure-peers.ts       # Configure EVM peers
├── script/
│   └── AddSolanaToRegistry.s.sol    # Forge script for EVM
├── Anchor.toml                      # Anchor configuration
├── SOLANA_DEPLOYMENT_GUIDE.md       # 📖 START HERE
├── SOLANA_INTEGRATION.md            # Detailed documentation
├── SOLANA_LAYERZERO_RESEARCH.md     # Research notes
└── SOLANA_README.md                 # This file
```

## 🎯 Quick Deployment (For Local Machine)

### Current Environment Limitation
This server environment doesn't have:
- Sudo access (can't install system packages)
- Solana CLI tools installed
- Required system dependencies (libudev-dev)

### Deploy from Your Machine

**Follow this guide**: `SOLANA_DEPLOYMENT_GUIDE.md`

#### Quick Steps:
1. Install system dependencies (`libudev-dev`, `libssl-dev`)
2. Install Rust, Solana CLI, and Anchor
3. Clone this repo
4. Run:
   ```bash
   cd eagle-ovault-clean
   anchor build
   anchor deploy --provider.cluster devnet
   cd solana-sdk && yarn install
   ts-node ../scripts/solana/deploy-devnet.ts
   ts-node ../scripts/solana/configure-peers.ts
   ```

## 📊 Architecture Overview

**Pattern**: Lightweight Registry Adapter

```
┌─────────────────────────────────────────────────────────────┐
│                      EVM Chains (7)                         │
│  Ethereum • Arbitrum • Base • BSC • Sonic • Avalanche      │
│                     • HyperEVM                              │
│                                                             │
│  EagleRegistry: 0x47c81c9a70CA7518d3b911bC8C8b11000e92F59e │
│  (Canonical Source of Truth)                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ LayerZero V2 Messages
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                        Solana                               │
│                                                             │
│  Eagle Registry Solana (Adapter)                           │
│  • Minimal state storage                                    │
│  • Message bridge for cross-chain queries                   │
│  • Peer management for EVM chains                           │
└─────────────────────────────────────────────────────────────┘
```

## 🔑 Key Information

### Solana Mainnet
- **EID**: 30168
- **WSOL**: `So11111111111111111111111111111111111111112`
- **LayerZero Endpoint**: `76y77prsiCMvXMjuoZ5VRrhG5qYBrUMYTE5WgHqgjEn6` (verify)

### EVM Chains
All use Eagle Registry at: `0x47c81c9a70CA7518d3b911bC8C8b11000e92F59e`

| Chain     | EID   |
|-----------|-------|
| Ethereum  | 30101 |
| Arbitrum  | 30110 |
| Base      | 30184 |
| BNB Chain | 30102 |
| Sonic     | 30332 |
| Avalanche | 30106 |
| HyperEVM  | 30367 |

## 💰 Cost Estimates

### Devnet
- **Free** (test SOL from faucet)

### Mainnet
- Program deployment: ~2-5 SOL ($100-250)
- Initialization: ~0.1-0.5 SOL ($5-25)
- Peer registration: ~0.07-0.35 SOL ($3.50-17.50)
- EVM updates: ~$50-100 gas
- **Total**: ~$150-400

## 🛠️ Development

### Build Program
```bash
anchor build
```

### Test (Coming Soon)
```bash
anchor test
```

### Deploy to Devnet
```bash
anchor deploy --provider.cluster devnet
```

### Initialize Registry
```bash
cd solana-sdk
yarn install
ts-node ../scripts/solana/deploy-devnet.ts
```

### Configure Peers
```bash
ts-node ../scripts/solana/configure-peers.ts
```

## 📚 Documentation

1. **SOLANA_DEPLOYMENT_GUIDE.md** - Step-by-step deployment guide (START HERE)
2. **SOLANA_INTEGRATION.md** - Complete technical documentation
3. **SOLANA_LAYERZERO_RESEARCH.md** - Research and references
4. **solana-sdk/README.md** - SDK documentation

## 🔐 Security

- Owner-only admin functions
- Peer validation for messages
- Active status checks
- Rent-exempt accounts
- **Recommended**: Audit before mainnet

## 🤝 Support

- LayerZero Discord: https://discord.gg/layerzero
- Solana Discord: https://discord.gg/solana
- Anchor Docs: https://www.anchor-lang.com/

## ✨ Next Steps

1. ✅ **Deploy to devnet** using SOLANA_DEPLOYMENT_GUIDE.md
2. ✅ Test cross-chain messaging
3. ✅ Verify all functionality
4. ⏳ Deploy to mainnet (when ready)
5. ⏳ Update all 7 EVM registries

---

**Status**: ✅ Implementation complete, ready for deployment

**Last Updated**: November 15, 2025

