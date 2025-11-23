# Composed Flow: EAGLE → WLFI in 1 Transaction

## Overview

This feature enables users to **redeem EAGLE for WLFI across chains in a single transaction** using LayerZero's compose functionality.

### User Experience

**Before** (2 transactions):
1. Bridge EAGLE from Base → Ethereum
2. Wait for arrival, then call `unwrapAndRedeem()` on Ethereum
3. Manually bridge WLFI back to Base (if desired)

**After** (1 transaction):
```typescript
// User on Base
await eagleOFT.send({
  dstEid: ETHEREUM_EID,
  to: COMPOSER_ADDRESS, // Composer on Ethereum
  amountLD: parseEther("10"), // 10 EAGLE
  composeMsg: {
    // Return WLFI to Base
    wlfiDest: BASE_EID,
    receiver: userAddress,
    minWLFI: parseEther("9") // 10% slippage
  }
})

// Behind the scenes:
// 1. EAGLE bridges to Ethereum
// 2. Composer unwraps EAGLE → vEAGLE
// 3. Composer redeems vEAGLE → WLFI
// 4. Composer bridges WLFI back to Base
// User receives WLFI on Base! ✅
```

---

## Architecture

### New Contracts

#### 1. WLFIOFTAdapter (Ethereum)
- **Purpose**: Lock/unlock native WLFI for cross-chain transfers
- **Type**: LayerZero OFT Adapter
- **Chain**: Ethereum only
- **Address**: `TBD`

```solidity
contract WLFIOFTAdapter is OFTAdapter {
    // Locks WLFI on Ethereum
    // Mints WLFI OFT on remote chains
}
```

#### 2. WLFIOFT (Base)
- **Purpose**: Represent WLFI on Base
- **Type**: LayerZero OFT
- **Chain**: Base (and other spokes)
- **Address**: `TBD`

```solidity
contract WLFIOFT is OFT {
    // Minted when WLFI locked on Ethereum
    // Burned when WLFI unlocked on Ethereum
}
```

#### 3. EagleOVaultComposerV2 (Ethereum)
- **Purpose**: Enhanced composer with WLFI cross-chain support
- **Type**: LayerZero OApp
- **Chain**: Ethereum only
- **Address**: `TBD`

```solidity
contract EagleOVaultComposerV2 is OAppCore {
    // Handles composed redemption flow
    function lzCompose(...) external payable {
        // 1. Receive EAGLE
        // 2. Unwrap → vEAGLE
        // 3. Redeem → WLFI
        // 4. Send WLFI via adapter
    }
}
```

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    BASE (User initiates)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  User has: 10 EAGLE                                              │
│       ↓                                                           │
│  eagleOFT.send() with composeMsg                                 │
│    - dstEid: ETHEREUM_EID                                        │
│    - to: COMPOSER_ADDRESS                                        │
│    - composeMsg: (wlfiDest, receiver, minWLFI)                   │
│       ↓                                                           │
│  LayerZero V2 Endpoint                                           │
│       ↓                                                           │
│  DVNs verify (5-15 min)                                          │
│                                                                   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                │     CROSS-CHAIN BRIDGE      │
                └──────────────┬──────────────┘
                               │
┌──────────────────────────────┴───────────────────────────────────┐
│                    ETHEREUM (Compose executes)                    │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  LayerZero Endpoint receives                                      │
│       ↓                                                            │
│  Composer.lzCompose() triggered                                   │
│       ↓                                                            │
│  Step 1: EAGLE arrives at Composer                                │
│       ↓                                                            │
│  Step 2: Wrapper.unwrap(10 EAGLE) → 9.98 vEAGLE (0.2% fee)       │
│       ↓                                                            │
│  Step 3: Vault.redeem(9.98 vEAGLE) → 9.5 WLFI + 0.3 USD1         │
│       ↓                                                            │
│  Step 4: WLFIAdapter.send() → Bridge 9.5 WLFI to Base            │
│       ↓                                                            │
│  DVNs verify (5-15 min)                                           │
│                                                                    │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                │     CROSS-CHAIN BRIDGE      │
                └──────────────┬──────────────┘
                               │
┌──────────────────────────────┴───────────────────────────────────┐
│                    BASE (User receives)                           │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  LayerZero Endpoint receives                                      │
│       ↓                                                            │
│  WLFIOFT.lzReceive() triggered                                    │
│       ↓                                                            │
│  WLFI OFT minted to user                                          │
│       ↓                                                            │
│  User balance: 9.5 WLFI ✅                                        │
│                                                                    │
│  Total time: ~10-20 minutes                                       │
│  Total gas: ~$3-5 (both bridges + compose execution)             │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
```

---

## Deployment Steps

### 1. Deploy WLFI OFT Adapter on Ethereum

```bash
forge script script/layerzero/DeployWLFIOFTs.s.sol \
  --rpc-url $ETHEREUM_RPC_URL \
  --broadcast \
  --verify
```

**Expected output**:
- WLFIOFTAdapter: `0x...`

### 2. Deploy WLFI OFT on Base

```bash
forge script script/layerzero/DeployWLFIOFTs.s.sol \
  --rpc-url $BASE_RPC_URL \
  --broadcast \
  --verify
```

**Expected output**:
- WLFIOFT: `0x...`

### 3. Configure Peer Connections

```bash
# On Ethereum: Set Base as peer
cast send $WLFI_ADAPTER \
  "setPeer(uint32,bytes32)" \
  30184 \
  $(cast --to-bytes32 $WLFI_OFT_BASE) \
  --rpc-url $ETHEREUM_RPC_URL \
  --private-key $PRIVATE_KEY

# On Base: Set Ethereum as peer
cast send $WLFI_OFT_BASE \
  "setPeer(uint32,bytes32)" \
  30101 \
  $(cast --to-bytes32 $WLFI_ADAPTER) \
  --rpc-url $BASE_RPC_URL \
  --private-key $PRIVATE_KEY
```

### 4. Deploy EagleOVaultComposerV2 on Ethereum

```bash
forge create \
  --rpc-url $ETHEREUM_RPC_URL \
  --constructor-args \
    $VAULT \
    $EAGLE_OFT \
    $WRAPPER \
    $WLFI_ADAPTER \
    $WLFI \
    $USD1 \
    $REGISTRY \
    $LZ_ENDPOINT \
  --private-key $PRIVATE_KEY \
  --verify \
  contracts/layerzero/composers/EagleOVaultComposerV2.sol:EagleOVaultComposerV2
```

### 5. Test Composed Flow

```bash
npx tsx scripts/testing/test-eagle-to-wlfi-compose.ts
```

---

## Usage Example

### TypeScript/JavaScript

```typescript
import { ethers } from 'ethers'
import { Options } from '@layerzerolabs/lz-v2-utilities'

// User on Base wants to redeem 10 EAGLE for WLFI
const amountToSend = ethers.parseUnits('10', 18)

// Build compose message
const wlfiSendParam = {
  dstEid: BASE_EID,
  to: ethers.zeroPadValue(userAddress, 32),
  amountLD: 0, // Filled by composer
  minAmountLD: ethers.parseUnits('9', 18), // 10% slippage
  extraOptions: '0x',
  composeMsg: '0x',
  oftCmd: '0x',
}

const composeMsg = ethers.AbiCoder.defaultAbiCoder().encode(
  ['uint256', 'tuple(...)', 'tuple(...)', 'uint256'],
  [amountToSend, wlfiSendParam, usd1SendParam, minMsgValue]
)

// Build send param
const sendParam = {
  dstEid: ETHEREUM_EID,
  to: ethers.zeroPadValue(COMPOSER_ADDRESS, 32),
  amountLD: amountToSend,
  minAmountLD: ethers.parseUnits('9.9', 18),
  extraOptions: Options.newOptions()
    .addExecutorLzComposeOption(0, 500000, 0)
    .toHex(),
  composeMsg: composeMsg,
  oftCmd: '0x',
}

// Quote and send
const quote = await eagleOFT.quoteSend(sendParam, false)
const tx = await eagleOFT.send(
  sendParam,
  { nativeFee: quote.nativeFee, lzTokenFee: 0 },
  userAddress,
  { value: quote.nativeFee }
)

await tx.wait()
// Done! WLFI will arrive on Base in ~10-20 minutes
```

---

## Fee Structure

### Bridge Fees (LayerZero)
- **EAGLE → Ethereum**: ~$1-2
- **WLFI → Base**: ~$1-2

### Protocol Fees
- **Wrapper unwrap**: 0.2% (20 basis points)
- **Vault redemption**: ~0-5% (depends on liquidity)

### Gas Costs
- **User transaction** (Base): ~$0.50
- **Compose execution** (Ethereum): ~$5-10 (paid from user's fee)

### Total Cost Example
For 10 EAGLE → WLFI:
- LayerZero fees: ~$3
- Wrapper fee: 0.02 EAGLE (~$0.02)
- Vault slippage: ~0.5 WLFI (~$0.50)
- **Total**: ~$3.52 + slippage

---

## Security Considerations

### Slippage Protection
Always set reasonable `minAmountLD` values:
- **EAGLE bridge**: 1-2% slippage
- **WLFI redemption**: 5-10% slippage (accounts for wrapper fee + vault liquidity)

### Compose Gas Limits
The compose operation requires ~500k gas on Ethereum:
- Unwrap: ~50k gas
- Redeem: ~200k gas
- WLFI send: ~150k gas
- Buffer: ~100k gas

Set via `addExecutorLzComposeOption(0, 500000, 0)`

### Refund Mechanism
If the compose fails (e.g., insufficient gas, slippage exceeded):
- Composer automatically refunds EAGLE to original sender
- No funds lost, but bridge fees are not refunded

---

## Monitoring

### LayerZero Scan
Track both bridge transactions:
1. EAGLE → Ethereum: `https://layerzeroscan.com/tx/{tx_hash}`
2. WLFI → Base: Auto-linked from first transaction

### Expected Timeline
- **EAGLE arrives on Ethereum**: 5-15 minutes
- **Compose executes**: Instant
- **WLFI arrives on Base**: 5-15 minutes
- **Total**: 10-20 minutes

---

## FAQ

### Q: Can I still do the 2-step process manually?
**A**: Yes! The original `unwrapAndRedeem()` function still works on Ethereum.

### Q: What if I want USD1 as well?
**A**: Set `usd1SendParam.dstEid = BASE_EID` to bridge USD1 back. Note: Requires USD1 OFT on Base.

### Q: Can I redeem directly on Base?
**A**: No, redemption only works on Ethereum where the vault is. But with compose, it feels like a single transaction!

### Q: What chains are supported?
**A**: Currently Ethereum ↔ Base. Easy to expand to Arbitrum, Optimism, etc.

---

## Next Steps

1. ✅ Deploy WLFI OFT Adapter + OFT
2. ✅ Deploy ComposerV2
3. ✅ Configure peer connections
4. ⏳ Test with small amounts
5. ⏳ Frontend integration
6. ⏳ Expand to more chains

---

**Status**: 🚧 Ready for deployment
**Last Updated**: November 18, 2025

