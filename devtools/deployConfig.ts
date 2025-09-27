import { EndpointId } from '@layerzerolabs/lz-definitions'

export interface DeploymentConfig {
  vault: {
    contracts: {
      vault: string
      shareAdapter: string
      composer: string
    }
    deploymentEid: EndpointId
    vaultAddress?: string
    assetOFTAddress?: string
    shareOFTAdapterAddress?: string
  }
  shareOFT: {
    contract: string
    metadata: {
      name: string
      symbol: string
    }
    deploymentEids: EndpointId[]
  }
  assetOFT: {
    contract: string
    metadata: {
      name: string
      symbol: string
    }
    deploymentEids: EndpointId[]
  }
}

// Hub network where EagleOVault lives
const _hubEid = EndpointId.ETHEREUM_V2_MAINNET

// Spoke networks where ShareOFT lives (excluding hub)
const _spokeEids = [
  EndpointId.BSC_V2_MAINNET,
  EndpointId.ARBITRUM_V2_MAINNET,
  EndpointId.BASE_V2_MAINNET,
  EndpointId.AVALANCHE_V2_MAINNET,
]

// ============================================
// DEPLOYMENT CONFIGURATION
// ============================================

export const DEPLOYMENT_CONFIG: DeploymentConfig = {
  // Vault configuration (Hub chain only - Ethereum)
  vault: {
    contracts: {
      vault: 'EagleOVault',           // Our clean ERC4626 vault
      shareAdapter: 'EagleShareOFTAdapter', // Hub chain share adapter
      composer: 'EagleOVaultComposer',      // LayerZero composer
    },
    deploymentEid: _hubEid,
    vaultAddress: undefined,          // Deploy fresh EagleOVault
    assetOFTAddress: undefined,       // Deploy fresh WLFI Asset OFT
    shareOFTAdapterAddress: undefined, // Deploy fresh share adapter
  },

  // Share OFT configuration (Spoke chains only)
  shareOFT: {
    contract: 'EagleShareOFT',
    metadata: {
      name: 'Eagle Vault Shares',
      symbol: 'EAGLE',
    },
    deploymentEids: _spokeEids,
  },

  // Asset OFT configuration (All chains - hub + spokes)
  assetOFT: {
    contract: 'WLFIAssetOFT', // We'll deploy both WLFI and USD1
    metadata: {
      name: 'WLFI Asset',
      symbol: 'WLFI',
    },
    deploymentEids: [_hubEid, ..._spokeEids],
  },
} as const

// Additional configuration for USD1 Asset OFT
export const USD1_ASSET_CONFIG = {
  contract: 'USD1AssetOFT',
  metadata: {
    name: 'USD1 Asset',
    symbol: 'USD1',
  },
  deploymentEids: [_hubEid, ..._spokeEids],
} as const

// ============================================
// VANITY ADDRESS CONFIGURATION
// ============================================

export const VANITY_CONFIG = {
  // Target vanity pattern: 0x47...EA91E
  targetPrefix: '47',
  targetSuffix: 'EA91E',
  
  // CREATE2 factory for deterministic addresses
  create2Factory: '0x695d6B3628B4701E7eAfC0bc511CbAF23f6003eE',
  
  // Expected vanity addresses (will be generated)
  expectedAddresses: {
    vault: undefined,      // To be calculated
    shareAdapter: undefined,
    composer: undefined,
  },
}

// ============================================
// NETWORK CONFIGURATION
// ============================================

export const NETWORK_CONFIG = {
  hub: {
    name: 'Ethereum',
    eid: _hubEid,
    isHub: true,
  },
  spokes: _spokeEids.map(eid => ({
    eid,
    name: getNetworkName(eid),
    isHub: false,
  })),
}

function getNetworkName(eid: EndpointId): string {
  switch (eid) {
    case EndpointId.BSC_V2_MAINNET: return 'BSC'
    case EndpointId.ARBITRUM_V2_MAINNET: return 'Arbitrum'
    case EndpointId.BASE_V2_MAINNET: return 'Base'
    case EndpointId.AVALANCHE_V2_MAINNET: return 'Avalanche'
    default: return 'Unknown'
  }
}
