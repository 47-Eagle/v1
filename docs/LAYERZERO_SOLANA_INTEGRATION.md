# LayerZero Solana Integration Guide

## 🌉 Overview

The Eagle Registry Solana program integrates with LayerZero V2 for cross-chain messaging between Solana and EVM chains.

## 📦 LayerZero Solana Endpoint

### Devnet
- **Endpoint Program ID**: `76y77prsiCMvXMjuoZ5VRrhG5qYBrUMYTE5WgHqgjEn6`
- **Chain EID**: `40168` (Solana Testnet)

### Mainnet
- **Endpoint Program ID**: `76y77prsiCMvXMjuoZ5VRrhG5qYBrUMYTE5WgHqgjEn6`
- **Chain EID**: `30168` (Solana Mainnet)

## 🔧 SDK Setup

### Installation

```bash
npm install @layerzerolabs/lz-solana-sdk-v2 @metaplex-foundation/umi @metaplex-foundation/umi-bundle-defaults
```

### Basic Usage

```typescript
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { publicKey as umiPublicKey } from '@metaplex-foundation/umi';
import { EndpointProgram } from '@layerzerolabs/lz-solana-sdk-v2/umi';

// Create Umi instance
const umi = createUmi('https://api.devnet.solana.com');

// Create endpoint instance
const endpoint = new EndpointProgram.Endpoint(
  EndpointProgram.ENDPOINT_PROGRAM_ID
);
```

## 🏗️ Eagle Registry Integration

### Architecture

```
EVM Chains                 Solana
┌─────────────┐           ┌──────────────────┐
│ Eagle       │           │ Eagle Registry   │
│ Registry    │◄─────────►│ Solana Program   │
│ (ERC)       │           │                  │
└─────────────┘           └──────────────────┘
      │                            │
      │                            │
      ▼                            ▼
┌─────────────┐           ┌──────────────────┐
│ LayerZero   │           │ LayerZero        │
│ Endpoint    │◄─────────►│ Endpoint         │
│ (EVM)       │           │ (Solana)         │
└─────────────┘           └──────────────────┘
```

### Message Flow

#### Sending from Solana to EVM:

1. **User calls** `send_query(dst_eid, query_data)`
2. **Eagle Registry** validates peer chain
3. **Calls LayerZero** endpoint with:
   - `dst_eid`: Destination EID (e.g., 30101 for Ethereum)
   - `receiver`: EVM registry address (bytes32)
   - `message`: Encoded query data
4. **LayerZero** routes to EVM chain
5. **EVM registry** receives via `lzReceive()`

#### Receiving from EVM to Solana:

1. **EVM sends** via LayerZero
2. **LayerZero Solana** endpoint receives
3. **Calls** `lz_receive(src_eid, sender, message)`
4. **Eagle Registry** validates and processes

## 📝 Initialization Steps

### 1. Deploy Eagle Registry Program

```bash
# Already done!
Program ID: 7wSrZXHF6BguZ1qwkXdZcNf3qyV2MPNvcztQLwrh9qPJ
```

### 2. Initialize with LayerZero Endpoint

```typescript
const LAYERZERO_ENDPOINT_DEVNET = umiPublicKey(
  '76y77prsiCMvXMjuoZ5VRrhG5qYBrUMYTE5WgHqgjEn6'
);

await program.methods
  .initialize(LAYERZERO_ENDPOINT_DEVNET)
  .accounts({
    registryConfig: registryPda,
    authority: walletKeypair.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### 3. Register Peer EVM Chains

```typescript
// Register Ethereum
await program.methods
  .registerPeerChain(
    30101, // Ethereum EID
    1n,    // Chain ID
    ethereumRegistryAddress, // bytes32
    true   // isActive
  )
  .accounts({
    registryConfig: registryPda,
    peerConfig: peerPda,
    authority: walletKeypair.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

## 🔄 Cross-Chain Operations

### Send Query to EVM

```typescript
// Example: Query WLFI price from Ethereum
const queryData = encodeQueryData({
  queryType: 'PRICE',
  token: 'WLFI',
});

await program.methods
  .sendQuery(
    30101, // Ethereum EID
    queryData
  )
  .accounts({
    registryConfig: registryPda,
    peerConfig: ethereumPeerPda,
    lzEndpoint: LAYERZERO_ENDPOINT_DEVNET,
    caller: walletKeypair.publicKey,
  })
  .rpc();
```

### Receive from EVM

```typescript
// Called by LayerZero endpoint when message arrives
await program.methods
  .lzReceive(
    30101, // Source EID (Ethereum)
    senderBytes32, // EVM registry address
    messageBytes
  )
  .accounts({
    registryConfig: registryPda,
    peerConfig: ethereumPeerPda,
    lzEndpoint: LAYERZERO_ENDPOINT_DEVNET,
  })
  .rpc();
```

## 🔐 Security Considerations

### Peer Validation

- ✅ Only registered peer chains can send messages
- ✅ Sender address must match registered registry
- ✅ Authority required for registration

### Access Control

- ✅ Only authority can initialize
- ✅ Only authority can register/update peers
- ✅ Only LayerZero endpoint can call `lz_receive`

## 🧪 Testing on Devnet

### Prerequisites

1. **Solana Devnet SOL**: ~2 SOL for transactions
2. **LayerZero Devnet Access**: Endpoint deployed on devnet
3. **EVM Testnet**: Sepolia/Goerli for testing

### Test Flow

```bash
# 1. Initialize registry
npm run initialize

# 2. Register Ethereum Sepolia
npm run register-chains

# 3. Send test message
npm run test-send

# 4. Monitor for response
npm run test-receive
```

## 📚 Resources

- **LayerZero Docs**: https://docs.layerzero.network/
- **Solana SDK**: https://github.com/LayerZero-Labs/devtools/tree/main/packages/lz-solana-sdk-v2
- **Endpoint Program**: https://github.com/LayerZero-Labs/LayerZero-v2/tree/main/packages/layerzero-v2/solana
- **Example OFT**: https://github.com/LayerZero-Labs/devtools/tree/main/examples/oft-solana

## 🚀 Next Steps

1. ✅ Program deployed to devnet
2. ⏳ Initialize with LayerZero endpoint
3. ⏳ Register peer EVM chains
4. ⏳ Test cross-chain messaging
5. ⏳ Implement message encoding/decoding
6. ⏳ Add proper error handling
7. ⏳ Security audit
8. ⏳ Mainnet deployment

## ⚙️ LayerZero Endpoint Operations

### Skip a Message

Bypass a stuck message to unblock subsequent processing:

```typescript
const skipIxn = endpoint.skip(umiWalletSigner, {
  sender: senderBytes32,
  receiver: umiPublicKey(EAGLE_REGISTRY_PROGRAM_ID),
  srcEid: 30101, // Ethereum
  nonce: BigInt(123),
});

await skipIxn.sendAndConfirm(umi);
```

### Nilify a Nonce

Invalidate a verified payload without deleting:

```typescript
const nilifyIxn = endpoint.oAppNilify(umiWalletSigner, {
  nonce: BigInt(123),
  receiver: umiPublicKey(EAGLE_REGISTRY_PROGRAM_ID),
  sender: senderBytes32,
  srcEid: 30101,
  payloadHash: payloadHashBytes32,
});

await nilifyIxn.sendAndConfirm(umi);
```

### Burn a Nonce

Clean up old payload accounts:

```typescript
const burnIxn = endpoint.oAppBurnNonce(umiWalletSigner, {
  nonce: BigInt(123),
  receiver: umiPublicKey(EAGLE_REGISTRY_PROGRAM_ID),
  sender: senderBytes32,
  srcEid: 30101,
  payloadHash: payloadHashBytes32,
});

await burnIxn.sendAndConfirm(umi);
```

### Clear a Payload

Finalize/ack a payload after verification:

```typescript
const [endpointPda] = endpoint.pda.setting();
const [noncePda] = endpoint.pda.nonce(
  umiPublicKey(EAGLE_REGISTRY_PROGRAM_ID),
  30101,
  senderBytes32
);

const clearIxn = EndpointProgram.instructions.clear(
  { programs: endpoint.programRepo },
  {
    signer: umiWalletSigner,
    oappRegistry: oappRegistryPda,
    nonce: noncePda,
    payloadHash: payloadHashPda,
    endpoint: endpointPda,
    eventAuthority: endpoint.eventAuthority,
    program: endpoint.programId,
  },
  {
    receiver: umiPublicKey(EAGLE_REGISTRY_PROGRAM_ID),
    srcEid: 30101,
    sender: senderBytes32,
    nonce: BigInt(123),
    guid: guidBytes32,
    message: messageBytes,
  }
);

await clearIxn.sendAndConfirm(umi);
```

## 🆘 Troubleshooting

### Common Issues

1. **"Payload account missing"**
   - Call `endpoint.initVerify()` before skip/clear operations

2. **"Nonce out of range"**
   - Must be within sliding window: `inboundNonce` < nonce ≤ `inboundNonce + 256`

3. **"Unauthorized delegate"**
   - Ensure caller has proper authority on the Eagle Registry

4. **"Invalid sender"**
   - Sender must match registered peer chain registry address

---

**Status**: Integration guide complete. Ready to implement with LayerZero Solana SDK.

