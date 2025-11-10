# ⚡ Atomic Cross-Chain Withdrawal - Quick Reference

## What is it?

A one-click solution for users to withdraw their EAGLE tokens from any chain and receive WLFI on their destination chain of choice.

## User Flow

```
┌──────────────────────────────────────────────────────────────┐
│  User on Arbitrum wants WLFI on Ethereum                     │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────┐
         │  Click "Withdraw to Ethereum"  │
         │  Enter amount: 1000 EAGLE      │
         │  Pay bridge fee: ~$5           │
         │  Confirm transaction           │
         └────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  System automatically: │
              │  1. Burns EAGLE (Arb)  │
              │  2. Sends LZ message   │
              │  3. Unwraps on Ethereum│
              │  4. Withdraws from vault│
              │  5. Sends WLFI to user │
              └───────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────┐
         │  User receives ~980 WLFI       │
         │  on Ethereum (2% fee)          │
         │  Time: 2-5 minutes             │
         └────────────────────────────────┘
```

## Key Benefits

### For Users ✅
- **One Transaction**: No need to bridge then unwrap separately
- **Any Chain**: Withdraw from any L2, receive on any supported chain
- **Automatic**: System handles all complexity
- **Protected**: Slippage protection and daily limits for security

### For Protocol ✅
- **Better UX**: Simplifies complex cross-chain operations
- **More Liquidity**: Easier to move funds where needed
- **Competitive Edge**: Few vaults offer atomic cross-chain withdrawals
- **Secure**: Built-in rate limiting and pausability

## Quick Integration

### Smart Contract Call

```solidity
// Withdraw 1000 EAGLE from Arbitrum → WLFI on Ethereum
eagle.withdrawCrossChain{value: bridgeFee}(
    ETHEREUM_EID,      // Destination: Ethereum
    msg.sender,        // Recipient
    1000 ether,        // Amount: 1000 EAGLE
    true,              // unwrapToWLFI: true
    980 ether,         // minAmountOut: 980 WLFI (2% slippage)
    lzOptions          // LayerZero execution options
);
```

### Frontend Integration

```typescript
import { executeCrossChainWithdrawal } from './eagleSDK';

// Execute withdrawal
const tx = await executeCrossChainWithdrawal(
  signer,
  42161,              // Source: Arbitrum
  1,                  // Dest: Ethereum
  parseEther('1000'), // 1000 EAGLE
  userAddress,        // Recipient
  100                 // 1% slippage
);

await tx.wait();
console.log('Withdrawal initiated!');
```

## Costs Breakdown

| Item | Cost | Notes |
|------|------|-------|
| Withdrawal Fee | 2% of assets | Protocol fee |
| Bridge Fee | $2-15 | LayerZero cost (varies by chain) |
| Gas (Source) | ~$1-5 | To initiate on L2 |
| Gas (Dest) | $0 | Covered by relayer |
| **Total Example** | **~$25 on 1000 WLFI** | **~2.5%** |

## Safety Features

### 1️⃣ Daily Limits
- Maximum amount that can be withdrawn to each chain per day
- Prevents large-scale exploits
- Configurable per chain

### 2️⃣ Slippage Protection  
- User sets minimum acceptable output
- Transaction reverts if not met
- Protects against price manipulation

### 3️⃣ Share Price Sync
- Automatic synchronization across chains
- Staleness checks (max 1 hour old)
- Manual override available

### 4️⃣ Emergency Pause
- Admin can pause all withdrawals
- Per-chain or global pause
- Quick response to incidents

## Architecture Components

### Contracts
1. **EagleShareOFT.sol** - Main omnichain token
2. **EagleOVault.sol** - Vault (Ethereum only)
3. **EagleVaultWrapper.sol** - Share wrapper
4. **LayerZero Endpoint** - Cross-chain messaging

### Flow Diagram

```
Source Chain (Arbitrum):
┌─────────────────────┐
│ EagleShareOFT       │
│ - Burn user's EAGLE │
│ - Encode message    │
│ - Send via LZ       │
└──────────┬──────────┘
           │ LayerZero Message
           │
Destination Chain (Ethereum):
┌──────────▼──────────┐
│ EagleShareOFT       │
│ - Receive message   │
│ - Call wrapper      │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ EagleVaultWrapper   │
│ - Unwrap EAGLE      │
│ - Get vEAGLE shares │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ EagleOVault         │
│ - Redeem vEAGLE     │
│ - Return WLFI       │
└──────────┬──────────┘
           │
      User's Wallet ✅
```

## Comparison: Standard vs Atomic

### Standard Bridge (OLD Way)
```
Step 1: Bridge EAGLE (Arbitrum → Ethereum)
├─ User Action: Initiate bridge
├─ Time: 2-5 minutes
├─ Gas: $1-5
└─ Result: EAGLE on Ethereum

Step 2: Unwrap EAGLE → vEAGLE
├─ User Action: Call unwrap()
├─ Time: ~1 minute
├─ Gas: $5-15
└─ Result: vEAGLE on Ethereum

Step 3: Withdraw vEAGLE → WLFI
├─ User Action: Call withdraw()
├─ Time: ~1 minute
├─ Gas: $10-30
└─ Result: WLFI on Ethereum

Total: 3 transactions, 3-7 minutes, $16-50 gas
User needs ETH on destination chain!
```

### Atomic Withdrawal (NEW Way)
```
Step 1: Atomic Withdrawal
├─ User Action: withdrawCrossChain()
├─ Time: 2-5 minutes
├─ Gas: $3-20 (all-inclusive)
└─ Result: WLFI on Ethereum

Total: 1 transaction, 2-5 minutes, $3-20 gas
No ETH needed on destination! ✅
```

## Supported Routes (Initially)

| From | To | Unwrap to WLFI |
|------|-----|----------------|
| Arbitrum | Ethereum | ✅ Yes |
| Base | Ethereum | ✅ Yes |
| Optimism | Ethereum | ✅ Yes |
| Ethereum | Arbitrum | ❌ No vault on Arbitrum* |
| Ethereum | Base | ❌ No vault on Base* |

*Can bridge EAGLE, but not unwrap to WLFI (unless vault deployed)

## Development Roadmap

### Phase 1: Ethereum ↔ L2s ✅
- [x] Atomic withdrawal from L2s to Ethereum
- [x] Standard EAGLE bridging between all chains
- [x] Security features (limits, pause, slippage)

### Phase 2: Multi-Vault (Future)
- [ ] Deploy vaults on L2s (Arbitrum, Base)
- [ ] Enable L2 → L2 atomic withdrawals
- [ ] Cross-chain rebalancing

### Phase 3: Advanced (Future)
- [ ] Flash withdrawal (instant liquidity)
- [ ] Batch withdrawals (gas optimization)
- [ ] Auto-routing (best path selection)

## FAQs

**Q: Can I withdraw EAGLE from Arbitrum to Optimism?**  
A: Yes, but you'll receive EAGLE (not WLFI) unless a vault is deployed on Optimism.

**Q: What happens if the vault doesn't have enough WLFI?**  
A: Transaction will revert. Check vault liquidity before large withdrawals.

**Q: Can I cancel a withdrawal?**  
A: No, once initiated it's irreversible. Make sure details are correct!

**Q: What if LayerZero message fails?**  
A: Rare, but you can manually retry via LayerZero Scan.

**Q: Is there a minimum withdrawal amount?**  
A: No hard minimum, but consider gas costs make tiny withdrawals inefficient.

**Q: Can I withdraw to a different address?**  
A: Yes! Set custom recipient address in `withdrawCrossChain()`.

## Security Audit Status

- [ ] Code complete
- [ ] Internal review
- [ ] External audit scheduled
- [ ] Bug bounty program
- [ ] Mainnet deployment

## Support & Resources

- 📚 Full Guide: [CROSS_CHAIN_WITHDRAWAL_GUIDE.md](./CROSS_CHAIN_WITHDRAWAL_GUIDE.md)
- 🔗 LayerZero Docs: https://docs.layerzero.network
- 🔍 LayerZero Scan: https://layerzeroscan.com
- 🐛 Report Issues: [GitHub Issues]
- 💬 Discord: [Your Discord]

---

**Built with ❤️ for the Eagle community** 🦅

