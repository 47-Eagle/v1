// PRODUCTION DEPLOYMENT - October 31, 2025 (Vanity Addresses)
// All contracts deployed with 0x47... vanity prefix ✨
export const CONTRACTS = {
  // Registry (NEW - Deployment orchestrator)
  REGISTRY: '0x47c81c9a70CA7518d3b911bC8C8b11000e92F59e',     // EagleRegistry (Vanity) ✅
  
  // Core Protocol Contracts
  VAULT: '0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953',       // EagleOVault (Vanity) ✅
  OFT: '0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E',         // EagleShareOFT (Premium Vanity) ✨✅
  WRAPPER: '0x47dAc5063c526dBc6f157093DD1D62d9DE8891c5',     // EagleVaultWrapper (Vanity) ✅
  
  // Strategy Contracts
  STRATEGY_USD1: import.meta.env.VITE_STRATEGY_USD1_ADDRESS || '0x47B2659747d6A7E00c8251c3C3f7e92625a8cf6f',  // CharmStrategyUSD1 (WLFI/USD1 Strategy) ✅
  STRATEGY_WETH: import.meta.env.VITE_STRATEGY_WETH_ADDRESS || '0x5c525Af4153B1c43f9C06c31D32a84637c617FfE',  // CharmStrategyWETH (WETH/WLFI Strategy) ✅
  STRATEGY: import.meta.env.VITE_STRATEGY_ADDRESS || '0x47B2659747d6A7E00c8251c3C3f7e92625a8cf6f',    // Legacy - points to USD1 strategy
  
  // External Contracts - Charm Alpha Vaults
  CHARM_VAULT_USD1: import.meta.env.VITE_CHARM_VAULT_USD1_ADDRESS || '0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71', // Charm USD1/WLFI Alpha Vault
  CHARM_VAULT_WETH: import.meta.env.VITE_CHARM_VAULT_WETH_ADDRESS || '0x3314e248F3F752Cd16939773D83bEb3a362F0AEF', // Charm WETH/WLFI Alpha Vault
  CHARM_VAULT: import.meta.env.VITE_CHARM_VAULT_USD1_ADDRESS || import.meta.env.VITE_CHARM_VAULT_ADDRESS || '0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71', // Legacy - points to USD1 vault
  
  // Uniswap V3 Pools - WLFI/USD1
  UNISWAP_V3_POOL_USD1_1PCT: import.meta.env.VITE_UNISWAP_V3_POOL_USD1_1PCT || '0xf9f5E6f7A44Ee10c72E67Bded6654afAf4D0c85d', // USD1/WLFI 1% Fee Tier (Deposits)
  UNISWAP_V3_POOL_USD1_03PCT: import.meta.env.VITE_UNISWAP_V3_POOL_USD1_03PCT || '0x4637Ea6eCf7E16C99E67E941ab4d7d52eAc7c73d', // USD1/WLFI 0.3% Fee Tier (TWAP)
  UNISWAP_V3_POOL: import.meta.env.VITE_UNISWAP_V3_POOL_USD1_03PCT || '0x4637Ea6eCf7E16C99E67E941ab4d7d52eAc7c73d', // Legacy - 0.3% pool
  
  // Uniswap V3 Pools - WETH/WLFI
  UNISWAP_V3_POOL_WETH_1PCT: import.meta.env.VITE_UNISWAP_V3_POOL_WETH_1PCT || '0xCa2e972f081764c30Ae5F012A29D5277EEf33838', // WETH/WLFI 1% Fee Tier (Deposits)
  UNISWAP_V3_POOL_WETH_03PCT: import.meta.env.VITE_UNISWAP_V3_POOL_WETH_03PCT || '0xcdF9F50519Eb0a9995730DDB6e7d3A8B1D8fFA07', // WETH/WLFI 0.3% Fee Tier (TWAP)
  
  // Uniswap V4 (EAGLE/ETH Pool - Coming Soon)
  // TODO: Add after V4 deployment
  // UNISWAP_V4_POOL_MANAGER: '0x...', // Mainnet V4 PoolManager
  // EAGLE_ETH_POOL_KEY: '0x...', // Pool identifier hash
  // EAGLE_ETH_HOOK: '0x...', // Custom hook contract
  // V4_POSITION_MANAGER: '0x...', // V4 position manager for LPs
  
  // Token addresses (REAL tokens!)
  WLFI: '0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6',      // World Liberty Financial
  USD1: '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d',      // USD1 Stablecoin
  WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',      // Wrapped ETH
  
  // Governance
  MULTISIG: '0xe5a1d534eb7f00397361F645f0F39e5D16cc1De3',   // Multisig (Owner)
} as const;

// Cross-Chain Configuration - EAGLE OFT deployed on all chains at same address ✨
export const EAGLE_OFT_ADDRESS = '0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E';

export const BASE_CONTRACTS = {
  EAGLE_OFT: EAGLE_OFT_ADDRESS,
  WLFI_OFT: '0x47af3595BFBE6c86E59a13d5db91AEfbFF0eA91e',
} as const;

export const MONAD_CONTRACTS = {
  EAGLE_OFT: EAGLE_OFT_ADDRESS,
  REGISTRY: '0x47c81c9a70CA7518d3b911bC8C8b11000e92F59e',
} as const;

// Chain IDs and LayerZero EIDs - All 8 supported chains
export const CHAIN_CONFIG = {
  ethereum: {
    chainId: 1,
    eid: 30101,
    name: 'Ethereum',
    symbol: 'ETH',
    explorer: 'https://etherscan.io',
    rpc: import.meta.env.VITE_ETHEREUM_RPC || 'https://eth.llamarpc.com',
    color: '#627EEA',
    contracts: { EAGLE: EAGLE_OFT_ADDRESS, WLFI: CONTRACTS.WLFI }
  },
  base: {
    chainId: 8453,
    eid: 30184,
    name: 'Base',
    symbol: 'ETH',
    explorer: 'https://basescan.org',
    rpc: import.meta.env.VITE_BASE_RPC || 'https://mainnet.base.org',
    color: '#0052FF',
    contracts: { EAGLE: EAGLE_OFT_ADDRESS, WLFI: BASE_CONTRACTS.WLFI_OFT }
  },
  monad: {
    chainId: 143,
    eid: 30390,
    name: 'Monad',
    symbol: 'MON',
    explorer: 'https://monad.blockscout.com',
    rpc: import.meta.env.VITE_MONAD_RPC || 'https://rpc-mainnet.monadinfra.com',
    color: '#836EF9',
    contracts: { EAGLE: EAGLE_OFT_ADDRESS }
  },
  arbitrum: {
    chainId: 42161,
    eid: 30110,
    name: 'Arbitrum',
    symbol: 'ETH',
    explorer: 'https://arbiscan.io',
    rpc: import.meta.env.VITE_ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc',
    color: '#12AAFF',
    contracts: { EAGLE: EAGLE_OFT_ADDRESS }
  },
  bsc: {
    chainId: 56,
    eid: 30102,
    name: 'BNB Chain',
    symbol: 'BNB',
    explorer: 'https://bscscan.com',
    rpc: import.meta.env.VITE_BSC_RPC || 'https://bsc-dataseed.binance.org',
    color: '#F0B90B',
    contracts: { EAGLE: EAGLE_OFT_ADDRESS }
  },
  avalanche: {
    chainId: 43114,
    eid: 30106,
    name: 'Avalanche',
    symbol: 'AVAX',
    explorer: 'https://snowtrace.io',
    rpc: import.meta.env.VITE_AVALANCHE_RPC || 'https://api.avax.network/ext/bc/C/rpc',
    color: '#E84142',
    contracts: { EAGLE: EAGLE_OFT_ADDRESS }
  },
  hyperevm: {
    chainId: 999,
    eid: 30367, // HyperEVM LayerZero V2 EID (confirmed)
    name: 'HyperEVM',
    symbol: 'HYPE',
    explorer: 'https://purrsec.com/hyperliquid',
    rpc: import.meta.env.VITE_HYPEREVM_RPC || 'https://rpc.hyperliquid.xyz/evm',
    color: '#00D395',
    contracts: { EAGLE: EAGLE_OFT_ADDRESS }
  },
  sonic: {
    chainId: 146,
    eid: 30332, // Sonic LayerZero V2 EID (confirmed)
    name: 'Sonic',
    symbol: 'S',
    explorer: 'https://sonicscan.org',
    rpc: import.meta.env.VITE_SONIC_RPC || 'https://rpc.soniclabs.com',
    color: '#1E90FF',
    contracts: { EAGLE: EAGLE_OFT_ADDRESS }
  },
} as const;

export type SupportedChain = keyof typeof CHAIN_CONFIG;

// Token metadata for UI
export const TOKENS = {
  VEAGLE: {
    address: '0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953', // Same as VAULT
    symbol: 'vEAGLE',
    name: 'Eagle Vault Shares',
    decimals: 18,
  },
  EAGLE: {
    address: '0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E', // Same as OFT
    symbol: 'EAGLE',
    name: 'Eagle',
    decimals: 18,
    isPremiumVanity: true, // 0x47...ea91E ✨
  },
  WLFI: {
    address: '0xdA5e1988097297dCdc1f90D4dFE7909e847CBeF6',
    symbol: 'WLFI',
    name: 'World Liberty Financial',
    decimals: 18,
  },
  USD1: {
    address: '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d',
    symbol: 'USD1',
    name: 'USD1',
    decimals: 18,
  },
} as const;

export const CHAIN_ID = 1; // Ethereum mainnet
