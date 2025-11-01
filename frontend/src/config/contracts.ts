// PRODUCTION DEPLOYMENT - October 31, 2025 (Vanity Addresses)
// All contracts deployed with 0x47... vanity prefix ✨
export const CONTRACTS = {
  // Registry (NEW - Deployment orchestrator)
  REGISTRY: '0x47c81c9a70CA7518d3b911bC8C8b11000e92F59e',     // EagleRegistry (Vanity) ✅
  
  // Core Protocol Contracts
  VAULT: '0x47b3ef629D9cB8DFcF8A6c61058338f4e99d7953',       // EagleOVault (Vanity) ✅
  OFT: '0x474eD38C256A7FA0f3B8c48496CE1102ab0eA91E',         // EagleShareOFT (Premium Vanity) ✨✅
  WRAPPER: '0x47dAc5063c526dBc6f157093DD1D62d9DE8891c5',     // EagleVaultWrapper (Vanity) ✅
  STRATEGY: '0x47B2659747d6A7E00c8251c3C3f7e92625a8cf6f',    // CharmStrategyUSD1 (Vanity) ✅
  
  // External Contracts
  CHARM_VAULT: '0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71', // Charm USD1/WLFI Vault
  UNISWAP_V3_POOL: '0x4637Ea6eCf7E16C99E67E941ab4d7d52eAc7c73d', // Uniswap V3 1% Fee Tier USD1/WLFI Pool
  
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
