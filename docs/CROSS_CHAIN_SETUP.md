# Cross-Chain Setup Guide

## Overview

This guide walks through deploying and configuring the complete **Omnichain Eagle Vault** system with LayerZero V2 integration.

## Architecture Summary

```
🌐 OMNICHAIN EAGLE VAULT ECOSYSTEM
═══════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│                           HUB CHAIN (Ethereum)                             │
│                                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │ EagleVault  │  │    Charm     │  │    Hub      │  │     Vault       │  │
│  │     V2      │◄─┤  Strategy    │  │    OFTs     │◄─┤   Composer      │  │
│  │             │  │              │  │             │  │                 │  │
│  └─────────────┘  └──────────────┘  └─────────────┘  └─────────────────┘  │
│         │                                    │                            │
│         │ All strategies & yield generation  │ LayerZero messaging         │
│         │                                    │                            │
└─────────────────────────────────────────────┼────────────────────────────┘
                                               │
        ┌──────────────────────────────────────┼──────────────────────────────────────┐
        │                                      │                                      │
        ▼                                      ▼                                      ▼
┌─────────────┐                        ┌─────────────┐                        ┌─────────────┐
│     BSC     │                        │  ARBITRUM   │                        │    BASE     │
│             │                        │             │                        │             │
│ ┌─────────┐ │                        │ ┌─────────┐ │                        │ ┌─────────┐ │
│ │WLFI-OFT │ │                        │ │WLFI-OFT │ │                        │ │WLFI-OFT │ │
│ │USD1-OFT │ │                        │ │USD1-OFT │ │                        │ │USD1-OFT │ │
│ │EAGLE-OFT│ │                        │ │EAGLE-OFT│ │                        │ │EAGLE-OFT│ │
│ └─────────┘ │                        │ └─────────┘ │                        │ └─────────┘ │
│             │                        │             │                        │             │
│ Users deposit│                        │ Users deposit│                        │ Users deposit│
│ & get shares │                        │ & get shares │                        │ & get shares │
└─────────────┘                        └─────────────┘                        └─────────────┘
```

## Prerequisites

1. **Node.js** 18+ with npm/yarn
2. **Private keys** for deployment accounts on each chain
3. **RPC URLs** for target networks
4. **LayerZero V2** endpoint addresses (provided in scripts)

## Environment Setup

Create `.env` file:

```bash
# Deployment account
PRIVATE_KEY=your_private_key_here

# RPC URLs
RPC_URL_ETHEREUM=https://ethereum-rpc.publicnode.com
RPC_URL_BSC=https://bsc-rpc.publicnode.com
RPC_URL_ARBITRUM=https://arbitrum-rpc.publicnode.com
RPC_URL_BASE=https://base-rpc.publicnode.com
RPC_URL_AVALANCHE=https://avalanche-rpc.publicnode.com

# Testnets
RPC_URL_SEPOLIA=https://sepolia-rpc.publicnode.com
RPC_URL_BSC_TESTNET=https://bsc-testnet-rpc.publicnode.com

# For production - set actual token addresses
WLFI_TOKEN_ADDRESS=0x...  # Real WLFI token address
USD1_TOKEN_ADDRESS=0x...  # Real USD1 token address
CHARM_FACTORY_ADDRESS=0x... # Real Charm Finance factory
```

## Step-by-Step Deployment

### Phase 1: Deploy Hub Chain (Ethereum)

```bash
# Deploy to Ethereum mainnet
npx hardhat run scripts/deploy-omnichain-system.ts --network ethereum

# Or Sepolia testnet
npx hardhat run scripts/deploy-omnichain-system.ts --network sepolia
```

**What this deploys:**
- ✅ EagleOVaultV2 (main vault with strategy support)
- ✅ CharmAlphaVaultStrategy (Uniswap V3 LP management)
- ✅ Hub OFT tokens (WLFI-OFT, EAGLE-OFT)
- ✅ VaultComposer (orchestrates cross-chain operations)

**Expected Output:**
```
🏦 HUB DEPLOYMENT COMPLETE!
📋 Hub Vault: 0x1234...
🎯 Charm Strategy: 0x5678...
🎼 Composer: 0x9abc...
💾 Deployment saved to: ./deployments/ethereum.json
```

### Phase 2: Deploy Spoke Chains

Set the hub vault address from Phase 1:
```bash
export HUB_VAULT_ADDRESS=0x1234... # From Phase 1 output
```

Deploy to each spoke chain:

```bash
# Deploy to BSC
npx hardhat run scripts/deploy-omnichain-system.ts --network bsc

# Deploy to Arbitrum
npx hardhat run scripts/deploy-omnichain-system.ts --network arbitrum

# Deploy to Base
npx hardhat run scripts/deploy-omnichain-system.ts --network base

# Deploy to Avalanche
npx hardhat run scripts/deploy-omnichain-system.ts --network avalanche
```

**What this deploys on each spoke:**
- ✅ Spoke OFT tokens (WLFI-OFT, USD1-OFT, EAGLE-OFT)
- ✅ User interface contracts (coming soon)
- ✅ Cross-chain connection configuration

### Phase 3: Configure Cross-Chain Connections

After deploying to all chains, configure the LayerZero connections:

```bash
# Configure hub connections to all spokes
npx hardhat run scripts/configure-cross-chain.ts --network ethereum

# Configure each spoke connection to hub
npx hardhat run scripts/configure-cross-chain.ts --network bsc
npx hardhat run scripts/configure-cross-chain.ts --network arbitrum
npx hardhat run scripts/configure-cross-chain.ts --network base
npx hardhat run scripts/configure-cross-chain.ts --network avalanche
```

**What this configures:**
- ✅ OFT peer relationships between chains
- ✅ Trusted remote addresses for LayerZero
- ✅ Gas limits and messaging options
- ✅ Cross-chain send/receive permissions

### Phase 4: Testing

Test the system on each network:

```bash
# Test hub functionality
npx hardhat run scripts/test-cross-chain.ts --network ethereum

# Test spoke functionality
npx hardhat run scripts/test-cross-chain.ts --network bsc
npx hardhat run scripts/test-cross-chain.ts --network arbitrum
```

## Network Configuration

| Network | Chain ID | LayerZero EID | Endpoint Address |
|---------|----------|---------------|------------------|
| **Ethereum** | 1 | 30101 | 0x1a44076050125825900e736c501f859c50fE728c |
| **BSC** | 56 | 30102 | 0x4D73AdB72bC3DD368966edD0f0b2148401A178E2 |
| **Arbitrum** | 42161 | 30110 | 0x1a44076050125825900e736c501f859c50fE728c |
| **Base** | 8453 | 30184 | 0x1a44076050125825900e736c501f859c50fE728c |
| **Avalanche** | 43114 | 30106 | 0x1a44076050125825900e736c501f859c50fE728c |

### Testnets

| Network | Chain ID | LayerZero EID | Endpoint Address |
|---------|----------|---------------|------------------|
| **Sepolia** | 11155111 | 40161 | 0x6EDCE65403992e310A62460808c4b910D972f10f |
| **BSC Testnet** | 97 | 40102 | 0x6EDCE65403992e310A62460808c4b910D972f10f |

## User Journey

### Deposit Flow (BSC → Ethereum)

1. **User on BSC** has WLFI and USD1 tokens
2. **User calls** `depositCrossChain()` on BSC interface
3. **BSC OFT** bridges assets to Ethereum via LayerZero
4. **Ethereum Composer** receives assets and deposits to Eagle Vault
5. **Eagle Vault** deploys 30% to Charm strategy for Uniswap V3 LP
6. **Eagle Vault** mints EAGLE shares
7. **Ethereum OFT** sends shares back to BSC via LayerZero
8. **User receives** EAGLE shares on BSC

### Withdraw Flow (BSC ← Ethereum)

1. **User on BSC** burns EAGLE shares
2. **BSC OFT** sends burn message to Ethereum via LayerZero
3. **Ethereum Composer** withdraws proportional assets from vault
4. **Strategies** liquidate positions as needed
5. **Ethereum OFT** sends WLFI/USD1 back to BSC via LayerZero
6. **User receives** original assets on BSC

## Gas Costs & Economics

### Typical Cross-Chain Transaction Costs

| Route | LayerZero Fee | Total Gas Cost |
|-------|---------------|----------------|
| BSC → Ethereum | ~$2-5 | ~$7-15 |
| Arbitrum → Ethereum | ~$1-3 | ~$5-10 |
| Base → Ethereum | ~$1-2 | ~$3-8 |
| Avalanche → Ethereum | ~$2-4 | ~$6-12 |

### Revenue Model

- **Protocol Fee**: 2% of yield (hub vault)
- **Manager Fee**: 1% of yield (hub vault)
- **LayerZero Fees**: Passed through to users
- **Strategy Fees**: Charm Finance fees (minimal)

## Monitoring & Maintenance

### Key Metrics to Track

1. **TVL by Chain**: Monitor asset distribution
2. **Cross-Chain Volume**: Track bridge usage
3. **Strategy Performance**: Charm vault yields
4. **Failed Transactions**: LayerZero message failures
5. **Gas Cost Trends**: Optimize for user experience

### Maintenance Tasks

1. **Rebalance Strategies**: Adjust allocation weights
2. **Update Gas Limits**: Optimize LayerZero options
3. **Monitor Peers**: Ensure connections stay healthy
4. **Strategy Updates**: Add new yield opportunities
5. **Security Monitoring**: Watch for unusual activity

## Troubleshooting

### Common Issues

#### 1. **Compilation Errors**
```bash
# Clean and reinstall dependencies
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npx hardhat compile
```

#### 2. **LayerZero Message Failures**
- Check peer configurations: `scripts/configure-cross-chain.ts`
- Verify gas limits in enforced options
- Monitor LayerZero scan for message status

#### 3. **Cross-Chain Delays**
- Normal: 2-5 minutes for message delivery
- Check LayerZero network status
- Verify sufficient gas on destination

#### 4. **Strategy Deployment Issues**
```bash
# Check strategy configuration
npx hardhat run scripts/test-cross-chain.ts --network ethereum
```

### Emergency Procedures

#### 1. **Pause Vault Operations**
```solidity
// On hub chain only
vault.setPaused(true);
```

#### 2. **Remove Problematic Strategy**
```solidity
vault.removeStrategy(strategyAddress);
```

#### 3. **Update Cross-Chain Limits**
```solidity
oft.setRateLimits(newLimits);
```

## Security Considerations

### Access Control
- **Owner**: Can pause vault, add/remove strategies
- **Manager**: Can rebalance, update parameters
- **Users**: Can deposit/withdraw only

### Strategy Risks
- **Charm Finance**: Smart contract risk, impermanent loss
- **LayerZero**: Cross-chain bridge risk
- **Concentration**: All liquidity on Ethereum hub

### Mitigation Measures
- **Gradual Rollout**: Start with low strategy allocations
- **Regular Audits**: Smart contract security reviews
- **Monitoring**: Real-time alerts for unusual activity
- **Emergency Pause**: Immediate vault shutdown if needed

## Next Steps

1. **✅ Deploy to testnets first**
2. **✅ Test cross-chain functionality**
3. **✅ Conduct security audit**
4. **✅ Deploy to mainnet with low limits**
5. **✅ Gradually increase allocations**
6. **✅ Add more yield strategies**
7. **✅ Monitor and optimize**

## Support

For issues or questions:
- Check deployment logs in `./deployments/`
- Review LayerZero message status
- Test individual components before full system
- Monitor gas costs and adjust limits accordingly

---

## Architecture Benefits

### For Users
- **Multi-Chain Access**: Deposit from any supported chain
- **Ethereum Yields**: Access sophisticated DeFi strategies
- **Simple UX**: Same familiar deposit/withdraw interface
- **Cost Efficient**: Pay spoke chain fees, get Ethereum yields

### For Protocol
- **Liquidity Concentration**: All assets on Ethereum for maximum efficiency
- **Strategy Sophistication**: Full access to Ethereum DeFi ecosystem
- **Scalable**: Easy to add new chains and strategies
- **Revenue Optimized**: Capture users from all major chains

The complete omnichain system is now ready for deployment! 🚀
