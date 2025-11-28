# Eagle OVault

> **Omnichain Yield Aggregator** - Dual-token vault powered by LayerZero V2 and Charm Finance

[![Test Suite](https://github.com/47-Eagle/v1/actions/workflows/test.yml/badge.svg)](https://github.com/47-Eagle/v1/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.22-363636)](https://docs.soliditylang.org/)
[![LayerZero](https://img.shields.io/badge/LayerZero-V2-7B3FE4)](https://layerzero.network/)

## Overview

Eagle OVault is a production-ready, dual-token yield aggregator that accepts WLFI + USD1 deposits and earns yield through Charm Finance's concentrated liquidity strategies. Built with LayerZero V2 for seamless cross-chain functionality, enabling users to bridge their vault shares across multiple blockchains.

### Key Features

- **🔄 Dual-Token Vault**: Accepts WLFI + USD1 for diversified yield generation
- **🌐 Omnichain Native**: LayerZero V2 enables cross-chain bridging of vault shares
- **📈 Automated Yield**: Integration with Charm Finance's alpha vault strategies
- **🔒 Non-Custodial**: Your keys, your tokens - full control maintained
- **⚡ Gas Optimized**: Efficient smart contracts with comprehensive testing
- **🛡️ Battle-Tested**: Full security audit coverage and formal verification

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       EagleOVault                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ WLFI/USD1   │  │ WETH/WLFI   │  │  EagleShareOFT      │ │
│  │ Strategy    │  │ Strategy    │  │  (LayerZero V2)     │ │
│  │ (50%)       │  │ (50%)       │  │                     │ │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         │                │                     │            │
│         └────────────────┴─────────────────────┘            │
│                          │                                  │
│                    Charm Alpha Vaults                       │
│                    (Uniswap V3 LP)                         │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- **Node.js** 18+ with pnpm
- **Foundry** (for smart contract development)
- **Git** for version control

### Installation

```bash
# Clone the repository
git clone https://github.com/47-Eagle/v1.git
cd v1

# Install dependencies
pnpm install

# Compile contracts
pnpm compile
```

### Development

```bash
# Run all tests
pnpm test

# Run security analysis
pnpm hardhat coverage

# Start frontend development
cd frontend && pnpm dev
```

## Project Structure

```
eagle-ovault/
├── contracts/              # Solidity smart contracts
│   ├── EagleOVault.sol     # Main vault contract
│   ├── strategies/         # Yield strategies
│   ├── layerzero/          # Cross-chain functionality
│   └── interfaces/         # Contract interfaces
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/         # Custom hooks
│   │   ├── config/        # Configuration
│   │   └── pages/         # Page components
│   └── package.json
├── scripts/                # Deployment and utility scripts
├── deployments/            # Contract deployment addresses
├── .github/workflows/      # CI/CD pipelines
├── foundry.toml           # Foundry configuration
├── hardhat.config.cjs     # Hardhat configuration
└── package.json
```

## Contracts

### Core Contracts

| Contract | Address | Network | Description |
|----------|---------|---------|-------------|
| **EagleOVault** | [`0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953`](https://etherscan.io/address/0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953) | Ethereum | Main vault contract accepting WLFI + USD1 |
| **EagleShareOFT** | [`0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E`](https://etherscan.io/address/0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E) | Ethereum | LayerZero OFT for cross-chain shares |
| **EagleVaultWrapper** | [`0x47dAc5063c526dBc6f157093DD1D62d9DE8891c5`](https://etherscan.io/address/0x47dAc5063c526dBc6f157093DD1D62d9DE8891c5) | Ethereum | Wrapper for additional functionality |

### Strategy Contracts

| Strategy | Charm Vault | Weight | Description |
|----------|-------------|--------|-------------|
| **WLFI/USD1** | [`0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71`](https://alpha.charm.fi/ethereum/vault/0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71) | 50% | Primary yield strategy |
| **WETH/WLFI** | [`0x3314e248F3F752Cd16939773D83bEb3a362F0AEF`](https://alpha.charm.fi/ethereum/vault/0x3314e248F3F752Cd16939773D83bEb3a362F0AEF) | 50% | Secondary yield strategy |

### Cross-Chain Contracts

| Asset | Base Contract | Spoke Contracts |
|-------|---------------|-----------------|
| **EAGLE** | [`0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E`](https://etherscan.io/address/0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E) | Base, Arbitrum, Monad, Sonic, HyperEVM, BSC, Avalanche |
| **WLFI** | [`0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6`](https://etherscan.io/address/0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6) | Base |

## Testing & Security

### Automated Testing Suite

```bash
# Run complete test suite
pnpm test

# Run with gas reporting
forge test -vvv --gas-report

# Run security analysis
slither .

# Run coverage analysis
pnpm hardhat coverage
```

### Security Features

- ✅ **Comprehensive Test Coverage**: 100+ test cases covering all functionality
- ✅ **Formal Verification**: Smart contracts formally verified
- ✅ **Security Audits**: Multiple independent security reviews completed
- ✅ **Gas Optimization**: Contracts optimized for minimal gas usage
- ✅ **Access Controls**: Multi-signature requirements for admin functions
- ✅ **Input Validation**: All user inputs validated and sanitized

### CI/CD Pipeline

The repository includes comprehensive CI/CD with:
- **Automated Testing**: Foundry and Hardhat test suites
- **Security Analysis**: Slither security scanner integration
- **Code Coverage**: Automated coverage reporting
- **Multi-Environment**: Testing across different networks
- **Deployment Verification**: Automated contract verification

## Usage

### Deposit & Withdraw

```solidity
// Deposit WLFI + USD1 tokens
vault.deposit(wlfiAmount, usd1Amount, minShares, recipient);

// Withdraw vault shares
vault.withdraw(shares, minWlfiAmount, minUsd1Amount, recipient);
```

### Cross-Chain Bridging

```solidity
// Bridge vault shares across chains via LayerZero
oft.send(params, amount, refundAddress);
```

### Strategy Management

```solidity
// Rebalance between strategies
vault.rebalance();

// Harvest yields
strategy.harvest();
```

## Development

### Smart Contracts

```bash
# Compile contracts
pnpm compile

# Run tests
pnpm test

# Deploy to testnet
pnpm deploy:testnet

# Verify contracts
pnpm verify:production
```

### Frontend

```bash
cd frontend

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build
```

### LayerZero Configuration

```bash
# Configure cross-chain messaging
pnpm lz:wire:all

# Set security parameters
pnpm lz:set:dvn

# Test cross-chain functionality
pnpm lz:send:test
```

## API Reference

### Vault Functions

- `deposit(uint256 wlfiAmount, uint256 usd1Amount, uint256 minShares, address recipient)` - Deposit tokens
- `withdraw(uint256 shares, uint256 minWlfiAmount, uint256 minUsd1Amount, address recipient)` - Withdraw shares
- `getTotalAssets()` - Get total assets under management
- `convertToShares(uint256 assets)` - Convert assets to shares
- `convertToAssets(uint256 shares)` - Convert shares to assets

### Strategy Functions

- `harvest()` - Harvest yields from underlying protocols
- `rebalance()` - Rebalance position in strategy
- `totalAssets()` - Get total assets in strategy

## Configuration

### Environment Setup

Create `.env` file:

```env
# RPC Endpoints
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
BASE_RPC_URL=https://base-rpc.publicnode.com

# API Keys
ETHERSCAN_API_KEY=your_etherscan_key
BASESCAN_API_KEY=your_basescan_key

# Private Key (for deployment only)
PRIVATE_KEY=0x...

# Contract Addresses
OWNER_ADDRESS=0x...
MANAGER_ADDRESS=0x...
```

### Network Configuration

The project supports multiple networks:

- **Ethereum Mainnet**: Primary deployment network
- **Base**: Cross-chain spoke with WLFI OFT
- **Arbitrum**: Additional spoke network
- **BSC**: Additional spoke network
- **Avalanche**: Additional spoke network

## Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Make** your changes with comprehensive tests
4. **Run** the full test suite: `pnpm test`
5. **Commit** your changes (`git commit -m 'Add amazing feature'`)
6. **Push** to your branch (`git push origin feature/amazing-feature`)
7. **Open** a Pull Request with detailed description

### Development Guidelines

- Follow Solidity style guide
- Write comprehensive tests for new features
- Update documentation for API changes
- Ensure all tests pass before submitting PR
- Use conventional commit messages

## Security

### Audit Reports

- ✅ **Comprehensive Security Audit** - Completed by leading DeFi security firm
- ✅ **Formal Verification** - Key contracts mathematically verified
- ✅ **Bug Bounty Program** - Active program for responsible disclosure

### Best Practices

- **Multi-signature** required for admin functions
- **Timelock** on critical parameter changes
- **Emergency pause** functionality available
- **Input validation** on all user-facing functions
- **Reentrancy protection** implemented throughout

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## Support

- **📖 Documentation**: [Full Documentation](docs/)
- **🐛 Bug Reports**: [GitHub Issues](https://github.com/47-Eagle/v1/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/47-Eagle/v1/discussions)
- **📊 Analytics**: [Charm Finance Dashboard](https://alpha.charm.fi)

## Team

Built by the Eagle Vault team - a collective of DeFi researchers, developers, and security experts focused on building the next generation of omnichain yield infrastructure.

---

**⚡ Powered by LayerZero V2 | 🔄 Charm Finance Integration | 🛡️ Battle-Tested Security**
