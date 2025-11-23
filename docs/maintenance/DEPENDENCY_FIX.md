# OpenZeppelin v5 / Uniswap v3-periphery Dependency Fix

## Problem

The project has a dependency conflict:
- **OpenZeppelin v5** moved ERC721 interfaces to `token/ERC721/extensions/` folder
- **Uniswap v3-periphery** expects them in `token/ERC721/` folder
- This causes compilation failures when running tests

## Impact

- CharmStrategy contracts cannot compile
- All tests fail due to Uniswap v3-periphery imports in CharmStrategy

## Immediate Workaround

Use forge's `--match-contract` or `--match-path` flags to test only OFT contracts:

```bash
# Test ONLY EagleShareOFT (excludes CharmStrategy)
forge test --match-contract EagleShareOFT -vv

# Test ONLY EagleOVault tests
forge test --match-contract EagleOVault -vv

# Test EagleVaultWrapper
forge test --match-contract EagleVaultWrapper -vv

# Test specific file
forge test --match-path test/EagleShareOFT.comprehensive.t.sol -vv
```

## Permanent Solutions

### Option 1: Downgrade OpenZeppelin to v4.x (Breaking Change)
```bash
pnpm remove @openzeppelin/contracts
pnpm add @openzeppelin/contracts@^4.9.0
```

**Impact**: Requires updating all contracts to use OZ v4 interfaces

### Option 2: Upgrade/Fork Uniswap v3-periphery (Recommended)
```bash
# Use a compatible fork or wait for official v5 support
pnpm add @uniswap/v3-periphery@<compatible-version>
```

### Option 3: Manual Interface Definitions (Current)
The project already has `contracts/interfaces/INonfungiblePositionManager.sol` with manual interface definitions. This works but doesn't solve the compilation issue when Uniswap's version is imported.

### Option 4: Use Package Overrides (Quick Fix)
Add to `package.json`:
```json
{
  "pnpm": {
    "overrides": {
      "@uniswap/v3-periphery>@openzeppelin/contracts": "^5.0.0"
    }
  }
}
```

## Testing Strategy

Since CharmStrategy tests can't run currently, use this approach:

### 1. Test OFT Contracts (Working)
```bash
# These work fine
forge test --match-contract EagleShareOFT -vv
forge test --match-path test/EagleShareOFT.comprehensive.t.sol -vv
```

### 2. Test Vault (Working)
```bash
forge test --match-contract EagleOVault -vv
```

### 3. Test Wrapper (Working)
```bash
forge test --match-contract EagleVaultWrapper -vv
```

### 4. Skip CharmStrategy (Temporarily)
```bash
# CharmStrategy tests are skipped until dependency is resolved
# Use Hardhat tests instead if needed
pnpm hardhat test test/CharmStrategy.test.ts
```

## Recommended Action

**For EagleShareOFT development**: Use the workaround (test with `--match-contract`)

**For production**: Implement Option 2 or 4 to fix the root cause

## Updated Commands

### Test EagleShareOFT Comprehensive Suite
```bash
forge test --match-contract EagleShareOFTComprehensiveTest -vv
```

### Test EagleShareOFT Original Suite
```bash
forge test --match-contract EagleShareOFTTest -vv
```

### Test All OFT Tests
```bash
forge test --match-contract EagleShareOFT -vv
```

### Test with Gas Report
```bash
forge test --match-contract EagleShareOFT --gas-report
```

### Test Specific Function
```bash
forge test --match-test test_Mint_ByOwner -vvvv
```

## Status

✅ **EagleShareOFT tests**: Can run with `--match-contract` flag  
❌ **CharmStrategy tests**: Cannot compile (dependency conflict)  
✅ **Vault tests**: Can run with `--match-contract` flag  
✅ **Wrapper tests**: Can run with `--match-contract` flag  

## Files Affected

**Cannot Compile**:
- `contracts/strategies/CharmStrategy.sol`
- `contracts/strategies/CharmStrategyUSD1.sol`
- `test/CharmStrategy.t.sol`
- `test/CharmStrategyUSD1.t.sol`
- `test/CharmStrategyUSD1.fork.t.sol`
- `script/AddLiquidity.s.sol` (imports from Uniswap)

**Can Compile & Test**:
- `contracts/layerzero/oft/EagleShareOFT.sol` ✅
- `test/EagleShareOFT.t.sol` ✅
- `test/EagleShareOFT.comprehensive.t.sol` ✅
- `contracts/EagleOVault.sol` ✅
- `contracts/EagleVaultWrapper.sol` ✅
- All other vault-related contracts ✅

## See Also

- `test/EAGLESHAREOFT_TEST_README.md` - Full test documentation
- `test/QUICK_TEST_REFERENCE.md` - Quick commands
- `EAGLESHAREOFT_TEST_SUMMARY.md` - Test suite summary

