# Ethereum ↔ Base Bridge Setup Guide

Complete guide to connecting EagleShareOFT on Ethereum with Base using LayerZero V2.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         ETHEREUM (Hub)                          │
├─────────────────────────────────────────────────────────────────┤
│  WLFI → EagleOVault → vEAGLE → Wrapper → EAGLE (OFT)          │
│                                             ↓                    │
│                                    EagleOVaultComposer          │
│                                             ↓                    │
│                                      LayerZero V2                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Cross-Chain Bridge
                             │
┌────────────────────────────┴────────────────────────────────────┐
│                           BASE (Spoke)                          │
├─────────────────────────────────────────────────────────────────┤
│                     EAGLE (OFT) ← LayerZero V2                 │
│                              ↓                                   │
│                 Users hold/transfer EAGLE on Base               │
│                              ↓                                   │
│                  Bridge back to Ethereum anytime                │
└─────────────────────────────────────────────────────────────────┘
```

## Deployed Contracts

### Ethereum Mainnet
- **EagleShareOFT**: `0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E`
- **Composer**: `0x3A91B3e863C0bd6948088e8A0A9B1D22d6D05da9`
- **Vault**: `0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953`
- **Wrapper**: `0x47dAc5063c526dBc6f157093DD1D62d9DE8891c5`
- **LayerZero EID**: 30101

### Base Mainnet
- **EagleShareOFT**: `0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E` (same address)
- **LayerZero EID**: 30184

## Step 1: Set Up LayerZero Peers

Run the setup script on **both chains** to establish bidirectional trust.

### On Ethereum

```bash
# Set environment variables
export ETHEREUM_RPC_URL="https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY"
export PRIVATE_KEY="your_private_key"

# Run the setup script
forge script script/layerzero/SetupEthereumBasePeers.s.sol:SetupEthereumBasePeers \
  --rpc-url $ETHEREUM_RPC_URL \
  --broadcast \
  --verify \
  -vvvv
```

### On Base

```bash
# Set environment variables
export BASE_RPC_URL="https://base-mainnet.g.alchemy.com/v2/YOUR_KEY"
export PRIVATE_KEY="your_private_key"

# Run the setup script
forge script script/layerzero/SetupEthereumBasePeers.s.sol:SetupEthereumBasePeers \
  --rpc-url $BASE_RPC_URL \
  --broadcast \
  --verify \
  -vvvv
```

## Step 2: Verify Configuration

### Check Ethereum → Base Peer

```bash
cast call 0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E \
  "peers(uint32)(bytes32)" \
  30184 \
  --rpc-url $ETHEREUM_RPC_URL
```

Expected output: `0x000000000000000000000000474ed38c256a7fa0f3b8c48496ce1102ab0ea91e`

### Check Base → Ethereum Peer

```bash
cast call 0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E \
  "peers(uint32)(bytes32)" \
  30101 \
  --rpc-url $BASE_RPC_URL
```

Expected output: `0x000000000000000000000000474ed38c256a7fa0f3b8c48496ce1102ab0ea91e`

## Step 3: Test Bridging

### Option A: Using Composer (Recommended)

The Composer on Ethereum provides high-level functions that handle everything:

```solidity
// On Ethereum: Deposit WLFI and send EAGLE to Base
composer.depositAndSend{value: msg.value}(
    wlfiAmount,           // Amount of WLFI to deposit
    SendParam({
        dstEid: 30184,    // Base EID
        to: bytes32(uint256(uint160(recipient))),
        amountLD: 0,      // Will be calculated
        minAmountLD: minAmount,
        extraOptions: "",
        composeMsg: "",
        oftCmd: ""
    }),
    refundAddress
);
```

### Option B: Direct OFT Bridge

If you already have EAGLE on Ethereum and just want to bridge:

```solidity
// Approve OFT to spend your EAGLE
EAGLE.approve(address(OFT), amount);

// Send to Base
OFT.send{value: msg.value}(
    SendParam({
        dstEid: 30184,    // Base EID
        to: bytes32(uint256(uint160(recipient))),
        amountLD: amount,
        minAmountLD: amount * 99 / 100, // 1% slippage
        extraOptions: "",
        composeMsg: "",
        oftCmd: ""
    }),
    MessagingFee(msg.value, 0),
    refundAddress
);
```

### Estimate Bridge Fee

```bash
# Get quote for bridging
cast call 0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E \
  "quoteSend((uint32,bytes32,uint256,uint256,bytes,bytes,bytes),bool)" \
  "(30184,0x000000000000000000000000YOUR_RECIPIENT_ADDRESS,1000000000000000000,0,0x,0x,0x)" \
  false \
  --rpc-url $ETHEREUM_RPC_URL
```

## Step 4: User Flows

### Flow 1: Ethereum → Base (Deposit + Bridge)

```
User Action:
  Deposit 1000 WLFI on Ethereum, receive EAGLE on Base

Steps:
  1. User approves WLFI to Composer
  2. User calls depositAndSend() with Base as destination
  3. Composer deposits WLFI to vault → gets vEAGLE
  4. Composer wraps vEAGLE → gets EAGLE
  5. Composer bridges EAGLE to Base via LayerZero
  6. User receives EAGLE on Base (~5-10 minutes)
```

### Flow 2: Base → Ethereum (Bridge + Redeem)

```
User Action:
  Bridge 100 EAGLE from Base back to Ethereum, receive WLFI

Steps:
  1. User approves EAGLE on Base
  2. User bridges EAGLE to Ethereum via OFT
  3. EAGLE arrives on Ethereum
  4. User calls unwrapAndRedeem() on Composer
  5. Composer unwraps EAGLE → gets vEAGLE
  6. Composer redeems vEAGLE → gets WLFI
  7. User receives WLFI
```

### Flow 3: Hold on Base

```
User Action:
  Keep EAGLE on Base for later use

Benefits:
  - Lower gas fees for transfers
  - Use in Base DeFi ecosystem
  - Bridge back to Ethereum anytime
  - Maintains claim to vault yield
```

## Integration Examples

### Frontend Integration (React + wagmi)

```typescript
import { useContractWrite, useAccount } from 'wagmi';
import { parseEther } from 'viem';

// Deposit on Ethereum and bridge to Base
const { write: depositAndBridge } = useContractWrite({
  address: '0x3A91B3e863C0bd6948088e8A0A9B1D22d6D05da9', // Composer
  abi: composerABI,
  functionName: 'depositAndSend',
  value: bridgeFee, // Get from quoteSend
});

// Execute
depositAndBridge({
  args: [
    parseEther('1000'), // 1000 WLFI
    {
      dstEid: 30184, // Base
      to: addressToBytes32(recipient),
      amountLD: 0,
      minAmountLD: 0,
      extraOptions: '0x',
      composeMsg: '0x',
      oftCmd: '0x',
    },
    refundAddress,
  ],
});
```

### Bridge from Base to Ethereum

```typescript
import { useContractWrite } from 'wagmi';

// Bridge EAGLE from Base back to Ethereum
const { write: bridgeToEth } = useContractWrite({
  address: '0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E', // EagleShareOFT
  abi: oftABI,
  functionName: 'send',
  value: bridgeFee,
});

// Execute
bridgeToEth({
  args: [
    {
      dstEid: 30101, // Ethereum
      to: addressToBytes32(recipient),
      amountLD: parseEther('100'), // 100 EAGLE
      minAmountLD: parseEther('99'), // 1% slippage
      extraOptions: '0x',
      composeMsg: '0x',
      oftCmd: '0x',
    },
    { nativeFee: bridgeFee, lzTokenFee: 0 },
    refundAddress,
  ],
});
```

## Security Considerations

### 1. Peer Configuration
- ✅ Both chains must configure each other as peers
- ✅ Only owner can call `setPeer`
- ✅ Verify peer addresses match exactly

### 2. Bridge Fees
- ✅ Always call `quoteSend` to get accurate fee
- ✅ Send sufficient ETH/gas for LayerZero
- ✅ Excess fees are refunded to `refundAddress`

### 3. Slippage Protection
- ✅ Set `minAmountLD` to protect against slippage
- ✅ Recommended: 1-2% slippage tolerance
- ✅ Transaction reverts if output < minAmountLD

### 4. Message Delivery
- ✅ LayerZero guarantees message delivery
- ✅ Typical time: 5-15 minutes
- ✅ Track via LayerZero Scan

## Monitoring & Support

### LayerZero Scan
Track your cross-chain messages:
- https://layerzeroscan.com/

### Check Message Status

```bash
# Get nonce for tracking
cast call 0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E \
  "outboundNonce(uint32,bytes32)(uint64)" \
  30184 \
  0x000000000000000000000000474ed38c256a7fa0f3b8c48496ce1102ab0ea91e \
  --rpc-url $ETHEREUM_RPC_URL
```

### Emergency Contacts
- LayerZero Discord: https://discord.gg/layerzero
- Eagle Team: https://t.me/Eagle_community_47

## FAQ

**Q: How long does bridging take?**
A: Typically 5-15 minutes, depending on network congestion.

**Q: Can I cancel a bridge transaction?**
A: No, once initiated it will complete. Ensure all parameters are correct.

**Q: What if I send to wrong address on Base?**
A: Transactions are irreversible. Always verify recipient address.

**Q: Are there bridge fees?**
A: Yes, LayerZero charges gas for cross-chain messaging (~$5-20 depending on gas prices).

**Q: Do I lose vault yield when bridging?**
A: No! EAGLE represents your vault position. Yield accrues whether on Ethereum or Base.

**Q: Can I bridge back from Base anytime?**
A: Yes! The bridge is bidirectional and always available.

## Troubleshooting

### Error: "Peer not set"
```bash
# Verify peer configuration
cast call 0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E \
  "peers(uint32)(bytes32)" \
  30184
```

### Error: "Insufficient fee"
```bash
# Get accurate fee quote
cast call 0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E \
  "quoteSend(...)"
```

### Error: "Slippage exceeded"
- Increase `minAmountLD` tolerance
- Try again during lower volatility

## Next Steps

1. ✅ Configure peers on both chains
2. ✅ Verify configuration
3. ✅ Test with small amounts first
4. ✅ Monitor on LayerZero Scan
5. ✅ Integrate into frontend
6. ✅ Announce to community!

## Resources

- [LayerZero V2 Docs](https://docs.layerzero.network/)
- [OFT Standard](https://docs.layerzero.network/contracts/oft)
- [Eagle Docs](https://docs.47eagle.com)
- [Base Network](https://base.org/)

