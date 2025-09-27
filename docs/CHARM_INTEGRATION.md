# Charm Finance Alpha Vaults Integration

## Overview

This integration adds **Charm Finance Alpha Vaults** support to the EagleOVault ecosystem, enabling automated Uniswap V3 liquidity management through a clean strategy-based architecture.

## Architecture

### Strategy-Based Design

Instead of modifying the core `EagleOVault` directly, we implemented a **pluggable strategy system** that maintains:

- ✅ **Clean separation of concerns**
- ✅ **Minimal changes to audited core code**
- ✅ **Flexibility to add multiple strategies**
- ✅ **LayerZero omnichain compatibility**

### Omnichain Architecture

```
🌐 OMNICHAIN EAGLE VAULT ECOSYSTEM
════════════════════════════════════════════════════════════════════════

HUB CHAIN (Ethereum Mainnet)
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  ┌─────────────────────┐    ┌──────────────────────┐    ┌─────────┐ │
│  │   EagleOVaultV2     │    │ CharmAlphaVault      │    │ Charm   │ │
│  │   (Main Vault)      │◄──►│ Strategy             │◄──►│ Alpha   │ │
│  │                     │    │ (Wrapper)            │    │ Vault   │ │
│  └─────────────────────┘    └──────────────────────┘    └─────────┘ │
│           │                                                         │
│           │ Manages all yield-generating strategies                 │
│           │ Holds WLFI + USD1 assets                               │
│           │                                                         │
└─────────────────────────────────────────────────────────────────────┘
            │
            │ LayerZero Cross-Chain Messages
            │
┌───────────▼─────────────────────────────────────────────────────────┐
│                      SPOKE CHAINS                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  BSC              │  Arbitrum         │  Base             │ Avalanche│
│  ┌─────────────┐  │  ┌─────────────┐  │  ┌─────────────┐  │ ┌──────┐│
│  │ WLFI-OFT    │  │  │ WLFI-OFT    │  │  │ WLFI-OFT    │  │ │WLFI  ││
│  │ USD1-OFT    │  │  │ USD1-OFT    │  │  │ USD1-OFT    │  │ │USD1  ││
│  │ EAGLE-OFT   │  │  │ EAGLE-OFT   │  │  │ EAGLE-OFT   │  │ │EAGLE ││
│  └─────────────┘  │  └─────────────┘  │  └─────────────┘  │ └──────┘│
│                   │                   │                   │         │
│  Users deposit    │  Users deposit    │  Users deposit    │ Users   │
│  WLFI/USD1       │  WLFI/USD1       │  WLFI/USD1       │ deposit │
│  receive EAGLE    │  receive EAGLE    │  receive EAGLE    │ & get   │
│                   │                   │                   │ EAGLE   │
└─────────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| **EagleOVaultV2** | Ethereum | Main vault with strategy management |
| **CharmAlphaVaultStrategy** | Ethereum | Wrapper for Charm Finance integration |
| **Asset OFTs** (WLFI, USD1) | All chains | Cross-chain asset transfers |
| **Share OFT** (EAGLE) | All chains | Cross-chain share transfers |
| **OVault Composer** | Ethereum | Orchestrates cross-chain operations |

## Key Files

| File | Purpose |
|------|---------|
| `contracts/EagleOVaultV2.sol` | Enhanced vault with strategy support |
| `contracts/strategies/CharmAlphaVaultStrategy.sol` | Charm Finance wrapper strategy |
| `contracts/interfaces/IStrategy.sol` | Standardized strategy interface |
| `scripts/deployCharmIntegration.ts` | Deployment and testing script |

## Features

### EagleOVaultV2 Enhancements

- **Multiple Strategy Support**: Add/remove strategies dynamically
- **Weighted Allocation**: Distribute funds across strategies with configurable weights
- **Automatic Rebalancing**: Maintain target allocations across vault and strategies
- **Strategy Isolation**: Each strategy operates independently with proper error handling
- **Backwards Compatibility**: Maintains ERC4626 compliance and LayerZero integration

### CharmAlphaVaultStrategy Features

- **Uniswap V3 LP Management**: Automated position management through Charm's optimized algorithms
- **Slippage Protection**: Configurable slippage limits for all operations
- **Emergency Controls**: Pause/resume functionality for risk management
- **Proportional Withdrawals**: Handles partial withdrawals maintaining proper ratios

## Integration Benefits

### For Users
- **Enhanced Yields**: Access to Charm's sophisticated LP strategies
- **Reduced Complexity**: Simple deposit/withdraw interface
- **Risk Management**: Professional-grade slippage and exposure controls
- **Cross-Chain Access**: Same familiar omnichain interface via LayerZero

### For Protocol
- **Modular Architecture**: Easy to add new strategies (Uniswap direct, other protocols)
- **Risk Isolation**: Strategy failures don't impact core vault operations
- **Scalable Design**: Support multiple strategies with different risk profiles
- **Maintained Compatibility**: No breaking changes to existing integrations

## Deployment Guide

### Prerequisites

```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile
```

### Network Configuration

The system is configured for the following networks:

| Network | Role | Chain ID | Purpose |
|---------|------|----------|---------|
| **Ethereum** | **Hub** | 1 | Main vault + strategies |
| **BSC** | Spoke | 56 | User deposits/withdrawals |
| **Arbitrum** | Spoke | 42161 | User deposits/withdrawals |
| **Base** | Spoke | 8453 | User deposits/withdrawals |
| **Avalanche** | Spoke | 43114 | User deposits/withdrawals |

### Deployment Steps

#### 1. **Deploy Hub (Ethereum Mainnet)**
```bash
# Deploy main vault and strategies on Ethereum
npx hardhat run scripts/deploy.ts --network ethereum
```

#### 2. **Deploy Spoke Chains (BSC, Arbitrum, Base, Avalanche)**
```bash
# Deploy OFT tokens on each spoke chain
npx hardhat run scripts/deployOFTs.ts --network bsc
npx hardhat run scripts/deployOFTs.ts --network arbitrum
npx hardhat run scripts/deployOFTs.ts --network base
npx hardhat run scripts/deployOFTs.ts --network avalanche
```

#### 3. **Initialize Strategy**
```typescript
// Initialize Charm vault (on Ethereum)
await charmStrategy.initializeVault(maxTotalSupply);

// Add to EagleVault with allocation weight
await eagleVault.addStrategy(charmStrategy.address, 5000); // 50% allocation
```

#### 4. **Configure Cross-Chain**
```typescript
// Set LayerZero endpoints and configure OFT connections
// This connects all spoke chains to the Ethereum hub
```

3. **Configure Parameters**
```typescript
// Set strategy parameters
await charmStrategy.updateParameters(
    500,  // 5% max slippage
    1000  // 10% rebalance threshold
);
```

### Production Deployment Checklist

- [ ] **Audit Strategy Contract**: Complete security audit of CharmAlphaVaultStrategy
- [ ] **Test Integration**: Comprehensive testing on testnet
- [ ] **Verify Contracts**: Verify all contracts on block explorer
- [ ] **Set up Monitoring**: Implement strategy performance monitoring
- [ ] **Configure Governance**: Set up multi-sig for strategy management
- [ ] **Deploy Gradually**: Start with low allocation weights

## Usage Examples

### Basic Dual-Token Deposit
```typescript
// Deposit both WLFI and USD1
const tx = await eagleVault.depositDual(
    ethers.parseEther("1000"), // 1000 WLFI
    ethers.parseEther("1000"), // 1000 USD1
    userAddress
);

// Funds automatically allocated across strategies based on weights
```

### Single-Asset Deposit (ERC4626 Compatible)
```typescript
// Deposit only WLFI (primary asset)
const tx = await eagleVault.deposit(
    ethers.parseEther("2000"), // 2000 WLFI
    userAddress
);
```

### Strategy Management (Manager Only)
```typescript
// Add new strategy with 30% allocation
await eagleVault.addStrategy(newStrategy.address, 3000);

// Update existing strategy weight
await eagleVault.updateStrategyWeight(charmStrategy.address, 4000); // 40%

// Remove strategy (withdraws all funds first)
await eagleVault.removeStrategy(oldStrategy.address);

// Trigger manual rebalance
await eagleVault.rebalance();
```

### Monitoring Strategy Performance
```typescript
// Get strategy breakdown
const [strategies, weights] = await eagleVault.getStrategies();
const [, wlfiAmounts, usd1Amounts] = await eagleVault.getStrategyAssets();

// Check if rebalance needed
const needsRebalance = await eagleVault.needsRebalance();

// Get total assets across vault and strategies
const totalAssets = await eagleVault.totalAssets();
```

## Strategy Interface

Any new strategy must implement the `IStrategy` interface:

```solidity
interface IStrategy {
    function getTotalAmounts() external view returns (uint256 wlfiAmount, uint256 usd1Amount);
    function isInitialized() external view returns (bool);
    function deposit(uint256 wlfiAmount, uint256 usd1Amount) external returns (uint256 shares);
    function withdraw(uint256 shares) external returns (uint256 wlfiAmount, uint256 usd1Amount);
    function rebalance() external;
}
```

## Risk Considerations

### Strategy Risks
- **Smart Contract Risk**: Charm Alpha Vault contract vulnerabilities
- **Uniswap V3 Risk**: Impermanent loss and liquidity risks
- **Concentration Risk**: Over-allocation to single strategy

### Mitigation Measures
- **Strategy Limits**: Maximum allocation caps per strategy
- **Emergency Pause**: Ability to halt strategy operations
- **Gradual Rollout**: Start with low allocation percentages
- **Regular Monitoring**: Track strategy performance metrics

## Upgrade Path

### Phase 1: Basic Integration (Current)
- [x] Strategy wrapper for Charm Alpha Vaults
- [x] Basic allocation and rebalancing
- [x] Emergency controls

### Phase 2: Advanced Features
- [ ] Multiple Charm vault support (different fee tiers)
- [ ] Dynamic allocation based on performance
- [ ] Advanced slippage optimization

### Phase 3: Multi-Protocol
- [ ] Direct Uniswap V3 strategy
- [ ] Balancer V2 strategy  
- [ ] Curve strategy support

## Testing

```bash
# Run unit tests
npx hardhat test

# Test specific integration
npx hardhat test test/CharmIntegration.test.ts

# Run deployment on localhost
npx hardhat node
npx hardhat run scripts/deployCharmIntegration.ts --network localhost
```

## Monitoring & Analytics

### Key Metrics
- **Total Value Locked (TVL)** across all strategies
- **Yield Generated** per strategy
- **Allocation Drift** from target weights
- **Rebalance Frequency** and costs

### Recommended Dashboards
- Strategy performance comparison
- Asset allocation visualization  
- Historical yield tracking
- Risk metrics monitoring

## Support & Maintenance

### Regular Tasks
- Monitor strategy performance
- Rebalance when thresholds exceeded
- Update strategy parameters as needed
- Review and audit new strategies

### Emergency Procedures
- Pause strategies if issues detected
- Withdraw funds from problematic strategies
- Update strategy weights to reduce exposure
- Coordinate with Charm Finance on protocol updates

---

## Conclusion

This integration provides a robust, scalable foundation for adding sophisticated yield strategies to the EagleOVault ecosystem while maintaining the security and simplicity that users expect. The modular design enables continuous enhancement with additional strategies and protocols.
