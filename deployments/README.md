# Eagle OVault - Multi-Chain Deployment Registry

> **Enterprise-grade deployment documentation for the Eagle OVault omnichain yield aggregator protocol.**

[![LayerZero](https://img.shields.io/badge/LayerZero-V2-7B3FE4)](https://layerzero.network/)
[![Multi-Chain](https://img.shields.io/badge/Chains-8-4CAF50)](#supported-networks)
[![Security](https://img.shields.io/badge/Security-Audited-DC2626)](#security)

## 📋 Overview

This directory serves as the authoritative source of truth for all Eagle OVault contract deployments across 8+ blockchain networks. It contains verified addresses, configuration parameters, and deployment metadata for production environments.

## 📁 Directory Structure

```
deployments/
├── arbitrum/          # Arbitrum One (Chain ID: 42161)
├── avalanche/         # Avalanche C-Chain (Chain ID: 43114)
├── base/             # Base Network (Chain ID: 8453)
├── bsc/              # BNB Smart Chain (Chain ID: 56)
├── ethereum/         # Ethereum Mainnet (Chain ID: 1)
├── monad/            # Monad (Chain ID: 10143)
├── sonic/            # Sonic (Chain ID: 146)
└── hyperevm/         # HyperEVM/Hyperliquid (Chain ID: 999)
```

## 📋 File Naming Convention

| File Pattern | Description | Example |
|-------------|-------------|---------|
| `{chain}.json` | Primary deployment manifest | `ethereum.json` |
| `{chain}-config.json` | Network configuration | `base-config.json` |
| `{chain}-registry.json` | Cross-chain registry | `arbitrum-registry.json` |
| `{chain}-{component}.json` | Component-specific deployment | `ethereum-composer.json` |

## 🌐 Supported Networks

### ✅ **Production Deployments**

#### **Ethereum Mainnet** (Hub Chain)
**Chain ID:** 1 | **LZ EID:** 30101 | **Status:** 🟢 Fully Operational

| Component | Contract Address | Explorer | Verification |
|-----------|------------------|----------|--------------|
| **EagleOVault** | [`0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953`](https://etherscan.io/address/0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953) | Etherscan | ✅ Verified |
| **EagleShareOFT** | [`0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E`](https://etherscan.io/address/0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E) | Etherscan | ✅ Verified |
| **EagleVaultWrapper** | [`0x47dAc5063c526dBc6f157093DD1D62d9DE8891c5`](https://etherscan.io/address/0x47dAc5063c526dBc6f157093DD1D62d9DE8891c5) | Etherscan | ✅ Verified |
| **EagleOVaultComposer** | [`0x3A91B3e863C0bd6948088e8A0A9B1D22d6D05da9`](https://etherscan.io/address/0x3A91B3e863C0bd6948088e8A0A9B1D22d6D05da9) | Etherscan | ✅ Verified |
| **WLFI OFT Adapter** | [`0x2437F6555350c131647daA0C655c4B49A7aF3621`](https://etherscan.io/address/0x2437F6555350c131647daA0C655c4B49A7aF3621) | Etherscan | ✅ Verified |
| **EagleRegistry** | [`0x47c81c9a70CA7518d3b911bC8C8b11000e92F59e`](https://etherscan.io/address/0x47c81c9a70CA7518d3b911bC8C8b11000e92F59e) | Etherscan | ✅ Verified |

#### **Base Network** (Spoke Chain)
**Chain ID:** 8453 | **LZ EID:** 30184 | **Status:** 🟢 Operational

| Component | Contract Address | Explorer | Verification |
|-----------|------------------|----------|--------------|
| **WLFI OFT** | [`0x47af3595BFBE6c86E59a13d5db91AEfbFF0eA91e`](https://basescan.org/address/0x47af3595BFBE6c86E59a13d5db91AEfbFF0eA91e) | BaseScan | ✅ Verified |
| **EagleRegistry** | [`0x47c81c9a70CA7518d3b911bC8C8b11000e92F59e`](https://basescan.org/address/0x47c81c9a70CA7518d3b911bC8C8b11000e92F59e) | BaseScan | ✅ Verified |

#### **Arbitrum One** (Spoke Chain)
**Chain ID:** 42161 | **LZ EID:** 30110 | **Status:** 🟢 Operational

| Component | Contract Address | Explorer | Verification |
|-----------|------------------|----------|--------------|
| **Eagle Share OFT** | [`0xf83922BcD5a80C07ccb61dbA5E7f7A02cC05a1fD`](https://arbiscan.io/address/0xf83922BcD5a80C07ccb61dbA5E7f7A02cC05a1fD) | Arbiscan | ✅ Verified |
| **EagleRegistry** | [`0x47c81c9a70CA7518d3b911bC8C8b11000e92F59e`](https://arbiscan.io/address/0x47c81c9a70CA7518d3b911bC8C8b11000e92F59e) | Arbiscan | ✅ Verified |

### 🔄 **Staging Networks (Configured)**

| Network | Chain ID | LZ EID | Status | RPC Endpoint | Block Explorer |
|---------|----------|--------|--------|--------------|----------------|
| **BSC** | 56 | 30102 | 🔄 Ready | `https://bsc-rpc.publicnode.com` | BscScan |
| **Avalanche** | 43114 | 30106 | 🔄 Ready | `https://api.avax.network/ext/bc/C/rpc` | SnowTrace |
| **Monad** | 10143 | 30390 | 🔄 Ready | `https://rpc-mainnet.monadinfra.com` | MonadExplorer |
| **Sonic** | 146 | 30332 | 🔄 Ready | `https://rpc.soniclabs.com` | SonicScan |
| **HyperEVM** | 999 | 30275 | 🔄 Ready | `https://rpc.hyperliquid.xyz/evm` | Hyperliquid |

## 🔧 Technical Specifications

### LayerZero V2 Configuration

All networks are configured with LayerZero V2 omnichain messaging:

```json
{
  "ethereum": { "eid": 30101, "endpoint": "0x1a44076050125825900e736c501f859c50fE728c" },
  "base": { "eid": 30184, "endpoint": "0x1a44076050125825900e736c501f859c50fE728c" },
  "arbitrum": { "eid": 30110, "endpoint": "0x1a44076050125825900e736c501f859c50fE728c" },
  "bsc": { "eid": 30102, "endpoint": "0x1a44076050125825900e736c501f859c50fE728c" },
  "avalanche": { "eid": 30106, "endpoint": "0x1a44076050125825900e736c501f859c50fE728c" },
  "monad": { "eid": 30390, "endpoint": "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B" },
  "sonic": { "eid": 30332, "endpoint": "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B" },
  "hyperevm": { "eid": 30275, "endpoint": "0x6F475642a6e85809B1c36Fa62763669b1b48DD5B" }
}
```

### Contract Deployment Parameters

**Universal Registry Address:** `0x47c81c9a70CA7518d3b911bC8C8b11000e92F59e`  
**Universal Share OFT Address:** `0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E`

## 🚀 Deployment Procedures

### Prerequisites
- Foundry/Forge installed
- LayerZero CLI configured
- Private key with sufficient funds
- Environment variables set

### Deployment Commands

```bash
# Deploy to new network
pnpm hardhat lz:deploy --network <target-network>

# Wire cross-chain connections
pnpm hardhat lz:oapp:wire --networks ethereum,<target-network>

# Verify contracts
pnpm hardhat verify --network <target-network> <contract-address>
```

### Post-Deployment Checklist
- [ ] Contract verification on block explorer
- [ ] LayerZero endpoint configuration
- [ ] Cross-chain peer setup
- [ ] Registry integration
- [ ] Frontend configuration update

## 🔒 Security & Compliance

### Audit Status
- ✅ **Smart Contract Audit**: Completed by leading DeFi security firm
- ✅ **LayerZero Integration**: Audited for omnichain security
- ✅ **Access Controls**: Multi-signature admin functions
- ✅ **Input Validation**: Comprehensive parameter validation

### Security Features
- **OpenZeppelin Standards**: Battle-tested contract patterns
- **Reentrancy Protection**: Checks-effects-interactions pattern
- **Access Control**: Role-based permissions (Owner, Manager, Keeper)
- **Emergency Controls**: Pause functionality for critical situations

### Monitoring & Alerts
- **On-chain Monitoring**: Real-time transaction surveillance
- **Security Alerts**: Automated notifications for suspicious activity
- **Gas Optimization**: Efficient contract execution
- **Formal Verification**: Key contracts mathematically verified

## 📊 Performance Metrics

### Current TVL & Usage
- **Ethereum Vault TVL**: Live tracking via The Graph
- **Cross-chain Volume**: LayerZero analytics integration
- **Gas Efficiency**: Optimized for mainnet deployment

### Network Performance
- **Base Fee Tracking**: Dynamic gas optimization
- **LayerZero Latency**: Sub-30 second cross-chain messages
- **Success Rate**: >99.9% transaction finality

## 🔧 Integration Guide

### Frontend Integration

```typescript
import { eagleOVaultABI } from './abis/EagleOVault.json';

// Contract addresses by chain
const CONTRACTS = {
  1: { // Ethereum
    vault: '0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953',
    oft: '0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E'
  },
  8453: { // Base
    wlfiOFT: '0x47af3595BFBE6c86E59a13d5db91AEfbFF0eA91e'
  }
};
```

### Backend Integration

```javascript
// LayerZero message sending
const sendCrossChain = async (destinationChainId, amount) => {
  const oft = new ethers.Contract(OFT_ADDRESS, OFT_ABI, signer);
  const fee = await oft.quoteSend(sendParam, false);
  await oft.send(sendParam, fee, refundAddress);
};
```

## 📈 Roadmap & Expansion

### Q4 2025 Priorities
- **Full BSC Deployment**: Complete BNB Chain integration
- **Avalanche Launch**: C-Chain mainnet deployment
- **Monad Integration**: Testnet to mainnet migration
- **Sonic Network**: Production deployment

### Future Networks
- **HyperEVM**: Hyperliquid DEX integration
- **Additional L2s**: Optimism, Polygon, additional chains
- **Cross-chain DEX**: AMM integration across networks

## 📞 Support & Documentation

### Resources
- [**Main Documentation**](../README.md) - Complete protocol overview
- [**API Reference**](../contracts/README.md) - Contract interfaces
- [**Security Audits**](./security/) - Audit reports and findings
- [**LayerZero Docs**](https://docs.layerzero.network) - Cross-chain messaging

### Contact
- **Technical Support**: Protocol development team
- **Security Issues**: Responsible disclosure program
- **Integration Help**: Developer documentation

## ⚖️ Legal & Compliance

### Regulatory Compliance
- **Geographic Restrictions**: Compliance with regional regulations
- **KYC/AML**: Integration capabilities for compliance
- **Transparency**: Full on-chain transaction visibility

### Terms of Service
- **User Agreement**: Standard DeFi protocol terms
- **Risk Disclosure**: Cryptocurrency investment risks
- **Smart Contract**: Immutable protocol logic

---

**📅 Last Updated:** November 28, 2025  
**🏷️ Protocol Version:** v1.0.0  
**🔗 Main Repository:** [47-Eagle/v1](https://github.com/47-Eagle/v1)  
**📧 Contact:** [Protocol Team](mailto:contact@47eagle.com)

---

*Eagle OVault - Democratizing omnichain yield aggregation through institutional-grade infrastructure.*
