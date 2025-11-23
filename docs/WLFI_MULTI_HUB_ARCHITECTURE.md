# WLFI Multi-Hub Architecture

## Overview

Base WLFI OFT will be **interoperable with BOTH Ethereum and BNB Chain**, allowing users to bridge WLFI from either chain to Base.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    WLFI TOKEN ECOSYSTEM                      │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐                            ┌──────────────────┐
│   ETHEREUM       │                            │   BNB CHAIN      │
│                  │                            │                  │
│  Native WLFI     │                            │  Native WLFI     │
│  0xdA5e...BeF6   │                            │  0x4747...DEeA   │
│                  │                            │                  │
│       ↓          │                            │       ↓          │
│                  │                            │                  │
│  WLFI Adapter    │                            │  WLFI Adapter    │
│  (Lock/Unlock)   │                            │  (Lock/Unlock)   │
│  0x2437...3621   │                            │  [TO DEPLOY]     │
│                  │                            │                  │
└────────┬─────────┘                            └────────┬─────────┘
         │                                               │
         │ LayerZero                         LayerZero  │
         │ EID: 30101                        EID: 30102 │
         │                                               │
         └───────────────────┬───────────────────────────┘
                             │
                             ↓
                    ┌────────────────┐
                    │     BASE       │
                    │                │
                    │  WLFI OFT      │
                    │  0x47d5...a8FE │
                    │  (Mint/Burn)   │
                    │                │
                    │  Peers:        │
                    │  - Ethereum    │
                    │  - BNB Chain   │
                    └────────────────┘
```

---

## Key Concepts

### Dual-Peer OFT
Base WLFI OFT will have **two peers**:
- **Ethereum Adapter** (EID 30101): `0x2437F6555350c131647daA0C655c4B49A7aF3621`
- **BNB Chain Adapter** (EID 30102): `[TO DEPLOY]`

### Unified Supply
All WLFI on Base (whether bridged from Ethereum or BNB Chain) is **fungible**:
- 1 WLFI from Ethereum = 1 WLFI on Base
- 1 WLFI from BNB Chain = 1 WLFI on Base
- Users can bridge from either chain and use the same token on Base

### Balance Tracking
```
Base WLFI Total Supply = 
  WLFI locked in Ethereum Adapter + 
  WLFI locked in BNB Chain Adapter
```

---

## Deployment Plan

### Phase 1: Ethereum → Base (Current)
✅ Already set up:
- WLFI Adapter on Ethereum
- WLFI OFT on Base
- Peer: Ethereum ↔ Base

### Phase 2: BNB Chain → Base (NEW)
Need to deploy:
1. **WLFI Adapter on BNB Chain**
   - Wraps native BNB Chain WLFI (`0x47474747477b199288bF72a1D702f7Fe0Fb1DEeA`)
   - Same contract as Ethereum adapter
   
2. **Configure Base OFT**
   - Add BNB Chain peer (EID 30102)
   - Set enforced options for BNB ↔ Base
   
3. **Configure BNB Adapter**
   - Set Base peer (EID 30184)
   - Set enforced options for Base ↔ BNB

---

## User Flows

### Bridge from Ethereum to Base
```
User on Ethereum
  ↓
Approve WLFI to Ethereum Adapter
  ↓
Call send() on Ethereum Adapter
  ↓
WLFI locked in Ethereum Adapter
  ↓
LayerZero message sent
  ↓
WLFI minted on Base OFT
  ↓
User receives WLFI on Base
```

### Bridge from BNB Chain to Base
```
User on BNB Chain
  ↓
Approve WLFI to BNB Adapter
  ↓
Call send() on BNB Adapter
  ↓
WLFI locked in BNB Adapter
  ↓
LayerZero message sent
  ↓
WLFI minted on Base OFT
  ↓
User receives WLFI on Base
```

### Bridge from Base to Ethereum
```
User on Base
  ↓
Call send(eid=30101) on Base OFT
  ↓
WLFI burned on Base
  ↓
LayerZero message sent
  ↓
WLFI unlocked from Ethereum Adapter
  ↓
User receives WLFI on Ethereum
```

### Bridge from Base to BNB Chain
```
User on Base
  ↓
Call send(eid=30102) on Base OFT
  ↓
WLFI burned on Base
  ↓
LayerZero message sent
  ↓
WLFI unlocked from BNB Adapter
  ↓
User receives WLFI on BNB Chain
```

---

## Technical Implementation

### Base WLFI OFT - Multiple Peers

```solidity
// In WLFIOFT.sol

// Ethereum peer
peers(30101) = 0x00...2437F6555350c131647daA0C655c4B49A7aF3621

// BNB Chain peer
peers(30102) = 0x00...[BNB_ADAPTER_ADDRESS]
```

### Verification with Multiple Peers

Users need to verify BOTH peers:

```bash
# Check Ethereum peer
cast call 0x47d5BB59484639A7E66f480DeF84cc1267BfA8FE \
  "peers(uint32)(bytes32)" 30101 \
  --rpc-url $BASE_RPC_URL

# Check BNB Chain peer
cast call 0x47d5BB59484639A7E66f480DeF84cc1267BfA8FE \
  "peers(uint32)(bytes32)" 30102 \
  --rpc-url $BASE_RPC_URL
```

---

## Security Considerations

### 1. Supply Consistency
**Invariant**: `Base Supply = Ethereum Locked + BNB Locked`

Monitor:
```bash
# Base supply
cast call 0x47d5BB59484639A7E66f480DeF84cc1267BfA8FE \
  "totalSupply()(uint256)" --rpc-url $BASE_RPC_URL

# Ethereum locked
cast call 0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6 \
  "balanceOf(address)(uint256)" 0x2437F6555350c131647daA0C655c4B49A7aF3621 \
  --rpc-url $ETHEREUM_RPC_URL

# BNB locked
cast call 0x47474747477b199288bF72a1D702f7Fe0Fb1DEeA \
  "balanceOf(address)(uint256)" [BNB_ADAPTER] \
  --rpc-url $BNB_RPC_URL
```

### 2. Peer Verification
Both peers must be authentic adapters, not malicious contracts.

### 3. Ownership
All contracts (Ethereum Adapter, BNB Adapter, Base OFT) should have same owner/multisig.

---

## Update Contracts

### WLFIOFT.sol Updates Needed

```solidity
// Add BNB Chain EID
uint32 public constant BNB_CHAIN_EID = 30102;

// Add BNB Adapter address (after deployment)
address public constant WLFI_ADAPTER_BNB = [TO_BE_DEPLOYED];

// Update verifyAuthenticity() to check BOTH peers
function verifyAuthenticity() external view returns (bool isAuthentic, bool[4] memory checks) {
    checks[0] = address(registry) == EAGLE_REGISTRY;
    checks[1] = peers(ETHEREUM_EID) == bytes32(uint256(uint160(WLFI_ADAPTER_ETHEREUM)));
    checks[2] = peers(BNB_CHAIN_EID) == bytes32(uint256(uint160(WLFI_ADAPTER_BNB)));
    checks[3] = EAGLE_SHARE_OFT.code.length > 0;
    
    isAuthentic = checks[0] && checks[1] && checks[2] && checks[3];
}

// Update getChainInfo()
function getChainInfo() external pure returns (
    string memory connectedChains,
    address ethereumAdapter,
    address bnbAdapter
) {
    return (
        "Ethereum and BNB Chain (both via LayerZero)",
        WLFI_ADAPTER_ETHEREUM,
        WLFI_ADAPTER_BNB
    );
}
```

---

## Deployment Steps

### Step 1: Deploy BNB Chain Adapter
```bash
# On BNB Chain
forge script script/layerzero/DeployWLFIAdapter.s.sol \
  --rpc-url $BNB_RPC_URL \
  --broadcast \
  --verify
```

### Step 2: Configure BNB ↔ Base Peers
```bash
# BNB → Base
cast send [BNB_ADAPTER] \
  "setPeer(uint32,bytes32)" \
  30184 \
  0x00000000000000000000000047d5BB59484639A7E66f480DeF84cc1267BfA8FE \
  --rpc-url $BNB_RPC_URL --private-key $PRIVATE_KEY

# Base → BNB
cast send 0x47d5BB59484639A7E66f480DeF84cc1267BfA8FE \
  "setPeer(uint32,bytes32)" \
  30102 \
  0x00000000000000000000000[BNB_ADAPTER] \
  --rpc-url $BASE_RPC_URL --private-key $PRIVATE_KEY
```

### Step 3: Set Enforced Options
```bash
# BNB adapter enforced options
cast send [BNB_ADAPTER] \
  "setEnforcedOptions((uint32,uint16,bytes)[])" \
  "[(30184,1,0x00030100110100000000000000000000000000030d40)]" \
  --rpc-url $BNB_RPC_URL --private-key $PRIVATE_KEY

# Base OFT enforced options for BNB
cast send 0x47d5BB59484639A7E66f480DeF84cc1267BfA8FE \
  "setEnforcedOptions((uint32,uint16,bytes)[])" \
  "[(30102,1,0x00030100110100000000000000000000000000030d40)]" \
  --rpc-url $BASE_RPC_URL --private-key $PRIVATE_KEY
```

### Step 4: Configure LayerZero DVNs/Executors
Use same pattern as Ethereum setup.

### Step 5: Test Bridges
```bash
# Test BNB → Base
# Test Base → BNB
# Test Ethereum → Base
# Test Base → Ethereum
```

---

## Benefits

### 1. Maximum Liquidity
Users on both Ethereum and BNB Chain can access Base ecosystem.

### 2. Unified Token
All WLFI on Base is fungible regardless of source chain.

### 3. Flexible Routing
Users can:
- Bridge from Ethereum to Base, use DeFi, bridge back to BNB
- Bridge from BNB to Base, use DeFi, bridge back to Ethereum
- Aggregate liquidity from both chains on Base

### 4. Lower Fees for BNB Users
BNB Chain gas is cheaper than Ethereum, making it more accessible.

---

## Cost Estimate

| Action | Network | Est. Cost |
|--------|---------|-----------|
| Deploy BNB Adapter | BNB | $0.50 |
| Set peer (BNB) | BNB | $0.10 |
| Set peer (Base) | Base | $0.001 |
| Set options (BNB) | BNB | $0.10 |
| Set options (Base) | Base | $0.001 |
| Configure DVNs (BNB) | BNB | $0.50 |
| **Total** | — | **~$1.20** |

---

## Timeline

1. **Deploy BNB Adapter**: 10 minutes
2. **Configure peers**: 10 minutes
3. **Set enforced options**: 10 minutes
4. **Configure DVNs**: 15 minutes
5. **Test all paths**: 30 minutes
6. **Update docs**: 20 minutes

**Total**: ~1.5 hours

---

## Next Steps

1. Confirm BNB Chain WLFI address: `0x47474747477b199288bF72a1D702f7Fe0Fb1DEeA`
2. Update WLFIOFT contract with BNB constants
3. Deploy WLFI Adapter on BNB Chain
4. Configure all peers
5. Test thoroughly
6. Update documentation
7. Announce to users

---

**Status**: Ready to implement  
**Architecture**: Dual-hub (Ethereum + BNB) → Single spoke (Base)  
**Type**: Multi-peer LayerZero OFT

