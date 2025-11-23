# LayerZero Configuration Status

## Summary

LayerZero OApp wiring between Ethereum and Base has been partially configured, but cross-chain transfers are failing due to DVN/Executor configuration issues.

## What's Working ✅

1. **Peers configured** on both Ethereum and Base
   - Ethereum → Base peer: `0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E`
   - Base → Ethereum peer: `0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E`

2. **Send/Receive libraries** configured
   - Ethereum send library: `0xbB2Ea70C9E858123480642Cf96acbcCE1372dCe1` (SendUln302)
   - Ethereum receive library: `0xc02Ab410f0734EFa3F14628780e6e695156024C2` (ReceiveUln302)
   - Base send library: `0xB5320B0B3a13cC860893E2Bd79FCd7e13484Dda2` (SendUln302)
   - Base receive library: `0xc70AB6f32772f59fBfc23889Caf4Ba3376C84bAf` (ReceiveUln302)

3. **Delegate set** correctly
   - Delegate on both chains: `0x7310Dd6EF89b7f829839F140C6840bc929ba2031` (deployer account)

4. **Enforced options** configured (34 bytes, correct format)
   - Gas limit: 200,000
   - Value: 0
   - Options: `0x000300000000000000000000000000030d4000000000000000000000000000000000`

5. **DVN Configuration exists** on Ethereum
   - Confirmations: 15 blocks
   - DVN 1: `0x589dedbd617e0cbcb916a9223f4d1300c294236b`
   - DVN 2: `0xd56e4eab23cb81f43168f9f45211eb027b9ac7cc`

6. **Executor Configuration exists** on Ethereum
   - Executor: `0x173272739Bd7Aa6e4e214714048a9fE699453059`
   - Max message size: 10,000

## What's NOT Working ❌

1. **Cross-chain transfers fail** with error: `LZ_ULN_InvalidWorkerId(0)`
   - This error indicates the DVN/Executor configuration is invalid or incomplete
   - Despite configurations existing, the LayerZero ULN cannot validate the worker IDs

2. **DVN/Executor configs may not be set correctly** for Base destination
   - The custom DVN config may be incomplete or using incorrect addresses
   - LayerZero's metadata fetch failed during wiring, so fallback addresses were used

## Root Cause

The issue appears to be that the DVN/Executor configurations were set manually with fallback addresses that may not be valid for the Ethereum → Base pathway. LayerZero V2 requires chain-specific DVN addresses that are registered and valid for each EID.

## Recommended Solution

**Use LayerZero's official tooling** to set the correct DVN/Executor configurations:

1. **Option A: Use LayerZero's Simple Config Generator (Recommended)**
   - The `layerzero.config.ts` file is already set up to use `generateConnectionsConfig`
   - This will automatically generate correct DVN/Executor configs
   - Command: `npm run lz:wire` (if Hardhat ESM issues are resolved)
   
2. **Option B: Use LayerZero Scan to verify correct DVN addresses**
   - Visit https://layerzeroscan.com/
   - Look up the Ethereum → Base pathway
   - Get the official DVN addresses for this specific route
   - Manually set them using the endpoint's `setConfig` function

3. **Option C: Contact LayerZero Support**
   - The pathway may require LayerZero Labs to configure the DVN/Executor settings
   - They can set the default configurations for your OApp

## Commands Available

- `npm run lz:wire:complete` - Full manual wiring (currently fails on DVN config)
- `npm run lz:set:delegate` - Set the LayerZero delegate
- `npm run lz:set:options` - Set enforced options (✅ working)
- `npm run lz:verify` - Verify configuration (7/12 checks passing)
- `npm run lz:send:test` - Test cross-chain transfer (❌ failing)

## Technical Details

### Error Analysis

**Error:** `0x6780cfaf0000000000000000000000000000000000000000000000000000000000000000`
- Selector: `0x6780cfaf` = `LZ_ULN_InvalidWorkerId(uint8)`
- Parameter: `0x00` = Worker ID 0

This error occurs when the ULN (Ultra Light Node) tries to validate a worker (DVN or Executor) but encounters worker ID 0, which is invalid. This suggests:
1. The DVN config references a worker that doesn't exist in the worker registry
2. The DVN addresses used aren't registered for the Base EID
3. There's a mismatch between the configured DVNs and the expected DVNs

### Configuration Verification

To verify DVN config on Ethereum:
```bash
cast call 0x1a44076050125825900e736c501f859c50fE728c \
  "getConfig(address,address,uint32,uint32)(bytes)" \
  0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E \
  0xbB2Ea70C9E858123480642Cf96acbcCE1372dCe1 \
  30184 \
  2 \
  --rpc-url $ETHEREUM_RPC_URL
```

To verify Executor config:
```bash
cast call 0x1a44076050125825900e736c501f859c50fE728c \
  "getConfig(address,address,uint32,uint32)(bytes)" \
  0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E \
  0xbB2Ea70C9E858123480642Cf96acbcCE1372dCe1 \
  30184 \
  1 \
  --rpc-url $ETHEREUM_RPC_URL
```

## Next Steps

1. **Short-term:** Wait for LayerZero to complete the DVN configuration, or contact LayerZero support
2. **Medium-term:** Research the correct DVN addresses for Ethereum → Base and manually set them
3. **Long-term:** Once the official Hardhat plugin works with ESM, use `lz:oapp:wire` for automatic configuration

## Files

- `layerzero.config.ts` - LayerZero configuration (using Simple Config Generator format)
- `scripts/deployment/wire-oapp-complete.ts` - Manual wiring script
- `scripts/deployment/set-enforced-options.ts` - Set enforced options
- `scripts/deployment/set-layerzero-delegate.ts` - Set delegate
- `scripts/verification/verify-layerzero-config.ts` - Verify configuration
- `scripts/testing/send-eagle-cross-chain.ts` - Test cross-chain transfer

## References

- [LayerZero V2 Docs](https://docs.layerzero.network/v2)
- [Integration Checklist](https://docs.layerzero.network/v2/tools/integration-checklist)
- [Simple Config Generator](https://docs.layerzero.network/v2/tools/simple-config)
- [LayerZero Scan](https://layerzeroscan.com/)

---

*Last updated: During configuration session*
*Status: Peers and libraries configured, DVN configuration incomplete*

