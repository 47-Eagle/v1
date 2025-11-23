# ✅ LayerZero V2 Full Setup Checklist

**Complete configuration guide for Ethereum ↔ Solana bridge**

---

## 📋 Required Transactions (Ethereum Side)

### Transaction 1: Set Peer ⏳
**What**: Register Solana as a trusted peer
**Function**: `setPeer(uint32 _eid, bytes32 _peer)`
**Status**: ⏳ **PENDING** (see `script/SetPeerSolana.s.sol`)

```
To: 0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E
Calldata: 0x3400288b00000000000000000000000000000000000000000000000000000000000075d8000000000000000000000000207f1ae831b5ae3a1a03c41ff3b57b63c22b3935
```

---

### Transaction 2: Set Delegate ⏳
**What**: Set the delegate address for LayerZero admin functions
**Function**: `setDelegate(address _delegate)`
**Why**: Delegate can configure DVNs, executors, and other LZ settings

```solidity
// Call on LayerZero Endpoint
endpoint.setDelegate(SAFE_MULTISIG_ADDRESS)
```

**Endpoint**: `0x1a44076050125825900e736c501f859c50fE728c` (Ethereum)

---

### Transaction 3: Configure Send Library ⏳
**What**: Set the send library for messages to Solana
**Function**: `setSendLibrary(address _oapp, uint32 _dstEid, address _sendLib)`

```solidity
// LayerZero Endpoint
endpoint.setSendLibrary(
  0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E, // EagleShareOFT
  30168,                                        // Solana EID
  SEND_ULN_302                                  // Send library address
)
```

**Send Library (ULN 302)**: Check LayerZero docs for current address

---

### Transaction 4: Configure Receive Library ⏳
**What**: Set the receive library for messages from Solana
**Function**: `setReceiveLibrary(address _oapp, uint32 _srcEid, address _receiveLib, uint256 _gracePeriod)`

```solidity
endpoint.setReceiveLibrary(
  0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E, // EagleShareOFT
  30168,                                        // Solana EID
  RECEIVE_ULN_302,                              // Receive library
  0                                             // Grace period
)
```

---

### Transaction 5: Configure DVN (Required) ⏳
**What**: Set Decentralized Verifier Networks for security
**Function**: `setConfig(address _oapp, address _lib, uint32 _eid, uint32 _configType, bytes _config)`

```solidity
// ConfigType 2 = ULN Config
bytes memory ulnConfig = abi.encode(
  UlnConfig({
    confirmations: 15,              // Block confirmations
    requiredDVNCount: 1,
    optionalDVNCount: 0,
    optionalDVNThreshold: 0,
    requiredDVNs: [LAYERZERO_DVN],  // LayerZero's official DVN
    optionalDVNs: []
  })
);

endpoint.setConfig(
  0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E,
  SEND_ULN_302,
  30168,
  2,  // CONFIG_TYPE_ULN
  ulnConfig
);
```

**LayerZero DVN**: Check docs for official DVN address

---

### Transaction 6: Configure Executor ⏳
**What**: Set the executor for message delivery on destination chain
**Function**: `setConfig(address _oapp, address _lib, uint32 _eid, uint32 _configType, bytes _config)`

```solidity
// ConfigType 1 = Executor Config
bytes memory executorConfig = abi.encode(
  ExecutorConfig({
    maxMessageSize: 10000,
    executor: LAYERZERO_EXECUTOR
  })
);

endpoint.setConfig(
  0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E,
  SEND_ULN_302,
  30168,
  1,  // CONFIG_TYPE_EXECUTOR
  executorConfig
);
```

---

### Transaction 7: Set Enforced Options (Optional) ⏳
**What**: Set minimum gas limits for cross-chain messages
**Function**: `setEnforcedOptions(EnforcedOptionParam[] _enforcedOptions)`

```solidity
EnforcedOptionParam[] memory params = new EnforcedOptionParam[](1);
params[0] = EnforcedOptionParam({
  eid: 30168,  // Solana
  msgType: 1,  // SEND
  options: OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0)
});

eagleShareOFT.setEnforcedOptions(params);
```

---

## 📋 Required Transactions (Solana Side)

### Transaction 8: Register Ethereum Peer ⏳
**What**: Configure Solana program to accept messages from Ethereum
**Function**: `register_peer_chain`

```bash
# Using Anchor
anchor run register-ethereum-peer -- \
  --chain-id 1 \
  --eid 30101 \
  --peer 0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E
```

---

### Transaction 9: Configure Solana DVN ⏳
**What**: Set trusted DVNs on Solana side
**Function**: `set_dvn_config`

---

## 📊 Configuration Summary

| Step | Component | Status | Required |
|------|-----------|--------|----------|
| 1 | Set Peer (Ethereum) | ⏳ Pending | ✅ Yes |
| 2 | Set Delegate | ⏳ Pending | ✅ Yes |
| 3 | Send Library | ⏳ Pending | ✅ Yes |
| 4 | Receive Library | ⏳ Pending | ✅ Yes |
| 5 | DVN Config (Send) | ⏳ Pending | ✅ Yes |
| 6 | Executor Config | ⏳ Pending | ✅ Yes |
| 7 | Enforced Options | ⏳ Pending | ⚠️ Recommended |
| 8 | Solana Peer | ⏳ Pending | ✅ Yes |
| 9 | Solana DVN | ⏳ Pending | ✅ Yes |

---

## 🔍 How to Get LayerZero Addresses

### Official LayerZero Addresses (Ethereum Mainnet)

```bash
# Endpoint V2
ENDPOINT=0x1a44076050125825900e736c501f859c50fE728c

# Send/Receive Libraries (ULN 302)
SEND_ULN_302=0xbB2Ea70C9E858123480642Cf96acbcCE1372dCe1
RECEIVE_ULN_302=0xc02Ab410f0734EFa3F14628780e6e695156024C2

# DVN (Decentralized Verifier Network)
LAYERZERO_DVN=0x589dEDbD617e0CBcB916A9223F4d1300c294236b

# Executor
LAYERZERO_EXECUTOR=0x173272739Bd7Aa6e4e214714048a9fE699453059
```

**Source**: https://docs.layerzero.network/v2/developers/evm/technical-reference/deployed-contracts

---

## 🚀 Recommended Approach

### Option A: Use Simple Relayer (Recommended for Now)
✅ **Already operational!**
- No LayerZero configuration needed
- Works immediately
- See `relayer/QUICK_START.md`
- Perfect for MVP/testing

### Option B: Full LayerZero Setup
⏳ **Requires all 9 transactions**
- More secure (decentralized)
- Industry standard
- Self-sustaining
- Better for production

---

## 💰 Cost Estimate

| Transaction | Gas Estimate | Cost (~50 gwei) |
|-------------|--------------|-----------------|
| 1. Set Peer | ~50,000 | $3-5 |
| 2. Set Delegate | ~50,000 | $3-5 |
| 3. Send Library | ~100,000 | $6-10 |
| 4. Receive Library | ~100,000 | $6-10 |
| 5. DVN Config | ~150,000 | $9-15 |
| 6. Executor Config | ~150,000 | $9-15 |
| 7. Enforced Options | ~100,000 | $6-10 |
| 8-9. Solana | ~0.01 SOL | $2 |
| **TOTAL** | | **$44-72** |

---

## 🎯 Simplified Setup Script

I can create a **single Safe batch transaction** that does steps 1-7 in one go:

```bash
forge script script/SetupLayerZeroComplete.s.sol \
  --rpc-url ethereum \
  --sig "generateBatchCalldata()"
```

This will output a **single Safe transaction** with all calldata batched together!

---

## ⚠️ Important Notes

1. **Complexity**: LayerZero V2 is complex - 9 transactions vs 0 for simple relayer
2. **Testing**: Each transaction must be tested individually
3. **Mainnet Cost**: ~$50-70 in gas fees for full setup
4. **Maintenance**: May need updates if LayerZero upgrades
5. **Debugging**: Harder to debug than simple relayer

---

## 🆘 My Recommendation

**Start with Simple Relayer** (Option 1):
- ✅ Already working
- ✅ Zero additional cost
- ✅ Easy to maintain
- ✅ Can switch to LayerZero later

**Only use LayerZero if**:
- You need full decentralization
- You're comfortable with 9 transactions
- You have $50-70 for gas fees
- You want industry-standard security

---

## 📝 Next Steps

### If Using Simple Relayer (Recommended):
```bash
cd /home/akitav2/eagle-ovault-clean/relayer
npm start
# Done! ✅
```

### If Using LayerZero:
1. Set peer (Transaction 1) - **Start here**
2. Get official LayerZero addresses from docs
3. Create batch transaction for steps 2-7
4. Configure Solana side (steps 8-9)
5. Test with small amounts

---

**Questions?**
- LayerZero Docs: https://docs.layerzero.network/v2
- Your Simple Relayer: `relayer/QUICK_START.md`
- Safe Multisig: https://app.safe.global

---

**Want me to generate the complete batch transaction?** I can create a single Safe tx that does all 7 Ethereum transactions at once! 🚀

