# EagleOVault - Synchronous ERC-4626 Vault 🦅

## 🎯 Overview

**EagleOVault** is a synchronous ERC-4626 compliant vault with WLFI-denominated accounting, designed for seamless integration with LayerZero's omnichain token infrastructure via **EagleVaultWrapper**.

## ✨ Key Features

- ✅ **Synchronous Redemptions** - Instant WLFI transfers on withdraw/redeem
- ✅ **WLFI-Denominated** - All accounting in WLFI units (strict ERC-4626)
- ✅ **Dual-Token Support** - Handles WLFI + USD1 with automatic swapping
- ✅ **Strategy Management** - Deploy assets to yield-generating strategies
- ✅ **Profit Unlocking** - Gradual profit realization to prevent PPS manipulation
- ✅ **Oracle Integration** - Chainlink + Uniswap V3 TWAP for price feeds
- ✅ **Emergency Controls** - Pause, shutdown, emergency withdrawal
- ✅ **Wrapper Integration** - Works seamlessly with EagleVaultWrapper for omnichain shares

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────┐
│              HUB CHAIN (Sonic/Ethereum)            │
├────────────────────────────────────────────────────┤
│                                                    │
│  1. EagleOVault (This Contract)                    │
│     ├─ Deposit WLFI → Get vEAGLE shares            │
│     ├─ Redeem vEAGLE → Get WLFI (immediate)        │
│     ├─ Deploy to strategies                        │
│     └─ Dual token support (WLFI + USD1)            │
│                                                    │
│  2. EagleVaultWrapper                              │
│     ├─ Wrap vEAGLE → Get EagleShareOFT             │
│     ├─ Unwrap EagleShareOFT → Get vEAGLE           │
│     └─ Fee collection (1% wrap, 2% unwrap)         │
│                                                    │
│  3. EagleShareOFT                                  │
│     └─ Bridge to other chains via LayerZero        │
│                                                    │
└────────────────────────────────────────────────────┘
```

## 📦 Core Functions

### User Functions

#### Deposit (WLFI Only)
```solidity
function deposit(uint256 assets, address receiver) 
    external 
    returns (uint256 shares)
```
Deposit WLFI and receive vault shares (vEAGLE).

#### Deposit Dual (WLFI + USD1)
```solidity
function depositDual(
    uint256 wlfiAmount, 
    uint256 usd1Amount, 
    address receiver
) external returns (uint256 shares)
```
Deposit both WLFI and USD1. USD1 is automatically swapped to WLFI before minting shares.

#### Redeem (Synchronous)
```solidity
function redeem(
    uint256 shares, 
    address receiver, 
    address owner
) external returns (uint256 assets)
```
Burn shares and receive WLFI **immediately** (synchronous operation).

#### Withdraw (Synchronous)
```solidity
function withdraw(
    uint256 assets, 
    address receiver, 
    address owner
) external returns (uint256 shares)
```
Withdraw specific WLFI amount, burns required shares **immediately**.

### View Functions

```solidity
function totalAssets() public view returns (uint256)
```
Total WLFI units controlled by vault (includes strategies, USD1-equivalent).

```solidity
function previewDeposit(uint256 assets) public view returns (uint256 shares)
function previewMint(uint256 shares) public view returns (uint256 assets)
function previewRedeem(uint256 shares) public view returns (uint256 assets)
function previewWithdraw(uint256 assets) public view returns (uint256 shares)
```
Standard ERC-4626 preview functions for calculating shares/assets.

```solidity
function getWLFIPrice() public view returns (uint256 price)
function getUSD1Price() public view returns (uint256 price)
function wlfiEquivalent(uint256 usd1Amount) public view returns (uint256)
```
Price oracle functions for WLFI and USD1.

## 🔧 Management Functions

### Strategy Management

```solidity
function addStrategy(address strategy, uint256 weight) external
```
Add a new yield strategy with allocation weight (0-10000 basis points).

```solidity
function removeStrategy(address strategy) external
```
Remove strategy and withdraw all assets from it.

```solidity
function forceDeployToStrategies() external
```
Deploy idle vault assets to strategies according to weights.

### Reporting & Maintenance

```solidity
function report() external returns (uint256 profit, uint256 loss)
```
Calculate profit/loss, charge performance fees, unlock profits gradually.

```solidity
function tend() external
```
Deploy idle assets to strategies without full report.

### Configuration

```solidity
function setPerformanceFee(uint16 fee) external
function setSwapSlippage(uint256 slippageBps) external
function setDeploymentParams(uint256 threshold, uint256 interval) external
function setTWAPInterval(uint32 interval) external
function setMaxTotalSupply(uint256 max) external
```

### Emergency Controls

```solidity
function setPaused(bool paused) external
function shutdownStrategy() external
function emergencyWithdraw(uint256 wlfiAmount, uint256 usd1Amount, address to) external
```

## 💡 Key Design Decisions

### 1. Synchronous Redemptions
**Why:** Immediate WLFI transfers provide better UX and are compatible with wrapper architecture.

**How it works:**
- User calls `redeem()` or `withdraw()`
- Vault calculates assets and burns shares
- Internal `_ensureWlfi()` pulls from strategies if needed
- WLFI transferred to user **in same transaction**

### 2. WLFI-Denominated Accounting
**Why:** Strict ERC-4626 compliance requires `totalAssets()` in asset token units.

**Implementation:**
- `totalAssets()` returns WLFI units
- USD1 holdings converted to WLFI-equivalent for accounting
- Share price calculation based on WLFI units

### 3. Dual Token Support
**Why:** Vault can accept both WLFI and USD1 for flexibility.

**How it works:**
- `deposit()` accepts WLFI only
- `depositDual()` accepts both WLFI and USD1
- USD1 automatically swapped to WLFI via Uniswap V3
- Slippage protection ensures minimum WLFI output

## 🛡️ Security Features

### Access Control
- **Owner**: Full administrative control
- **Management**: Strategy management, fee configuration
- **Keeper**: Can call report(), tend(), maintenance functions
- **Emergency Admin**: Can pause and shutdown

### Safety Mechanisms
- ✅ ReentrancyGuard on all state-changing functions
- ✅ Slippage protection on USD1→WLFI swaps
- ✅ Oracle staleness checks (24h max)
- ✅ Price sanity checks (USD1 must be $0.95-$1.05)
- ✅ Emergency pause capability
- ✅ Shutdown mode for critical situations
- ✅ Performance fee cap (50% maximum)

### Liquidity Management
- ✅ `_ensureWlfi()` auto-pulls from strategies
- ✅ Deployment threshold maintains idle balance
- ✅ USD1→WLFI conversion as backup liquidity
- ✅ Strategy weight system for allocation

## 📊 Default Configuration

```solidity
maxTotalSupply = 50_000_000e18;      // 50M shares max
performanceFee = 1000;                // 10% on profits
profitMaxUnlockTime = 7 days;         // Profit unlock period
deploymentThreshold = 100e18;         // Min WLFI for strategy deploy
swapSlippageBps = 50;                 // 0.5% slippage tolerance
twapInterval = 1800;                  // 30min TWAP
maxPriceAge = 86400;                  // 24h max oracle age
```

## 🚀 Integration with EagleVaultWrapper

### User Flow

```typescript
// 1. Deposit to vault (get vEAGLE shares)
vault.deposit(1000e18, user);

// 2. Wrap to OFT (1% fee)
wrapper.wrap(1000e18);
// User now has EagleShareOFT (omnichain token)

// 3. Bridge to other chains via LayerZero
eagleOFT.send(arbitrumEid, 1000e18, ...);

// ... time passes, user holds/trades on Arbitrum ...

// 4. Bridge back to hub
eagleOFT.send(sonicEid, 1000e18, ...);

// 5. Unwrap from OFT (2% fee)
wrapper.unwrap(1000e18);
// User has vEAGLE shares again

// 6. Redeem from vault (immediate WLFI)
vault.redeem(1000e18, user, user);
// User receives WLFI
```

## 🧪 Testing

```bash
# Run all vault tests
forge test --match-contract EagleOVaultSyncTest

# Run specific test
forge test --match-test test_SyncRedeemImmediate -vv

# Run with gas report
forge test --match-contract EagleOVaultSyncTest --gas-report
```

## 📈 Gas Estimates

| Operation | Gas Cost (est.) |
|-----------|----------------|
| deposit() | ~150k |
| depositDual() | ~250k (with swap) |
| redeem() | ~180k |
| withdraw() | ~180k |
| Redeem with strategy withdrawal | ~300k |

## 🔍 Key Differences from Standard Vaults

### vs Standard ERC-4626
- ✅ Dual token support (WLFI + USD1)
- ✅ Automatic USD1→WLFI conversion
- ✅ Strategy deployment system
- ✅ Profit unlocking mechanism
- ✅ Oracle integration for USD1 conversion

### vs Traditional Yearn-style Vaults
- ✅ WLFI-denominated instead of USD value
- ✅ Synchronous redemptions (no waiting period)
- ✅ Dual token deposits with auto-swapping
- ✅ Built for omnichain via wrapper integration

## 🐛 Troubleshooting

### "InsufficientBalance" on Redeem
**Cause:** Vault doesn't have enough WLFI available
**Solution:** `_ensureWlfi()` automatically pulls from strategies. If this fails, strategies may be locked or at a loss.

### "SlippageExceeded" on depositDual
**Cause:** USD1→WLFI swap slippage exceeded tolerance
**Solution:** Adjust `swapSlippageBps` or wait for better market conditions

### "StalePrice" Error
**Cause:** Oracle hasn't updated in >24h
**Solution:** Check oracle health or adjust `maxPriceAge`

## 📚 Related Documentation

- [EagleVaultWrapper Documentation](./contracts/EagleVaultWrapper.sol)
- [LayerZero Integration Guide](./LAYERZERO_WRAPPER_INTEGRATION.md)
- [WLFI Refactor Documentation](./REFACTOR_DOCUMENTATION.md)
- [Strategy Interface](./contracts/interfaces/IStrategy.sol)

## 📞 Support

- **Repository**: [eagle-ovault-clean](/)
- **ERC-4626 Standard**: [EIP-4626](https://eips.ethereum.org/EIPS/eip-4626)
- **LayerZero Docs**: [docs.layerzero.network](https://docs.layerzero.network)

## 📜 License

MIT License

---

**EagleOVault** - Synchronous, WLFI-denominated, wrapper-compatible vault for the omnichain era! 🦅🚀

