# EAGLE OFT - LayerZero Native Implementation

Complete LayerZero V2 native cross-chain bridge between Ethereum and Solana, matching $ANON's architecture.

## 🎯 Architecture

```
┌─────────────────┐                    ┌─────────────────┐
│   Ethereum      │                    │     Solana      │
│   EagleShareOFT │◄──────────────────►│  EagleOFT       │
│   (LayerZero    │    LayerZero DVNs  │  (This Program) │
│    OFT V2)      │                    │                 │
└─────────────────┘                    └─────────────────┘
         │                                       │
         │                                       │
    User burns                              User mints
    EAGLE tokens                            EAGLE tokens
         │                                       │
         ▼                                       ▼
    LZ message ──────────────────────────► lz_receive()
         │                                       │
         │          DVN Verification             │
         │          Executor Delivery            │
         └───────────────────────────────────────┘
```

## 📋 Features

- ✅ **LayerZero OFT V2 Standard**: Full compatibility with LayerZero's OFT spec
- ✅ **Cross-Chain Messaging**: Native LayerZero message passing
- ✅ **Decimal Conversion**: Automatic 18 ↔ 9 decimal conversion
- ✅ **Security**: Admin controls, pausable, peer validation
- ✅ **Events**: Comprehensive event logging for tracking
- ✅ **Fee Quotes**: Real-time bridge fee estimation
- ✅ **Statistics**: Track total bridged in/out

## 🏗️ Program Structure

### Core Functions

1. **`initialize`**: Set up the OFT with LayerZero endpoint
2. **`set_peer`**: Configure peer OFT on other chains (e.g., Ethereum)
3. **`send`**: Bridge tokens OUT from Solana to other chains
4. **`lz_receive`**: Receive tokens IN from other chains
5. **`quote_send`**: Get fee quote for bridging
6. **`set_paused`**: Emergency pause mechanism

### State Accounts

```rust
OftConfig {
    admin: Pubkey,              // Admin wallet
    mint: Pubkey,               // EAGLE token mint
    endpoint_program: Pubkey,   // LayerZero endpoint
    paused: bool,               // Emergency pause
    total_bridged_in: u64,      // Total received
    total_bridged_out: u64,     // Total sent
    bump: u8,                   // PDA bump
}

PeerConfig {
    eid: u32,                   // Chain endpoint ID
    address: [u8; 32],          // Peer OFT address
    enabled: bool,              // Active status
    bump: u8,                   // PDA bump
}
```

## 🚀 Deployment Guide

### Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor --tag v0.31.1 anchor-cli --locked

# Verify installations
anchor --version  # Should be 0.31.1
solana --version  # Should be 1.18+
```

### Step 1: Build

```bash
cd solana-layerzero
anchor build
```

### Step 2: Deploy to Devnet

```bash
# Quick deploy script
./scripts/build-and-deploy.sh devnet

# Or manual
anchor deploy --provider.cluster devnet
```

The deployment script will:
1. ✅ Build the program
2. ✅ Deploy to Solana devnet
3. ✅ Display program ID and explorer link
4. ✅ Show next steps

### Step 3: Update Program ID

After first deployment, update the program ID in two places:

**1. `Anchor.toml`:**
```toml
[programs.devnet]
eagle_oft_layerzero = "YOUR_NEW_PROGRAM_ID"
```

**2. `programs/eagle-oft-layerzero/src/lib.rs`:**
```rust
declare_id!("YOUR_NEW_PROGRAM_ID");
```

### Step 4: Rebuild & Redeploy

```bash
anchor build
anchor deploy --provider.cluster devnet
```

### Step 5: Initialize OFT

```bash
# Install dependencies
yarn install

# Initialize the OFT
yarn init:devnet
```

This will:
- Create the OFT config account
- Create the EAGLE token mint (9 decimals)
- Set you as admin
- Configure LayerZero endpoint

### Step 6: Set Ethereum Peer

```bash
# Set Solana → Ethereum peer
yarn set-peer:devnet

# Set Ethereum → Solana peer
cd ..
yarn configure-eth-peer
```

## 🧪 Testing

### Local Testing

```bash
# Start local validator
solana-test-validator

# Run tests
anchor test
```

### Devnet Testing

```bash
# Set to devnet
solana config set --url devnet

# Get test SOL
solana airdrop 2

# Initialize
yarn init:devnet

# Set peers
yarn set-peer:devnet

# Test bridge
anchor test --skip-local-validator
```

### Integration Test

Test the full ETH → SOL flow:

```bash
# From project root
yarn test:integration:devnet
```

## 📝 Usage Examples

### Bridge from Ethereum to Solana

**On Ethereum (Solidity):**
```solidity
import "@layerzerolabs/oft-evm/contracts/OFT.sol";

// User calls send() on Ethereum OFT
uint256 amount = 100 * 1e18; // 100 EAGLE (18 decimals)
bytes32 solanaRecipient = bytes32(uint256(uint160(solanaAddress)));

SendParam memory sendParam = SendParam({
    dstEid: 30168, // Solana EID
    to: solanaRecipient,
    amountLD: amount,
    minAmountLD: amount * 95 / 100, // 5% slippage
    extraOptions: "",
    composeMsg: "",
    oftCmd: ""
});

oft.send{value: msg.value}(sendParam, messagingFee, msg.sender);
```

**On Solana (Automatic):**
- LayerZero DVNs verify the message
- Executor calls `lz_receive()` on Solana
- Program mints 100 EAGLE (9 decimals) to recipient

### Bridge from Solana to Ethereum

**On Solana (TypeScript):**
```typescript
import * as anchor from "@coral-xyz/anchor";

// User calls send() on Solana program
const sendParam = {
  dstEid: 30101, // Ethereum EID
  to: ethereumAddressAsBytes32,
  amountLd: new anchor.BN(100_000_000_000), // 100 EAGLE (9 decimals)
  minAmountLd: new anchor.BN(95_000_000_000), // 5% slippage
  extraOptions: [],
  composeMsg: [],
  oftCmd: [],
};

await program.methods
  .send(sendParam)
  .accounts({
    oftConfig: oftConfigPda,
    peerConfig: peerConfigPda,
    mint: mintAddress,
    from: userTokenAccount,
    sender: wallet.publicKey,
  })
  .rpc();
```

**On Ethereum (Automatic):**
- LayerZero DVNs verify the message
- Executor calls `lzReceive()` on Ethereum
- Contract mints 100 EAGLE (18 decimals) to recipient

## 🔧 Configuration

### LayerZero EIDs

- **Ethereum Mainnet**: 30101
- **Ethereum Sepolia**: 40161  
- **Solana Mainnet**: 30168
- **Solana Devnet**: 40168

### Decimals

- **Ethereum**: 18 decimals
- **Solana**: 9 decimals
- **Conversion**: Automatic (divide by 1e9 when ETH→SOL, multiply when SOL→ETH)

### Gas & Fees

Typical costs for bridging:
- **ETH → SOL**: ~0.005-0.01 ETH (LayerZero fees + gas)
- **SOL → ETH**: ~0.002-0.005 SOL (DVN + executor fees)

## 🛡️ Security

### Admin Functions

Only admin can:
- Set/update peers
- Pause/unpause operations
- Transfer admin role
- Enable/disable peers

### Safety Features

- ✅ **Pausable**: Emergency stop for all operations
- ✅ **Peer Validation**: Only accepts messages from configured peers
- ✅ **Slippage Protection**: Min amount checks
- ✅ **Overflow Protection**: Safe math throughout
- ✅ **Reentrancy Safe**: No external calls during state changes

### Audits

⚠️  **NOT AUDITED YET** - Do not use in production without audit

Recommended auditors:
- OtterSec
- Neodyme
- Trail of Bits

## 📊 Monitoring

### View Program State

```bash
# Get OFT config
anchor account oftConfig <CONFIG_ADDRESS>

# Get peer config
anchor account peerConfig <PEER_ADDRESS>

# View mint info
spl-token display <MINT_ADDRESS>
```

### Watch Events

```bash
# Watch for Send events
solana logs | grep "Send"

# Watch for Receive events
solana logs | grep "Receive"
```

### Check Bridge Statistics

```typescript
const config = await program.account.oftConfig.fetch(configPda);
console.log("Total bridged in:", config.totalBridgedIn.toString());
console.log("Total bridged out:", config.totalBridgedOut.toString());
```

## 🚨 Troubleshooting

### Build Errors

```bash
# Clear cache and rebuild
rm -rf target/
anchor build
```

### Deployment Fails

```bash
# Check balance
solana balance

# Request airdrop (devnet only)
solana airdrop 2

# Check program size
ls -lh target/deploy/*.so
```

### Transaction Fails

```bash
# Check account exists
solana account <ADDRESS>

# View transaction details
solana confirm -v <SIGNATURE>

# Check program logs
solana logs | grep <PROGRAM_ID>
```

## 📚 Resources

- [LayerZero Docs](https://docs.layerzero.network/)
- [LayerZero V2 Solana](https://docs.layerzero.network/v2/developers/solana/overview)
- [Anchor Book](https://book.anchor-lang.com/)
- [Solana Cookbook](https://solanacookbook.com/)

## 🔄 Migration from Relayer

If migrating from the old relayer-based bridge:

1. **Don't close old program yet** - wait for users to bridge out
2. **Deploy new LayerZero program** with different mint
3. **Announce migration** to users
4. **Set up token swap** (old → new)
5. **Wait 30+ days** for stragglers
6. **Close old program** and recover SOL

## 🎯 Roadmap

- [ ] Complete LayerZero SDK integration
- [ ] Deploy to mainnet
- [ ] Set up DVN configuration
- [ ] Configure executor
- [ ] Security audit
- [ ] Frontend integration
- [ ] Monitoring dashboard
- [ ] Multi-chain support (Base, Arbitrum, etc.)

## 📞 Support

- Issues: [GitHub Issues](https://github.com/your-repo/issues)
- Discord: [Your Discord]
- Twitter: [Your Twitter]

---

**Built with ❤️ using LayerZero V2 and Anchor**

