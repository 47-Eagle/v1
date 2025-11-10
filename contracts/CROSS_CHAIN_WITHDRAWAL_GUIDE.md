# Cross-Chain Withdrawal Implementation Guide

## Architecture Overview

```
┌─────────────┐         LayerZero         ┌─────────────┐
│  Arbitrum   │◄─────────────────────────►│  Ethereum   │
│             │                            │             │
│ EAGLE Tokens│  1. Burn EAGLE            │ EagleOVault │
│             │  2. Send Message           │ + Wrapper   │
│             │  3. User pays LZ fee       │             │
└─────────────┘                            └─────────────┘
                                                  │
                                                  │ 4. Mint EAGLE
                                                  │ 5. Unwrap to vEAGLE
                                                  │ 6. Withdraw to WLFI
                                                  ▼
                                            User receives WLFI
```

## Contract Architecture

### EagleShareOFT.sol
- Main OFT contract deployed on all chains
- Handles both standard bridging AND atomic withdrawals
- Manages share price synchronization

### Key Features

1. **Standard Bridge** (EAGLE ↔ EAGLE)
   - Simple cross-chain transfer
   - No unwrapping

2. **Atomic Withdrawal** (EAGLE → WLFI cross-chain)
   - One transaction from user
   - Automatic unwrapping on destination
   - Slippage protection

3. **Security**
   - Daily withdrawal limits per chain
   - Pausable in emergencies
   - Share price staleness checks

## Smart Contract Usage

### 1. Standard Bridge (EAGLE → EAGLE)

```solidity
// User wants to bridge EAGLE from Arbitrum to Base
// No unwrapping, just moving tokens

import { MessagingFee } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";

// Quote the fee
bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);
SendParam memory sendParam = SendParam({
    dstEid: BASE_EID, // 30184
    to: addressToBytes32(msg.sender),
    amountLD: 1000 ether, // 1000 EAGLE
    minAmountLD: 990 ether, // Allow 1% slippage
    extraOptions: options,
    composeMsg: "",
    oftCmd: ""
});

MessagingFee memory fee = eagle.quoteSend(sendParam, false);

// Execute bridge
eagle.send{value: fee.nativeFee}(sendParam, fee, msg.sender);
```

### 2. Atomic Cross-Chain Withdrawal (EAGLE → WLFI)

```solidity
// User wants to withdraw EAGLE from Arbitrum and receive WLFI on Ethereum

// Quote withdrawal fee
bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(500000, 0);
MessagingFee memory fee = eagle.quoteWithdrawal(
    ETHEREUM_EID, // 30101
    1000 ether, // 1000 EAGLE
    true, // unwrapToWLFI
    options
);

// Execute cross-chain withdrawal
eagle.withdrawCrossChain{value: fee.nativeFee}(
    ETHEREUM_EID,
    msg.sender, // Recipient on Ethereum
    1000 ether, // Amount of EAGLE
    true, // unwrapToWLFI
    980 ether, // minAmountOut (slippage protection)
    options
);

// User receives WLFI on Ethereum after ~2-5 minutes
```

## Frontend Integration

### TypeScript/React Integration

```typescript
import { ethers } from 'ethers';
import { Options } from '@layerzerolabs/lz-v2-utilities';

// ABI excerpt
const EAGLE_ABI = [
  "function withdrawCrossChain(uint32 dstEid, address recipient, uint256 amount, bool unwrapToWLFI, uint256 minAmountOut, bytes extraOptions) payable returns (tuple(bytes32 guid, uint64 nonce, tuple(uint256 nativeFee, uint256 lzTokenFee) fee))",
  "function quoteWithdrawal(uint32 dstEid, uint256 amount, bool unwrapToWLFI, bytes extraOptions) view returns (tuple(uint256 nativeFee, uint256 lzTokenFee))",
  "function calculateWithdrawalOutput(uint256 eagleAmount) view returns (uint256)",
  "function getRemainingDailyCapacity(uint16 chainId) view returns (uint256)",
  "event CrossChainWithdrawalInitiated(address indexed sender, uint16 indexed dstChainId, address indexed recipient, uint256 amount, bool unwrapToWLFI)",
];

// Chain IDs (LayerZero V2 Endpoint IDs)
const CHAIN_IDS = {
  ETHEREUM: 30101,
  ARBITRUM: 30110,
  BASE: 30184,
  OPTIMISM: 30111,
};

// Contract addresses
const EAGLE_ADDRESSES = {
  1: '0x...', // Ethereum
  42161: '0x...', // Arbitrum
  8453: '0x...', // Base
  10: '0x...', // Optimism
};

interface WithdrawalQuote {
  bridgeFee: bigint;
  wlfiOutput: bigint;
  totalCost: bigint;
}

/**
 * Quote cross-chain withdrawal
 */
async function quoteWithdrawal(
  provider: ethers.Provider,
  sourceChainId: number,
  destChainId: number,
  eagleAmount: bigint
): Promise<WithdrawalQuote> {
  const eagle = new ethers.Contract(
    EAGLE_ADDRESSES[sourceChainId],
    EAGLE_ABI,
    provider
  );
  
  // Build LayerZero options (gas for destination execution)
  const options = Options.newOptions()
    .addExecutorLzReceiveOption(500000, 0) // 500k gas for unwrap + withdraw
    .toHex();
  
  // Get destination chain endpoint ID
  const destEid = Object.entries(CHAIN_IDS).find(
    ([_, id]) => id === destChainId
  )?.[1] || CHAIN_IDS.ETHEREUM;
  
  // Quote bridge fee
  const fee = await eagle.quoteWithdrawal(
    destEid,
    eagleAmount,
    true, // unwrapToWLFI
    options
  );
  
  // Calculate expected WLFI output
  const wlfiOutput = await eagle.calculateWithdrawalOutput(eagleAmount);
  
  return {
    bridgeFee: fee.nativeFee,
    wlfiOutput: wlfiOutput,
    totalCost: fee.nativeFee, // User pays in ETH/native token
  };
}

/**
 * Execute cross-chain withdrawal
 */
async function executeCrossChainWithdrawal(
  signer: ethers.Signer,
  sourceChainId: number,
  destChainId: number,
  eagleAmount: bigint,
  recipient: string,
  slippageBps: number = 100 // 1% slippage
): Promise<ethers.TransactionResponse> {
  const eagle = new ethers.Contract(
    EAGLE_ADDRESSES[sourceChainId],
    EAGLE_ABI,
    signer
  );
  
  // Calculate minimum output with slippage
  const expectedOutput = await eagle.calculateWithdrawalOutput(eagleAmount);
  const minAmountOut = (expectedOutput * BigInt(10000 - slippageBps)) / BigInt(10000);
  
  // Build options
  const options = Options.newOptions()
    .addExecutorLzReceiveOption(500000, 0)
    .toHex();
  
  // Get destination endpoint ID
  const destEid = Object.entries(CHAIN_IDS).find(
    ([_, id]) => id === destChainId
  )?.[1] || CHAIN_IDS.ETHEREUM;
  
  // Quote fee
  const fee = await eagle.quoteWithdrawal(
    destEid,
    eagleAmount,
    true,
    options
  );
  
  // Execute withdrawal
  const tx = await eagle.withdrawCrossChain(
    destEid,
    recipient,
    eagleAmount,
    true, // unwrapToWLFI
    minAmountOut,
    options,
    { value: fee.nativeFee }
  );
  
  return tx;
}

/**
 * Check daily withdrawal capacity
 */
async function checkWithdrawalCapacity(
  provider: ethers.Provider,
  sourceChainId: number,
  destChainId: number
): Promise<bigint> {
  const eagle = new ethers.Contract(
    EAGLE_ADDRESSES[sourceChainId],
    EAGLE_ABI,
    provider
  );
  
  const destEid = Object.entries(CHAIN_IDS).find(
    ([_, id]) => id === destChainId
  )?.[1] || CHAIN_IDS.ETHEREUM;
  
  return await eagle.getRemainingDailyCapacity(destEid);
}
```

### React Component Example

```tsx
import React, { useState, useEffect } from 'react';
import { useAccount, useProvider, useSigner } from 'wagmi';
import { parseEther, formatEther } from 'viem';

export function CrossChainWithdrawalForm() {
  const { address, chainId } = useAccount();
  const provider = useProvider();
  const { data: signer } = useSigner();
  
  const [amount, setAmount] = useState('');
  const [destChain, setDestChain] = useState<'ethereum' | 'arbitrum'>('ethereum');
  const [quote, setQuote] = useState<WithdrawalQuote | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Auto-quote when amount changes
  useEffect(() => {
    if (amount && chainId) {
      quoteWithdrawal(provider, chainId, DEST_CHAIN_MAP[destChain], parseEther(amount))
        .then(setQuote)
        .catch(console.error);
    }
  }, [amount, destChain, chainId, provider]);
  
  const handleWithdraw = async () => {
    if (!signer || !amount || !chainId) return;
    
    setLoading(true);
    try {
      const tx = await executeCrossChainWithdrawal(
        signer,
        chainId,
        DEST_CHAIN_MAP[destChain],
        parseEther(amount),
        address!,
        100 // 1% slippage
      );
      
      await tx.wait();
      alert('Withdrawal initiated! Check destination chain in 2-5 minutes.');
    } catch (error) {
      console.error('Withdrawal failed:', error);
      alert('Withdrawal failed. See console for details.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-4">
      <h3 className="text-xl font-bold">Cross-Chain Withdrawal</h3>
      
      {/* Amount Input */}
      <div>
        <label className="block text-sm font-medium mb-2">Amount (EAGLE)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.0"
          className="w-full px-4 py-2 border rounded-lg"
        />
      </div>
      
      {/* Destination Chain */}
      <div>
        <label className="block text-sm font-medium mb-2">Withdraw To</label>
        <select
          value={destChain}
          onChange={(e) => setDestChain(e.target.value as any)}
          className="w-full px-4 py-2 border rounded-lg"
        >
          <option value="ethereum">Ethereum (WLFI)</option>
          <option value="arbitrum">Arbitrum (WLFI)</option>
        </select>
      </div>
      
      {/* Quote Display */}
      {quote && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>You will receive:</span>
            <span className="font-bold">{formatEther(quote.wlfiOutput)} WLFI</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Bridge Fee:</span>
            <span>{formatEther(quote.bridgeFee)} ETH</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>Est. Time:</span>
            <span>2-5 minutes</span>
          </div>
        </div>
      )}
      
      {/* Withdraw Button */}
      <button
        onClick={handleWithdraw}
        disabled={loading || !amount || !quote}
        className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-lg disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Withdraw to ' + destChain}
      </button>
      
      {/* Info */}
      <div className="text-xs text-gray-500">
        <p>• 2% withdrawal fee applies</p>
        <p>• Slippage tolerance: 1%</p>
        <p>• Funds arrive on {destChain} in 2-5 minutes</p>
      </div>
    </div>
  );
}
```

## Testing Flow

### Local Testing (Hardhat/Foundry)

```solidity
// Test atomic withdrawal
function testCrossChainWithdrawal() public {
    // Setup
    uint256 eagleAmount = 1000 ether;
    uint256 expectedWLFI = 980 ether; // After 2% fee
    
    // Mint EAGLE on Arbitrum to user
    vm.prank(minter);
    eagleArbitrum.mint(user, eagleAmount);
    
    // User approves and initiates withdrawal
    vm.startPrank(user);
    eagleArbitrum.approve(address(eagleArbitrum), eagleAmount);
    
    bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(500000, 0);
    MessagingFee memory fee = eagleArbitrum.quoteWithdrawal(
        ETHEREUM_EID,
        eagleAmount,
        true,
        options
    );
    
    vm.expectEmit(true, true, true, true);
    emit CrossChainWithdrawalInitiated(user, ETHEREUM_EID, user, eagleAmount, true);
    
    eagleArbitrum.withdrawCrossChain{value: fee.nativeFee}(
        ETHEREUM_EID,
        user,
        eagleAmount,
        true,
        expectedWLFI,
        options
    );
    vm.stopPrank();
    
    // Simulate LayerZero message delivery
    vm.prank(lzEndpoint);
    eagleEthereum.lzReceive(
        Origin({srcEid: ARBITRUM_EID, sender: bytes32(uint256(uint160(address(eagleArbitrum)))), nonce: 1}),
        bytes32(0),
        abi.encode(PT_WITHDRAW, WithdrawalRequest({
            recipient: user,
            amount: eagleAmount,
            unwrapToWLFI: true,
            minAmountOut: expectedWLFI
        })),
        address(0),
        ""
    );
    
    // Verify user received WLFI on Ethereum
    assertEq(wlfi.balanceOf(user), expectedWLFI);
}
```

## Security Considerations

### 1. Daily Withdrawal Limits
```solidity
// Set conservative limits initially
eagle.setWithdrawalLimit(ARBITRUM_EID, 1_000_000 ether); // 1M EAGLE/day
```

### 2. Share Price Updates
```solidity
// Update share price before large withdrawals
eagle.updateSharePriceFromVault();

// Broadcast to all chains
eagle.broadcastSharePrice([ARBITRUM_EID, BASE_EID, OPTIMISM_EID], options);
```

### 3. Emergency Pause
```solidity
// In case of exploit or bug
eagle.pause(); // Stops all cross-chain operations
```

### 4. Slippage Protection
- Always set `minAmountOut` to protect users
- Typical: 0.5-2% slippage tolerance
- Warn users if share price is stale

## Gas Optimization

### Estimated Gas Costs

| Operation | Source Chain | Destination Chain | Total Gas |
|-----------|--------------|-------------------|-----------|
| Standard Bridge | ~150k gas | ~100k gas | ~250k |
| Atomic Withdrawal | ~200k gas | ~500k gas | ~700k |

### LayerZero Fees
- Mainnet → Arbitrum: ~$5-15
- Arbitrum → Mainnet: ~$2-8
- L2 → L2: ~$1-3

## Monitoring & Events

### Key Events to Track

```typescript
// Frontend event listeners
eagle.on('CrossChainWithdrawalInitiated', (sender, dstChain, recipient, amount, unwrapToWLFI) => {
  console.log(`Withdrawal initiated: ${amount} EAGLE → Chain ${dstChain}`);
  // Show pending notification to user
});

eagle.on('CrossChainWithdrawalReceived', (srcChain, recipient, amount, wlfiReceived) => {
  console.log(`Withdrawal completed: Received ${wlfiReceived} WLFI`);
  // Show success notification
});

eagle.on('SharePriceUpdated', (oldPrice, newPrice, timestamp) => {
  console.log(`Share price updated: ${oldPrice} → ${newPrice}`);
  // Update UI displays
});
```

## Troubleshooting

### Common Issues

1. **"StalePrice Data" Error**
   - Share price hasn't been updated recently
   - Call `updateSharePriceFromVault()` on main chain
   - Or wait for automatic sync

2. **"ExceedsWithdrawalLimit"**
   - Daily limit reached for destination chain
   - Either wait 24h or withdraw to different chain
   - Or split into multiple smaller withdrawals

3. **"SlippageExceeded"**
   - Share price changed during bridge
   - Increase `minAmountOut` tolerance
   - Or try again with fresh quote

4. **Transaction Stuck**
   - Check LayerZero Scan: https://layerzeroscan.com
   - May need to manually retry delivery
   - Contact LayerZero support if >1 hour

## Next Steps

1. ✅ Deploy contracts on all chains
2. ✅ Configure peers and security
3. ✅ Integrate with frontend
4. ✅ Test on testnet extensively
5. ✅ Audit smart contracts
6. ✅ Deploy to mainnet
7. ✅ Monitor and optimize

## Resources

- LayerZero Docs: https://docs.layerzero.network/
- LayerZero Scan: https://layerzeroscan.com/
- OFT Standard: https://docs.layerzero.network/contracts/oft
- Our Contracts: [Link to GitHub]

---

**Need Help?** Open an issue or reach out to the team!

