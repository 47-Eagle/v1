# 🦅 Eagle Wrapped Token Bridge

## Overview

The Eagle Wrapped Token Bridge is designed specifically for tokens with fixed maximum supplies that cannot be minted on additional chains. Unlike traditional OFT (Omnichain Fungible Token) bridges that burn/mint tokens, this bridge uses a **wrapped token approach**.

## Problem Solved

EAGLE tokens have a **fixed maximum supply of 50 million tokens**, all of which are already minted on Solana. Traditional bridge approaches that require minting equivalent tokens on destination chains cannot work.

## Solution: Wrapped Token Bridge

### Architecture

```
Solana (Source)           ↔️           EVM Chains (Destination)
───────────────────       LayerZero      ───────────────────
Bridge Vault (Lock)       Message       Wrapped Bridge (Mint)
↑                       ↔️             ↑
User deposits EAGLE    Proof of Lock   Mint wrapped WEAGLE
```

### Flow

#### Forward Bridge (Solana → EVM)
1. **User** sends EAGLE tokens to Solana bridge vault
2. **Relayer** detects deposit and sends LayerZero message
3. **EVM Contract** receives message and mints wrapped EAGLE tokens
4. **User** receives wrapped WEAGLE on destination chain

#### Reverse Bridge (EVM → Solana)
1. **User** burns wrapped WEAGLE tokens on EVM contract
2. **EVM Contract** sends LayerZero message to Solana
3. **Solana Program** unlocks original EAGLE tokens
4. **User** receives EAGLE tokens back on Solana

## Key Differences from OFT

| Aspect | OFT Bridge | Wrapped Bridge |
|--------|------------|----------------|
| Token Supply | Burn/Mint | Lock/Wrap |
| Max Supply | ❌ Breaks | ✅ Respects |
| Trust Model | Trustless | Attestation-based |
| Gas Costs | Lower | Higher (2 tx) |
| Complexity | Simple | More complex |

## Contracts

### EVM Side: `EagleBridgeWrapped.sol`
- ERC20 wrapped token contract
- LayerZero OApp integration
- Mint/burn wrapped tokens based on messages

### Solana Side: Bridge Vault
- Simple token vault (regular wallet or PDA)
- Relayer monitors deposits
- Sends LayerZero messages for attestations

## Deployment

### 1. Deploy Wrapped Bridge Contract
```bash
cd contracts
npx hardhat run scripts/deployEagleWrappedBridge.ts --network base
```

### 2. Configure LayerZero Peers
Each deployment needs to know about the other chains:
- Set Solana bridge program as peer on EVM contracts
- Configure endpoint IDs and trusted remotes

### 3. Update Relayer
The relayer needs to know:
- Bridge vault addresses
- Wrapped contract addresses on each chain
- LayerZero endpoint configurations

## Security Considerations

### Attestation Model
- Relayer must be trusted to send correct messages
- Messages include proof of locked tokens
- EVM contracts verify message authenticity via LayerZero

### Bridge Vault Security
- Bridge vault should be a secure wallet or PDA
- Multiple relayers for redundancy
- Emergency pause mechanisms

### Token Accounting
- Total wrapped tokens ≤ tokens locked on Solana
- Cross-chain supply verification
- Reconciliation mechanisms

## Usage

### For Users
1. **Bridge to EVM**: Send EAGLE to Solana bridge vault
2. **Receive wrapped tokens**: Get WEAGLE on destination chain
3. **Bridge back**: Burn WEAGLE to unlock EAGLE on Solana

### For Developers
- Deploy wrapped bridge contracts on target chains
- Configure LayerZero peers between all chains
- Monitor bridge activity and supply consistency

## Benefits

✅ **Respects max supply** - No additional tokens created
✅ **Cross-chain compatible** - Works with existing token economics
✅ **LayerZero powered** - Fast, secure cross-chain messaging
✅ **Trust-minimized** - Uses attestations instead of centralized custody
✅ **Flexible deployment** - Can be deployed to any EVM chain

## Limitations

⚠️ **Requires trusted relayer** for message sending
⚠️ **Two-step process** for bridging (lock + message)
⚠️ **Supply tracking complexity** across chains
⚠️ **Emergency mechanisms** needed for stuck bridges

## Future Improvements

- Multi-relayer redundancy
- Automated supply verification
- Emergency unlock mechanisms
- Governance for bridge parameters
- Bridge analytics and monitoring

