// Strategy Configuration System
// Add new strategies here - UI will automatically adapt

export interface Strategy {
  id: string;
  name: string;
  protocol: string;
  description: string;
  contractAddress: string;
  charmVaultAddress?: string; // Underlying Charm vault if applicable
  type: 'uniswap-v3' | 'aave' | 'compound' | 'curve' | 'custom';
  active: boolean;
  allocation: number; // Percentage of vault deployed to this strategy
  color: string; // For visualization
  version?: string; // Strategy version
  metrics?: {
    apr?: number;
    apy?: number;
    tvl?: number;
  };
  links?: {
    analytics?: string;
    docs?: string;
    etherscan?: string;
  };
  details?: {
    pool?: string;
    feeTier?: string;
    network?: string;
    riskLevel?: 'low' | 'medium' | 'high';
  };
}

// Active Strategies for Eagle Vault (V4 - Jan 2026)
export const ACTIVE_STRATEGIES: Strategy[] = [
  {
    id: 'charm-weth-wlfi-v4',
    name: 'Charm WETH/WLFI V4',
    protocol: 'Charm Finance',
    description: 'Latest Uniswap V3 liquidity management for WETH/WLFI pair with enhanced zRouter gas optimization, auto fee tier discovery, and bidirectional swaps.',
    contractAddress: '0xbf66f01c18f31a843172a24a4ff8984de691d415',
    charmVaultAddress: '0x3314e248F3F752Cd16939773D83bEb3a362F0AEF',
    type: 'uniswap-v3',
    active: true,
    allocation: 50,
    color: '#3b82f6', // Blue
    version: 'V4',
    links: {
      analytics: 'https://alpha.charm.fi/vault/0x3314e248F3F752Cd16939773D83bEb3a362F0AEF',
      docs: 'https://docs.charm.fi/',
      etherscan: 'https://etherscan.io/address/0xbf66f01c18f31a843172a24a4ff8984de691d415',
    },
    details: {
      pool: 'WETH/WLFI',
      feeTier: '1.00%',
      network: 'Ethereum',
      riskLevel: 'medium',
    }
  },
  {
    id: 'charm-usd1-wlfi-v4',
    name: 'Charm USD1/WLFI V4',
    protocol: 'Charm Finance',
    description: 'Latest Uniswap V3 liquidity management for USD1/WLFI pair with enhanced zRouter gas optimization, auto fee tier discovery, and bidirectional swaps.',
    contractAddress: '0x3e872d07c5a73e684b13a3b097c3599bf608c6e3',
    charmVaultAddress: '0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71',
    type: 'uniswap-v3',
    active: true,
    allocation: 50,
    color: '#6366f1', // Indigo
    version: 'V4',
    links: {
      analytics: 'https://alpha.charm.fi/vault/0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71',
      docs: 'https://docs.charm.fi/',
      etherscan: 'https://etherscan.io/address/0x3e872d07c5a73e684b13a3b097c3599bf608c6e3',
    },
    details: {
      pool: 'USD1/WLFI',
      feeTier: '1.00%',
      network: 'Ethereum',
      riskLevel: 'medium',
    }
  },
];

// Legacy strategies (deprecated, kept for reference)
export const LEGACY_STRATEGIES: Strategy[] = [
  {
    id: 'charm-usd1-wlfi-v3',
    name: 'Charm USD1/WLFI V3 (Previous)',
    protocol: 'Charm Finance',
    description: 'Previous USD1/WLFI V3 strategy - migrated to V4.',
    contractAddress: '0x6c638f745B7adC2873a52De0D732163b32144f0b',
    charmVaultAddress: '0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71',
    type: 'uniswap-v3',
    active: false,
    allocation: 0,
    color: '#94a3b8', // Slate
    version: 'V3 (Previous)',
  },
  {
    id: 'charm-weth-wlfi-v3',
    name: 'Charm WETH/WLFI V3 (Previous)',
    protocol: 'Charm Finance',
    description: 'Previous WETH/WLFI V3 strategy - migrated to V4.',
    contractAddress: '0x55E78798A926Bac07b4D90f7b1bEc769b72E76A6',
    charmVaultAddress: '0x3314e248F3F752Cd16939773D83bEb3a362F0AEF',
    type: 'uniswap-v3',
    active: false,
    allocation: 0,
    color: '#94a3b8', // Slate
    version: 'V3 (Previous)',
  },
  {
    id: 'charm-usd1-wlfi-v2',
    name: 'Charm USD1/WLFI V2 (Deprecated)',
    protocol: 'Charm Finance',
    description: 'Legacy USD1/WLFI V2 strategy - migrated to V3.',
    contractAddress: '0xa7F6F4b1134c0aD4646AB18240a19f01e08Ba90E',
    charmVaultAddress: '0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71',
    type: 'uniswap-v3',
    active: false,
    allocation: 0,
    color: '#94a3b8', // Slate
    version: 'V2 (Deprecated)',
  },
  {
    id: 'charm-weth-wlfi-v2',
    name: 'Charm WETH/WLFI V2 (Deprecated)',
    protocol: 'Charm Finance',
    description: 'Legacy WETH/WLFI V2 strategy - migrated to V3.',
    contractAddress: '0xCe1884B2dC7A2980d401C9C568CD59B2Eaa07338',
    charmVaultAddress: '0x3314e248F3F752Cd16939773D83bEb3a362F0AEF',
    type: 'uniswap-v3',
    active: false,
    allocation: 0,
    color: '#94a3b8', // Slate
    version: 'V2 (Deprecated)',
  },
  {
    id: 'charm-wlfi-usd1-v1',
    name: 'Charm Finance AlphaVault V1 (Deprecated)',
    protocol: 'Charm Finance',
    description: 'Legacy WLFI/USD1 strategy - migrated to V2.',
    contractAddress: '0x47B2659747d6A7E00c8251c3C3f7e92625a8cf6f',
    charmVaultAddress: '0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71',
    type: 'uniswap-v3',
    active: false,
    allocation: 0,
    color: '#94a3b8', // Slate
    version: 'V1 (Deprecated)',
  },
  {
    id: 'charm-weth-wlfi-v1',
    name: 'Charm WETH/WLFI V1 (Deprecated)',
    protocol: 'Charm Finance',
    description: 'Legacy WETH/WLFI strategy - migrated to V2.',
    contractAddress: '0x5c525Af4153B1c43f9C06c31D32a84637c617FfE',
    charmVaultAddress: '0x3314e248F3F752Cd16939773D83bEb3a362F0AEF',
    type: 'uniswap-v3',
    active: false,
    allocation: 0,
    color: '#94a3b8', // Slate
    version: 'V1 (Deprecated)',
  }
];

// Helper function to get active strategies
export const getActiveStrategies = () => 
  ACTIVE_STRATEGIES.filter(s => s.active);

// Helper function to get all strategies (including coming soon)
export const getAllStrategies = () => ACTIVE_STRATEGIES;

// Helper function to get coming soon strategies  
export const getComingSoonStrategies = () =>
  ACTIVE_STRATEGIES.filter(s => !s.active);

// Helper function to get total allocation
export const getTotalAllocation = () =>
  ACTIVE_STRATEGIES.filter(s => s.active).reduce((sum, s) => sum + s.allocation, 0);

// Helper to get strategy by ID
export const getStrategy = (id: string) =>
  ACTIVE_STRATEGIES.find(s => s.id === id);

// Helper to get strategy by contract address
export const getStrategyByAddress = (address: string) =>
  ACTIVE_STRATEGIES.find(s => s.contractAddress.toLowerCase() === address.toLowerCase());
