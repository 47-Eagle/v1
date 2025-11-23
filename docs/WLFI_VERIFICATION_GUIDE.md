# WLFI OFT Verification Guide

## IMPORTANT: Multiple WLFI Deployments

WLFI exists on multiple chains with different deployment methods:

| Chain | Type | Address | Bridge Method |
|-------|------|---------|---------------|
| **Ethereum** | Native | `0xdA5e...BeF6` | N/A (origin) |
| **Base** | Bridged OFT | `0x47d5...a8FE` | LayerZero (this guide) |
| **BNB Chain** | Native | Check WLFI docs | N/A (separate deployment) |

**This guide is ONLY for verifying WLFI on Base**, which is bridged from Ethereum via LayerZero.

---

## How to Verify WLFI on Base is Authentic

Users on Base can verify this is the real WLFI token using multiple methods:

---

## Method 1: Verify LayerZero Peer Connection

The WLFI OFT on Base **must** be connected to the official WLFI Adapter on Ethereum.

### Via Basescan (Easiest)
1. Go to WLFI OFT on Base: `0x47d5BB59484639A7E66f480DeF84cc1267BfA8FE`
2. Click **"Read Contract"**
3. Find function `peers(uint32)` 
4. Input: `30101` (Ethereum EID)
5. Expected output: `0x2437f6555350c131647daa0c655c4b49a7af3621` (WLFI Adapter on Ethereum)

### Via Command Line
```bash
cast call 0x47d5BB59484639A7E66f480DeF84cc1267BfA8FE \
  "peers(uint32)(bytes32)" \
  30101 \
  --rpc-url https://mainnet.base.org
```

Expected: `0x00000000000000000000000<ADAPTER_ADDRESS>`

---

## Method 2: Verify EagleRegistry Integration

Real WLFI OFT uses the official EagleRegistry (same as EAGLE token).

### Check Registry Address
```bash
cast call 0x47d5BB59484639A7E66f480DeF84cc1267BfA8FE \
  "registry()(address)" \
  --rpc-url https://mainnet.base.org
```

Expected: `0x47c81c9a70CA7518d3b911bC8C8b11000e92F59e`

---

## Method 3: Verify Contract Owner

The owner should be your official multisig.

```bash
cast call 0x47d5BB59484639A7E66f480DeF84cc1267BfA8FE \
  "owner()(address)" \
  --rpc-url https://mainnet.base.org
```

Expected: `0x7310Dd6EF89b7f829839F140C6840bc929ba2031` (Your official address)

---

## Method 4: Check Underlying Token on Ethereum

The OFT should reference the real WLFI token on Ethereum.

```bash
cast call 0x47d5BB59484639A7E66f480DeF84cc1267BfA8FE \
  "underlyingToken()(address,uint256)" \
  --rpc-url https://mainnet.base.org
```

Expected:
- Token: `0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6` (WLFI on Ethereum)
- Chain ID: `1` (Ethereum)

---

## Method 5: Verify Contract Source Code

### On Basescan
1. Go to `0x47d5BB59484639A7E66f480DeF84cc1267BfA8FE` on Basescan
2. Check **"Contract"** tab shows ✅ verified
3. Review source code matches official repository
4. Check compiler version and optimization settings

### Check Version
```bash
cast call 0x47d5BB59484639A7E66f480DeF84cc1267BfA8FE \
  "version()(string)" \
  --rpc-url https://mainnet.base.org
```

Expected: `1.0.0-mainnet-registry`

### Check Chain Info
```bash
cast call 0x47d5BB59484639A7E66f480DeF84cc1267BfA8FE \
  "getChainInfo()(bool,string,string)" \
  --rpc-url https://mainnet.base.org
```

Expected:
- `true` (is bridged)
- `"Ethereum"` (source chain)
- `"BNB Chain has native WLFI..."` (info about other chains)

---

## Method 6: Verify Vanity Address

The official WLFI OFT has a vanity address starting with `0x47`.

- **Address**: `0x47d5BB59484639A7E66f480DeF84cc1267BfA8FE`
- **Prefix**: `0x47` (matches official Eagle branding)
- **Deployment**: CREATE2 (deterministic across all chains)

This address is **not random** - it was mined using CREATE2 to match the `0x47` prefix, similar to:
- EAGLE OFT: `0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E` (also `0x47`)
- EagleRegistry: `0x47c81c9a70CA7518d3b911bC8C8b11000e92F59e` (also `0x47`)

---

## Method 7: Check Official Announcements

**Always** verify against official channels:

1. **Keybase**: https://keybase.io/47eagle
   - Official cryptographic proof
   - Signed message with contract address

2. **Official Website**: https://wlfi.com (update with real URL)
   - Lists official contract addresses
   - Shows LayerZero peer connections

3. **Documentation**: https://docs.eagle-vault.com (update with real URL)
   - Technical deployment details
   - Verification instructions

4. **Social Media**:
   - Official Twitter/X account
   - Discord server announcements
   - Medium/Blog posts

---

## Method 8: Verify on LayerZero Scan

LayerZero's official scanner shows authentic peer connections.

1. Go to https://layerzeroscan.com
2. Enter the WLFI OFT address: `0x47d5BB59484639A7E66f480DeF84cc1267BfA8FE`
3. Check **"Connections"** tab
4. Verify it's connected to:
   - **Ethereum**: WLFI Adapter at `0x2437...3621`
   - No other suspicious connections

---

## Method 9: Cross-Reference with Ethereum WLFI

The Ethereum side **must** peer back to Base.

### Check Ethereum Adapter
```bash
cast call 0x2437F6555350c131647daA0C655c4B49A7aF3621 \
  "peers(uint32)(bytes32)" \
  30184 \
  --rpc-url https://eth.llamarpc.com
```

Expected: `0x00000000000000000000000047d5BB59484639A7E66f480DeF84cc1267BfA8FE`

This creates a **bidirectional trust relationship** - both contracts must peer to each other.

---

## Method 10: Check Token Supply Consistency

The total supply on Base should **never exceed** WLFI locked in the Ethereum adapter.

### Base Supply
```bash
cast call 0x47d5BB59484639A7E66f480DeF84cc1267BfA8FE \
  "totalSupply()(uint256)" \
  --rpc-url https://mainnet.base.org
```

### Ethereum Adapter Balance
```bash
cast call 0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6 \
  "balanceOf(address)(uint256)" \
  0x2437F6555350c131647daA0C655c4B49A7aF3621 \
  --rpc-url https://eth.llamarpc.com
```

**Base supply should ≤ Ethereum adapter balance** (1:1 backing)

---

## Common Verification Questions

### "I see WLFI on BNB Chain - is that fraudulent?"
**No** - WLFI has multiple legitimate deployments:
- **Ethereum**: Native WLFI (original deployment)
- **Base**: Bridged from Ethereum via LayerZero (this OFT)
- **BNB Chain**: Native WLFI (deployed by Binance/WLFI team, independent of LayerZero bridge)

Each is legitimate but serves different ecosystems. **They are NOT interchangeable**.

### "Why can't I bridge WLFI from Base to BNB Chain?"
Because Base WLFI is only connected to **Ethereum** via LayerZero. The BNB Chain WLFI is a separate native deployment, not part of the LayerZero bridge.

To verify which chain's WLFI you have:
```bash
# On Base, check chain info
cast call 0x47d5BB59484639A7E66f480DeF84cc1267BfA8FE \
  "getChainInfo()(bool,string,string)" \
  --rpc-url https://mainnet.base.org
```

This confirms Base WLFI is bridged from Ethereum (not BNB Chain).

---

## Security Warnings: Indicators of Fraudulent Tokens

### Do not trust if:
1. **Wrong peer address** - Not connected to `0x2437...3621` on Ethereum
2. **No registry** - Doesn't have `registry()` function or wrong address
3. **Wrong owner** - Owner is not your official multisig
4. **Not verified** - Source code not verified on Basescan
5. **Different address** - Not `0x47d5BB59484639A7E66f480DeF84cc1267BfA8FE`
6. **No official announcement** - Not listed on keybase.io/47eagle
7. **Supply mismatch** - Base supply > Ethereum locked balance
8. **Wrong underlying** - References different Ethereum token
9. **Claims to bridge to BNB** - Base WLFI is NOT connected to BNB Chain
10. **Wrong chain info** - `getChainInfo()` doesn't return Ethereum as source

---

## Quick Verification Checklist

Copy this checklist to verify WLFI on Base:

```
□ Address starts with 0x47
□ Peer on Ethereum is 0x2437...3621
□ Registry is 0x47c8...f59e
□ Owner is 0x7310...2031
□ Underlying token is 0xdA5e...CBeF6 (Ethereum)
□ Contract verified on Basescan
□ Listed on official Keybase
□ Version is "1.0.0-mainnet-registry"
□ LayerZero Scan shows bidirectional connection
□ Supply ≤ Ethereum adapter balance
□ getChainInfo() returns Ethereum as source
□ getChainInfo() mentions BNB Chain as separate
```

**If all verification items are confirmed → Token is authentic**

**If any verification item fails → Exercise caution and do not proceed**

---

## WLFI Deployment Comparison

To help users understand the different WLFI deployments:

| Aspect | Ethereum WLFI | Base WLFI (This OFT) | BNB Chain WLFI |
|--------|---------------|---------------------|----------------|
| **Type** | Native ERC20 | LayerZero OFT | Native BEP20 |
| **Address** | `0xdA5e...BeF6` | `0x47d5...a8FE` | Check WLFI docs |
| **Registry** | N/A | ✅ EagleRegistry | N/A |
| **Backing** | Self (native) | 1:1 with Ethereum | Self (native) |
| **Bridge to Ethereum** | N/A | ✅ Yes (LayerZero) | ❌ No |
| **Bridge to Base** | ✅ Yes (this adapter) | N/A | ❌ No |
| **Bridge to BNB** | ❌ No | ❌ No | N/A |
| **Managed by** | WLFI team | Eagle team | Binance/WLFI |
| **Verifiable** | Etherscan | ✅ On-chain (this guide) | BSCScan |

**Key Takeaway**: Each WLFI deployment is isolated to its ecosystem. Base ↔ Ethereum only.

---

## Advanced Verification: Reproduce CREATE2 Address

For maximum verification, you can reproduce the CREATE2 deployment:

1. Get the init code hash (from our deployment)
2. Verify the CREATE2 salt produces `0x47d5BB59484639A7E66f480DeF84cc1267BfA8FE`
3. This proves the contract was deployed with exact parameters

See `script/layerzero/DeployWLFIOFTExact.s.sol` for deployment code.

---

## Support Resources

If you're unsure about verification:

1. **Ask in official Discord** (get invite from official website)
2. **Check Keybase** for signed verification message
3. **Contact support** via official channels only

**Never trust**:
- Random Telegram DMs
- Unofficial Discord servers
- Contract addresses shared in comments
- "Support staff" who DM you first

---

## Summary

The WLFI OFT on Base is secured by:
1. **LayerZero peer verification** - Cryptographically linked to Ethereum
2. **EagleRegistry integration** - Part of official Eagle ecosystem
3. **Vanity address** - Recognizable `0x47` prefix
4. **1:1 backing** - Every token on Base backed by WLFI on Ethereum
5. **Open source** - Fully verified and auditable on Basescan
6. **Official announcements** - Listed on all official channels

**When in doubt, verify ALL methods above!**

---

**Last Updated**: November 18, 2025  
**Contract Version**: 1.0.0-mainnet-registry  
**Official Repository**: https://github.com/yourusername/eagle-ovault-clean

