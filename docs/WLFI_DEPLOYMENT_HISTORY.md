# WLFI OFT Deployment History Analysis

## Previous Deployment (Old Address)

**Base Contract**: `0x4769df3A...5DFA96DC1` (old WLFI OFT)

### Transaction Sequence (From BaseScan)

#### On Base Network:
1. **Set Delegate** (Tx: 0x9da1ad9e...)
   - Contract: 0x4769df3A...5DFA96DC1
   - Action: Set delegate to deployer

2. **Set Peer** (Tx: 0xdde14436...)
   - Contract: 0x4769df3A...5DFA96DC1
   - Action: Set peer to Ethereum adapter

3. **Set Enforced Options** (Tx: 0xcb5aae6f...)
   - Contract: 0x4769df3A...5DFA96DC1
   - Action: Set gas options for cross-chain

#### On Ethereum Network (Adapter):
4. **Set Delegate** (Tx: 0x4c5421a6...)
   - Contract: 0x47d5BB59...267BfA8FE (Ethereum adapter)
   - Action: Set delegate

5. **Set Enforced Options** (Tx: 0xfda9924e...)
   - Contract: 0x47d5BB59...267BfA8FE
   - Action: Set gas options

6. **Set Send Library** (Tx: 0x979424011...)
   - Target: LayerZero EndpointV2
   - Action: Configure send library

7. **Set Peer** (Tx: 0xa0bdec91...)
   - Contract: 0x47d5BB59...267BfA8FE
   - Action: Set peer to Base OFT

### Configuration Order

```
Base OFT:
1. setDelegate()
2. setPeer()
3. setEnforcedOptions()

Ethereum Adapter:
1. setDelegate()
2. setEnforcedOptions()
3. setSendLibrary() [via Endpoint]
4. setPeer()
```

## New Deployment (Current Address)

**Base Contract**: `0x47af3595BFBE6c86E59a13d5db91AEfbFF0eA91e` (new WLFI OFT)
**Ethereum Adapter**: `0x2437F6555350c131647daA0C655c4B49A7aF3621`

### What We've Done So Far:
✅ Set Peer on both chains

### What's Missing:
❌ Set Delegate on both chains
❌ Set Enforced Options on both chains
❌ Set Send Library on both chains (via Endpoint)
❌ Set Receive Library on both chains (via Endpoint)
❌ Set DVN Config (via SendLibrary)
❌ Set Executor Config (via SendLibrary)

## Key Insights

1. **Delegate First**: Must be set before other configs
2. **Peer Required**: For cross-chain communication
3. **Enforced Options**: Gas settings for execution
4. **Libraries via Endpoint**: Send/Receive libs set through Endpoint contract
5. **DVN/Executor via SendLib**: Advanced configs set through SendLibrary

## Recommended Setup Sequence

### For New WLFI OFT:

#### Base (0x47af3595BFBE6c86E59a13d5db91AEfbFF0eA91e):
```bash
1. setDelegate(deployer)           # Already done via peer setup?
2. setPeer(30101, ethereum_adapter) # ✅ Already done
3. setEnforcedOptions(...)          # ❌ Need to do
```

#### Ethereum (0x2437F6555350c131647daA0C655c4B49A7aF3621):
```bash
1. setDelegate(deployer)            # ❌ Need to do
2. setPeer(30184, base_oft)         # ✅ Already done
3. setEnforcedOptions(...)          # ❌ Need to do
4. endpoint.setSendLibrary(...)     # ❌ Need to do
5. endpoint.setReceiveLibrary(...)  # ❌ Need to do
6. sendLib.setConfig(...) [DVN]     # ❌ Need to do
7. sendLib.setConfig(...) [Executor]# ❌ Need to do
```

## Action Items

Run these in order:

1. **Verify current state**:
   ```bash
   npx tsx scripts/wlfi/verify-and-configure-wlfi.ts
   ```

2. **Set delegate, enforced options** (auto):
   ```bash
   npx tsx scripts/wlfi/verify-and-configure-wlfi.ts
   ```

3. **Set libraries, DVN, executor** (manual):
   ```bash
   ./scripts/configure-wlfi-lz.sh
   ```

---

**Analysis Date**: November 19, 2025
**Based On**: BaseScan transaction history for old WLFI OFT
