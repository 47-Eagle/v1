// Strategy Configuration System
// Add new strategies here - UI will automatically adapt

export interface Strategy {
  id: string;
  name: string;
  protocol: string;
  description: string;
  contractAddress: string;
  type: 'uniswap-v3' | 'aave' | 'compound' | 'curve' | 'custom';
  active: boolean;
  allocation: number; // Percentage of vault deployed to this strategy
  color: string; // For visualization
  metrics?: {
    apr?: number;
    apy?: number;
    tvl?: number;
  };
  links?: {
    analytics?: string;
    docs?: string;
  };
  details?: {
    pool?: string;
    feeTier?: string;
    network?: string;
    riskLevel?: 'low' | 'medium' | 'high';
  };
}

// Active Strategies for Eagle Vault
export const ACTIVE_STRATEGIES: Strategy[] = [
  {
    id: 'charm-wlfi-usd1',
    name: 'Charm Finance AlphaVault',
    protocol: 'Charm Finance',
    description: 'Automated Uniswap V3 liquidity management with dynamic rebalancing for WLFI/USD1 pair.',
    contractAddress: '0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71',
    type: 'uniswap-v3',
    active: true,
    allocation: 100, // Currently 100% of deployed assets
    color: '#6366f1', // Indigo
    links: {
      analytics: 'https://alpha.charm.fi/vault/0x22828Dbf15f5FBa2394Ba7Cf8fA9A96BdB444B71',
      docs: 'https://docs.charm.fi/',
    },
    details: {
      pool: 'WLFI/USD1',
      feeTier: '1.00%',
      network: 'Ethereum',
      riskLevel: 'medium',
    }
  },
  {
    id: 'aave-usd1-lending',
    name: 'Aave V3 Lending',
    protocol: 'Aave V3',
    description: 'Supply USD1 to Aave money market for stable, low-risk yield on stablecoin positions.',
    contractAddress: '0x0000000000000000000000000000000000000000', // Not deployed yet
    type: 'aave',
    active: false, // Coming soon - change to true to activate
    allocation: 0,
    color: '#a855f7', // Purple
    links: {
      analytics: 'https://app.aave.com/',
      docs: 'https://docs.aave.com/',
    },
    details: {
      pool: 'USD1',
      feeTier: 'Variable',
      network: 'Ethereum',
      riskLevel: 'low',
    }
  },
  {
    id: 'curve-stable-pool',
    name: 'Curve USD1 Pool',
    protocol: 'Curve Finance',
    description: 'Provide liquidity to Curve stable pools for consistent, low-volatility yield.',
    contractAddress: '0x0000000000000000000000000000000000000000', // Not deployed yet
    type: 'curve',
    active: false, // Coming soon
    allocation: 0,
    color: '#10b981', // Emerald
    links: {
      analytics: 'https://curve.fi/',
      docs: 'https://docs.curve.fi/',
    },
    details: {
      pool: 'USD1/USDC/USDT',
      feeTier: '0.04%',
      network: 'Ethereum',
      riskLevel: 'low',
    }
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
  ACTIVE_STRATEGIES.reduce((sum, s) => sum + s.allocation, 0);

// Helper to get strategy by ID
export const getStrategy = (id: string) =>
  ACTIVE_STRATEGIES.find(s => s.id === id);

