# WLFI Contract Verification Features

## Built-in On-Chain Verification

Both WLFI OFT (Base) and WLFI Adapter (Ethereum) have built-in verification functions that users can call directly on Basescan/Etherscan.

---

## WLFI OFT on Base

**Address**: `0x47d5BB59484639A7E66f480DeF84cc1267BfA8FE`

### Hardcoded Reference Addresses

These addresses are immutable constants in the contract code:

```solidity
OFFICIAL_WLFI_TOKEN = 0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6  // WLFI on Ethereum
WLFI_ADAPTER_ETHEREUM = 0x2437F6555350c131647daA0C655c4B49A7aF3621  // Bridge adapter
EAGLE_REGISTRY = 0x47c81c9a70CA7518d3b911bC8C8b11000e92F59e       // Shared registry
EAGLE_SHARE_OFT = 0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E      // EAGLE token (reference)
ETHEREUM_EID = 30101                                              // LayerZero Ethereum ID
```

### Verification Functions

#### 1. `verifyAuthenticity()` ✅ One-Click Verification

**Returns**: `(bool isAuthentic, bool[3] checks)`

Checks:
- ✅ Registry matches `EAGLE_REGISTRY`
- ✅ Ethereum peer matches `WLFI_ADAPTER_ETHEREUM`
- ✅ EAGLE contract exists (sanity check)

**Usage on Basescan**:
1. Go to contract page
2. Click "Read Contract"
3. Find `verifyAuthenticity()`
4. Click "Query"
5. **Result should be**: `true, [true, true, true]`

**Command Line**:
```bash
cast call 0x47d5BB59484639A7E66f480DeF84cc1267BfA8FE \
  "verifyAuthenticity()(bool,bool[3])" \
  --rpc-url https://mainnet.base.org
```

Expected: `true [true, true, true]`

---

#### 2. `getOfficialAddresses()` 📋 Get All Reference Addresses

**Returns**: `(address wlfiToken, address wlfiAdapter, address eagleRegistry, address eagleShareOFT, address currentOwner)`

Returns all official contract addresses for cross-verification.

**Command Line**:
```bash
cast call 0x47d5BB59484639A7E66f480DeF84cc1267BfA8FE \
  "getOfficialAddresses()(address,address,address,address,address)" \
  --rpc-url https://mainnet.base.org
```

Expected:
```
0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6  (WLFI Token)
0x2437F6555350c131647daA0C655c4B49A7aF3621  (WLFI Adapter)
0x47c81c9a70CA7518d3b911bC8C8b11000e92F59e  (Eagle Registry)
0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E  (Eagle Share OFT)
0x7310Dd6EF89b7f829839F140C6840bc929ba2031  (Current Owner)
```

---

#### 3. `verificationInfo()` 🔗 Get Official Links

**Returns**: `(string keybaseProof, string officialWebsite, string documentation)`

Returns URLs for additional verification.

**Command Line**:
```bash
cast call 0x47d5BB59484639A7E66f480DeF84cc1267BfA8FE \
  "verificationInfo()(string,string,string)" \
  --rpc-url https://mainnet.base.org
```

Expected:
```
"https://keybase.io/47eagle"
"https://wlfi.com"
"https://docs.eagle-vault.com"
```

---

#### 4. `verifyPeer(uint32 eid)` 🌉 Check LayerZero Peer

**Parameters**: `eid` - Chain EID to check (30101 for Ethereum)

**Returns**: `(bytes32 peerAddress, bool isEthereum)`

Check the peer connection for a specific chain.

**Command Line**:
```bash
cast call 0x47d5BB59484639A7E66f480DeF84cc1267BfA8FE \
  "verifyPeer(uint32)(bytes32,bool)" \
  30101 \
  --rpc-url https://mainnet.base.org
```

Expected: 
```
0x00000000000000000000000002437f6555350c131647daa0c655c4b49a7af3621  (Adapter address)
true  (is Ethereum)
```

---

#### 5. Standard Functions

Additional verification via standard OFT functions:

**Registry**:
```bash
cast call 0x47d5BB59484639A7E66f480DeF84cc1267BfA8FE \
  "registry()(address)" \
  --rpc-url https://mainnet.base.org
```
Expected: `0x47c81c9a70CA7518d3b911bC8C8b11000e92F59e`

**Owner**:
```bash
cast call 0x47d5BB59484639A7E66f480DeF84cc1267BfA8FE \
  "owner()(address)" \
  --rpc-url https://mainnet.base.org
```

**Version**:
```bash
cast call 0x47d5BB59484639A7E66f480DeF84cc1267BfA8FE \
  "version()(string)" \
  --rpc-url https://mainnet.base.org
```
Expected: `1.0.0-mainnet-registry`

---

## WLFI Adapter on Ethereum

**Address**: `0x2437F6555350c131647daA0C655c4B49A7aF3621`

### Hardcoded Reference Addresses

```solidity
OFFICIAL_WLFI_TOKEN = 0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6  // Native WLFI
WLFI_OFT_BASE = 0x47d5BB59484639A7E66f480DeF84cc1267BfA8FE        // OFT on Base
EAGLE_REGISTRY = 0x47c81c9a70CA7518d3b911bC8C8b11000e92F59e       // Shared registry
EAGLE_SHARE_OFT = 0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E      // EAGLE token
BASE_EID = 30184                                                  // LayerZero Base ID
```

### Verification Functions

#### 1. `verifyAuthenticity()` ✅

**Returns**: `(bool isAuthentic, bool[3] checks)`

Checks:
- ✅ Token is `OFFICIAL_WLFI_TOKEN`
- ✅ Base peer matches `WLFI_OFT_BASE`
- ✅ EAGLE contract exists

**Command Line**:
```bash
cast call 0x2437F6555350c131647daA0C655c4B49A7aF3621 \
  "verifyAuthenticity()(bool,bool[3])" \
  --rpc-url https://eth.llamarpc.com
```

Expected: `true [true, true, true]`

---

#### 2. `getOfficialAddresses()` 📋

**Command Line**:
```bash
cast call 0x2437F6555350c131647daA0C655c4B49A7aF3621 \
  "getOfficialAddresses()(address,address,address,address,address)" \
  --rpc-url https://eth.llamarpc.com
```

Expected:
```
0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6  (WLFI Token)
0x47d5BB59484639A7E66f480DeF84cc1267BfA8FE  (WLFI OFT Base)
0x47c81c9a70CA7518d3b911bC8C8b11000e92F59e  (Eagle Registry)
0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E  (Eagle Share OFT)
0x7310Dd6EF89b7f829839F140C6840bc929ba2031  (Current Owner)
```

---

#### 3. `verificationInfo()` 🔗

Same as WLFI OFT - returns Keybase, website, docs URLs.

---

#### 4. Additional Checks

**Wrapped Token**:
```bash
cast call 0x2437F6555350c131647daA0C655c4B49A7aF3621 \
  "token()(address)" \
  --rpc-url https://eth.llamarpc.com
```
Expected: `0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6`

**Version**:
```bash
cast call 0x2437F6555350c131647daA0C655c4B49A7aF3621 \
  "version()(string)" \
  --rpc-url https://eth.llamarpc.com
```
Expected: `1.0.0-mainnet`

---

## User Verification Checklist

For users to verify WLFI on Base is authentic:

### Quick Check (30 seconds)
```bash
# Call verifyAuthenticity() - should return true
cast call 0x47d5BB59484639A7E66f480DeF84cc1267BfA8FE \
  "verifyAuthenticity()(bool,bool[3])" \
  --rpc-url https://mainnet.base.org
```

✅ If result is `true [true, true, true]` → **Token is authentic**

### Detailed Check (2 minutes)

1. **Check all addresses**:
```bash
cast call 0x47d5BB59484639A7E66f480DeF84cc1267BfA8FE \
  "getOfficialAddresses()(address,address,address,address,address)" \
  --rpc-url https://mainnet.base.org
```

2. **Verify on Ethereum side**:
```bash
cast call 0x2437F6555350c131647daA0C655c4B49A7aF3621 \
  "verifyAuthenticity()(bool,bool[3])" \
  --rpc-url https://eth.llamarpc.com
```

3. **Check bidirectional peers**:
```bash
# Base -> Ethereum
cast call 0x47d5BB59484639A7E66f480DeF84cc1267BfA8FE \
  "peers(uint32)(bytes32)" 30101 \
  --rpc-url https://mainnet.base.org

# Ethereum -> Base  
cast call 0x2437F6555350c131647daA0C655c4B49A7aF3621 \
  "peers(uint32)(bytes32)" 30184 \
  --rpc-url https://eth.llamarpc.com
```

4. **Verify on LayerZero Scan**:
   - Visit https://layerzeroscan.com
   - Search for `0x47d5BB59484639A7E66f480DeF84cc1267BfA8FE`
   - Check connections tab

5. **Check official channels**:
   - Keybase: https://keybase.io/47eagle
   - Official website
   - Documentation site

---

## Benefits

### 1. **On-Chain Verification**
Users don't need to trust documentation - they can verify directly on-chain.

### 2. **Cross-Reference with EAGLE**
WLFI contracts reference EAGLE contracts, creating a trust chain:
- If user trusts EAGLE → can verify WLFI uses same registry
- Same architectural pattern = easier to trust

### 3. **Tamper-Proof**
Addresses are `public constant` - immutable and visible in verified source code.

### 4. **Single Function Check**
`verifyAuthenticity()` does all critical checks in one call.

### 5. **Transparent**
All verification logic is open source and auditable.

---

## Integration for Frontends

Frontends can call `verifyAuthenticity()` on page load:

```typescript
const wlfiOFT = new ethers.Contract(
  '0x47d5BB59484639A7E66f480DeF84cc1267BfA8FE',
  ['function verifyAuthenticity() view returns (bool, bool[3])'],
  provider
);

const [isAuthentic, checks] = await wlfiOFT.verifyAuthenticity();

if (!isAuthentic) {
  alert('⚠️ WARNING: WLFI contract verification failed!');
  // Show detailed checks
  console.log('Registry check:', checks[0]);
  console.log('Peer check:', checks[1]);
  console.log('Sanity check:', checks[2]);
}
```

This provides **automatic protection** for users against fake tokens.

---

## Summary

| Feature | WLFI OFT (Base) | WLFI Adapter (Ethereum) |
|---------|----------------|-------------------------|
| **verifyAuthenticity()** | ✅ 3 checks | ✅ 3 checks |
| **getOfficialAddresses()** | ✅ 5 addresses | ✅ 5 addresses |
| **verificationInfo()** | ✅ 3 URLs | ✅ 3 URLs |
| **verifyPeer()** | ✅ Ethereum peer | ❌ (adapter-specific) |
| **Hardcoded references** | ✅ 5 addresses | ✅ 5 addresses |
| **Version string** | ✅ | ✅ |

**Result**: Users have **multiple ways** to verify authenticity, all on-chain and tamper-proof.

---

**Last Updated**: November 18, 2025  
**Version**: 1.0  
**Status**: Ready for deployment

