import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
// import '@layerzerolabs/toolbox-hardhat' // ESM compatibility issue - use CLI separately

const accounts: string[] = []
if (process.env.PRIVATE_KEY) {
  accounts.push(process.env.PRIVATE_KEY)
}

// Load environment variables
require('dotenv').config()

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.22',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      // Default hardhat network for testing
    },
    // HUB CHAIN - Where the main EagleOVault and Charm Strategy live
    ethereum: {
      url: 'https://ethereum-rpc.publicnode.com',
      accounts,
      chainId: 1,
    },
    // SPOKE CHAINS - Where users can deposit/withdraw via LayerZero
    bsc: {
      url: 'https://bsc-rpc.publicnode.com',
      accounts,
      chainId: 56,
    },
    arbitrum: {
      url: 'https://arbitrum-rpc.publicnode.com',
      accounts,
      chainId: 42161,
    },
    base: {
      url: 'https://base-rpc.publicnode.com',
      accounts,
      chainId: 8453,
    },
    avalanche: {
      url: 'https://api.avax.network/ext/bc/C/rpc',
      accounts,
      chainId: 43114,
    },
    sonic: {
      url: process.env.SONIC_RPC_URL || 'https://rpc.soniclabs.com',
      accounts,
      chainId: 146,
    },
    // TESTNETS
    sepolia: {
      url: process.env.RPC_URL_SEPOLIA || 'https://sepolia-rpc.publicnode.com',
      accounts,
      chainId: 11155111,
    },
    'bsc-testnet': {
      url: process.env.RPC_URL_BSC_TESTNET || 'https://bsc-testnet-rpc.publicnode.com',
      accounts,
      chainId: 97,
    },
  },
  namedAccounts: {
    deployer: {
      default: 0, // Use first account as deployer
    },
  },
}

export default config
